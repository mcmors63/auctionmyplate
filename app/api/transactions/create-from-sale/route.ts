// app/api/transactions/create-from-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// ENV: Appwrite
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

// -----------------------------
// ENV: SMTP / Site
// -----------------------------
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.vercel.app";
const adminEmail =
  process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

// -----------------------------
// Helpers
// -----------------------------
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

/**
 * Safe wrapper so we never call sendMail with an empty "to"
 */
async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions,
  label: string
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
      `[create-from-sale] ${label}: no valid recipients, skipping email.`
    );
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log(`[create-from-sale] Sending ${label} email to:`, finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
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

    console.log("[create-from-sale] Incoming", {
      listingId,
      buyerEmail,
      finalPrice,
    });

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
    const sellerEmail = (listing as any).seller_email as string | undefined;

    console.log("[create-from-sale] Loaded listing", {
      listingId: listing.$id,
      reg,
      sellerEmail,
    });

    if (!sellerEmail) {
      console.warn(
        "[create-from-sale] Listing has no seller_email, emails to seller will be skipped."
      );
    }

    // 2) Work out commission etc
    const {
      commissionRate,
      commissionAmount,
      sellerPayout,
      dvlaFee,
    } = calculateSettlement(finalPrice);

    const nowIso = new Date().toISOString();

    // 3) Create transaction row in Transactions collection
    const txDoc = await databases.createDocument(
      txDbId,
      txCollectionId,
      ID.unique(),
      {
        listing_id: listing.$id,
        registration: reg,
        seller_email: sellerEmail || null,
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
      }
    );

    console.log("[create-from-sale] Created transaction", {
      txId: txDoc.$id,
    });

    // 4) Mark plate as sold (if not already done)
    await databases.updateDocument(platesDbId, platesCollectionId, listing.$id, {
      status: "sold",
      sold_price: finalPrice,
    });

    // 5) Emails (buyer, seller, admin) – best effort, non-fatal
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn(
        "[create-from-sale] SMTP not configured – skipping all emails."
      );
    } else {
      const transporter = getTransporter();

      const prettyPrice = finalPrice.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyCommission = commissionAmount.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyPayout = sellerPayout.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyDvla = dvlaFee.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const dashboardUrl = `${siteUrl}/dashboard?tab=transactions`;

      // Buyer email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyPlate" <${smtpUser}>`,
            to: buyerEmail,
            subject: `You bought ${reg} on AuctionMyPlate`,
            text: [
              `Thank you for your purchase!`,
              ``,
              `You have successfully purchased ${reg} for ${prettyPrice}.`,
              ``,
              `DVLA assignment fee: ${prettyDvla} (included in your payment where applicable).`,
              ``,
              `We will now process the DVLA transfer. If we need any further information we will contact you by email.`,
              ``,
              `You can view this transaction in your dashboard:`,
              dashboardUrl,
              ``,
              `Thank you for using AuctionMyPlate.`,
            ].join("\n"),
            html: `
              <p>Thank you for your purchase!</p>
              <p>You have successfully purchased <strong>${reg}</strong> for <strong>${prettyPrice}</strong>.</p>
              <p>
                DVLA assignment fee: <strong>${prettyDvla}</strong> (included in your payment where applicable).
              </p>
              <p>
                We will now process the DVLA transfer.<br/>
                If we need any further information we will contact you by email.
              </p>
              <p>
                You can view this transaction in your dashboard:<br/>
                <a href="${dashboardUrl}">${dashboardUrl}</a>
              </p>
              <p>Thank you for using AuctionMyPlate.</p>
            `,
          },
          "buyer"
        );
      } catch (buyerErr) {
        console.error("[create-from-sale] Buyer email failed:", buyerErr);
      }

      // Seller email
      try {
        if (sellerEmail) {
          await safeSendMail(
            transporter,
            {
              from: `"AuctionMyPlate" <${smtpUser}>`,
              to: sellerEmail,
              subject: `Your plate ${reg} has sold on AuctionMyPlate`,
              text: [
                `Congratulations!`,
                ``,
                `Your registration ${reg} has sold on AuctionMyPlate for ${prettyPrice}.`,
                ``,
                `Our commission (${commissionRate}%): ${prettyCommission}`,
                `DVLA assignment fee (paid by buyer): ${prettyDvla}`,
                `Amount due to you: ${prettyPayout}`,
                ``,
                `We will collect payment from the buyer and process the DVLA transfer.`,
                `Payment to you is usually made once the transfer is complete and all documents are received.`,
                ``,
                `You can upload your documents and track this sale here:`,
                dashboardUrl,
                ``,
                `Thank you for using AuctionMyPlate.`,
              ].join("\n"),
              html: `
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
                  <a href="${dashboardUrl}">${dashboardUrl}</a>
                </p>
                <p>Thank you for using AuctionMyPlate.</p>
              `,
            },
            "seller"
          );
        } else {
          console.warn(
            "[create-from-sale] No seller_email on listing, seller email skipped."
          );
        }
      } catch (sellerErr) {
        console.error("[create-from-sale] Seller email failed:", sellerErr);
      }

      // Admin email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyPlate" <${smtpUser}>`,
            to: adminEmail,
            subject: `New completed sale: ${reg}`,
            text: [
              `A plate has been sold on AuctionMyPlate.`,
              ``,
              `Registration: ${reg}`,
              `Sale price: ${prettyPrice}`,
              `Commission (${commissionRate}%): ${prettyCommission}`,
              `DVLA fee: ${prettyDvla}`,
              `Seller payout: ${prettyPayout}`,
              ``,
              `Seller: ${sellerEmail || "N/A"}`,
              `Buyer: ${buyerEmail}`,
              ``,
              `Transaction ID: ${txDoc.$id}`,
              ``,
              `You can view this transaction in the admin dashboard.`,
            ].join("\n"),
          },
          "admin"
        );
      } catch (adminErr) {
        console.error("[create-from-sale] Admin email failed:", adminErr);
      }
    }

    return NextResponse.json(
      { success: true, transactionId: txDoc.$id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[create-from-sale] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}
