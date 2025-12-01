// app/api/transactions/create-from-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// ENV / CONFIG
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Plates
const platesDbId = process.env.APPWRITE_PLATES_DATABASE_ID!;
const platesCollectionId =
  process.env.APPWRITE_PLATES_COLLECTION_ID || "plates";

// Transactions
const txDbId = process.env.APPWRITE_TRANSACTIONS_DATABASE_ID!;
const txCollectionId =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// SMTP
const smtpHost = process.env.SMTP_HOST!;
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Fallback admin email
const adminEmail =
  process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(project);
  client.setKey(apiKey);
  return client;
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[create-from-sale] SMTP not fully configured. Emails will be skipped."
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

// Never call sendMail with no recipients
async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions
) {
  const rawTo = opts.to;
  let recipients: string[] = [];

  if (typeof rawTo === "string") {
    recipients = rawTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawTo)) {
    recipients = rawTo.map(String).map((s) => s.trim()).filter(Boolean);
  }

  if (!recipients.length) {
    console.warn(
      "[create-from-sale] safeSendMail: no valid recipients, skipping email."
    );
    return;
  }

  const finalTo = recipients.join(", ");
  console.log("[create-from-sale] Sending email to:", finalTo);
  await transporter.sendMail({ ...opts, to: finalTo });
}

/**
 * Body:
 * {
 *   listingId: string;   // plates doc $id
 *   buyerEmail: string;
 *   finalPrice: number;  // e.g. 12500 for £12,500
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const listingId = body.listingId as string | undefined;
    const buyerEmail = body.buyerEmail as string | undefined;
    const finalPrice = Number(body.finalPrice);

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "buyerEmail is required" },
        { status: 400 }
      );
    }

    if (!finalPrice || !Number.isFinite(finalPrice) || finalPrice <= 0) {
      return NextResponse.json(
        { error: "finalPrice must be a positive number" },
        { status: 400 }
      );
    }

    const client = getAppwriteClient();
    const databases = new Databases(client);

    // 1) Load the listing from plates
    const listing = await databases.getDocument(
      platesDbId,
      platesCollectionId,
      listingId
    );

    const reg = ((listing as any).registration as string) || "Unknown";
    const sellerEmail = (listing as any).seller_email as
      | string
      | undefined;

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Listing has no seller_email set." },
        { status: 400 }
      );
    }

    // 2) Work out commission etc
    const { commissionRate, commissionAmount, sellerPayout, dvlaFee } =
      calculateSettlement(finalPrice);

    const nowIso = new Date().toISOString();

    // 3) Create transaction row
    const txDoc = await databases.createDocument(
      txDbId,
      txCollectionId,
      ID.unique(),
      {
        listing_id: listing.$id,
        registration: reg,
        seller_email: sellerEmail,
        buyer_email: buyerEmail,
        sale_price: finalPrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        dvla_fee: dvlaFee,
        payment_status: "pending",
        transaction_status: "awaiting_payment",
        documents: [],
        created_at: nowIso,
        updated_at: nowIso,
        source: "manual_sale_or_buy_now",
      }
    );

    // 4) Mark plate as sold
    await databases.updateDocument(platesDbId, platesCollectionId, listing.$id, {
      status: "sold",
    });

    // 5) EMAILS (best-effort)
    try {
      const transporter = getTransporter();

      const prettyPrice = finalPrice.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyCommission = commissionAmount.toLocaleString(
        "en-GB",
        {
          style: "currency",
          currency: "GBP",
        }
      );
      const prettyPayout = sellerPayout.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyDvla = dvlaFee.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const sellerDashboardUrl = `${siteUrl}/dashboard?tab=transactions`;
      const buyerDashboardUrl = `${siteUrl}/dashboard?tab=transactions`;
      const adminTxUrl = `${siteUrl}/admin/transaction/${txDoc.$id}`;

      // --- Seller email ---
      const sellerSubject = `Your plate ${reg} has sold on AuctionMyPlate`;

      const sellerText = [
        `Congratulations!`,
        ``,
        `Your registration ${reg} has sold on AuctionMyPlate for ${prettyPrice}.`,
        ``,
        `Our commission (${commissionRate}%): ${prettyCommission}`,
        `DVLA assignment fee (paid by buyer): ${prettyDvla}`,
        `Amount due to you: ${prettyPayout}`,
        ``,
        `We will collect payment from the buyer and process the DVLA transfer.`,
        `Payment to you will be made via bank transfer after the transfer is complete and all documents are received.`,
        ``,
        `You can upload your documents and track this sale here:`,
        sellerDashboardUrl,
        ``,
        `Thank you for using AuctionMyPlate.`,
      ].join("\n");

      const sellerHtml = `
        <p>Congratulations!</p>
        <p>Your registration <strong>${reg}</strong> has sold on AuctionMyPlate for <strong>${prettyPrice}</strong>.</p>
        <p>
          Our commission (${commissionRate}%): <strong>${prettyCommission}</strong><br/>
          DVLA assignment fee (paid by buyer): <strong>${prettyDvla}</strong><br/>
          Amount due to you: <strong>${prettyPayout}</strong>
        </p>
        <p>
          We will collect payment from the buyer and process the DVLA transfer.<br/>
          Payment to you is usually made <strong>once the transfer is complete</strong> and all documents are received.
        </p>
        <p>
          You can upload your documents and track this sale in your dashboard:<br/>
          <a href="${sellerDashboardUrl}">${sellerDashboardUrl}</a>
        </p>
        <p>Thank you for using AuctionMyPlate.</p>
      `;

      await safeSendMail(transporter, {
        from: `"AuctionMyPlate" <${smtpUser}>`,
        to: sellerEmail,
        subject: sellerSubject,
        text: sellerText,
        html: sellerHtml,
      });

      // --- Buyer email ---
      const buyerSubject = `You bought ${reg} on AuctionMyPlate`;

      const buyerText = [
        `Thank you for your purchase!`,
        ``,
        `You have bought registration ${reg} on AuctionMyPlate for ${prettyPrice}.`,
        ``,
        `A DVLA assignment fee of ${prettyDvla} is included in your total.`,
        ``,
        `Our admin team will now contact you if we need any additional information and will process the DVLA transfer for you.`,
        ``,
        `You can see your purchase and upload any required documents here:`,
        buyerDashboardUrl,
        ``,
        `Thank you for using AuctionMyPlate.`,
      ].join("\n");

      const buyerHtml = `
        <p>Thank you for your purchase!</p>
        <p>You have bought registration <strong>${reg}</strong> on AuctionMyPlate for <strong>${prettyPrice}</strong>.</p>
        <p>
          A DVLA assignment fee of <strong>${prettyDvla}</strong> is included in your total.<br/>
        </p>
        <p>
          Our admin team will now contact you if we need any additional information and will process the DVLA transfer for you.
        </p>
        <p>
          You can see your purchase and upload any required documents in your dashboard:<br/>
          <a href="${buyerDashboardUrl}">${buyerDashboardUrl}</a>
        </p>
        <p>Thank you for using AuctionMyPlate.</p>
      `;

      await safeSendMail(transporter, {
        from: `"AuctionMyPlate" <${smtpUser}>`,
        to: buyerEmail,
        subject: buyerSubject,
        text: buyerText,
        html: buyerHtml,
      });

      // --- Admin email ---
      const adminSubject = `SALE COMPLETED: ${reg} for ${prettyPrice}`;

      const adminText = [
        `A plate has sold on AuctionMyPlate.`,
        ``,
        `Registration: ${reg}`,
        `Sale price: ${prettyPrice}`,
        `Commission (${commissionRate}%): ${prettyCommission}`,
        `DVLA fee: ${prettyDvla}`,
        `Seller payout: ${prettyPayout}`,
        ``,
        `Seller: ${sellerEmail}`,
        `Buyer: ${buyerEmail}`,
        ``,
        `Transaction ID: ${txDoc.$id}`,
        `Admin link: ${adminTxUrl}`,
      ].join("\n");

      const adminHtml = `
        <p><strong>SALE COMPLETED</strong></p>
        <p>
          Registration: <strong>${reg}</strong><br/>
          Sale price: <strong>${prettyPrice}</strong><br/>
          Commission (${commissionRate}%): <strong>${prettyCommission}</strong><br/>
          DVLA fee: <strong>${prettyDvla}</strong><br/>
          Seller payout: <strong>${prettyPayout}</strong>
        </p>
        <p>
          Seller: <strong>${sellerEmail}</strong><br/>
          Buyer: <strong>${buyerEmail}</strong>
        </p>
        <p>
          Transaction ID: <strong>${txDoc.$id}</strong><br/>
          Admin link: <a href="${adminTxUrl}">${adminTxUrl}</a>
        </p>
      `;

      await safeSendMail(transporter, {
        from: `"AuctionMyPlate" <${smtpUser}>`,
        to: adminEmail,
        subject: adminSubject,
        text: adminText,
        html: adminHtml,
      });
    } catch (emailErr) {
      console.error("[create-from-sale] Email sending failed:", emailErr);
      // do not throw – transaction is already saved
    }

    return NextResponse.json(
      { success: true, transactionId: txDoc.$id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("create-from-sale error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}
