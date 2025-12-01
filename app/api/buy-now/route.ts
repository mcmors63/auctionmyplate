// app/api/buy-now/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// ENV: Appwrite
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Transactions DB – fall back safely to plates DB
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  PLATES_DB_ID;

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

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

const DVLA_FEE_GBP = 80;

// -----------------------------
// Helpers
// -----------------------------
function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(projectId);
  client.setKey(apiKey);
  return client;
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[buy-now] SMTP not fully configured. Emails will be skipped."
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
    console.warn(`[buy-now] ${label}: no valid recipients, skipping email.`);
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log(`[buy-now] Sending ${label} email to:`, finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
}

// -----------------------------
// POST /api/buy-now
// Body from frontend:
// {
//   listingId: string;
//   userEmail: string;
//   userId?: string;
//   paymentIntentId?: string;
//   totalCharged: number; // buy now + £80 DVLA
// }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const listingId = body.listingId as string | undefined;
    const buyerEmail = body.userEmail as string | undefined;
    const buyerId = body.userId as string | undefined;
    const paymentIntentId = body.paymentIntentId as string | undefined;
    const totalCharged = Number(body.totalCharged);

    console.log("[buy-now] Incoming", {
      listingId,
      buyerEmail,
      buyerId,
      paymentIntentId,
      totalCharged,
    });

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 }
      );
    }

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "userEmail (buyerEmail) is required." },
        { status: 400 }
      );
    }

    if (!totalCharged || !Number.isFinite(totalCharged) || totalCharged <= 0) {
      return NextResponse.json(
        { error: "totalCharged must be a positive number." },
        { status: 400 }
      );
    }

    const appwriteClient = getAppwriteClient();
    const databases = new Databases(appwriteClient);

    // 1) Load the listing
    const listing = await databases.getDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId
    );

    const reg = ((listing as any).registration as string) || "Unknown";
    const sellerEmail = (listing as any).seller_email as string | undefined;
    const currentStatus = (listing as any).status as string | undefined;

    console.log("[buy-now] Loaded listing", {
      listingId: listing.$id,
      reg,
      sellerEmail,
      currentStatus,
    });

    if (currentStatus && currentStatus.toLowerCase() === "sold") {
      return NextResponse.json(
        { error: "This listing is already sold." },
        { status: 400 }
      );
    }

    if (!sellerEmail) {
      console.warn(
        "[buy-now] Listing has no seller_email, seller emails will be skipped."
      );
    }

    // 2) Work out sale price (hammer price) and settlement details
    const buyNowValue =
      Number((listing as any).buy_now) ||
      Number((listing as any).buy_now_price) ||
      0;

    // salePrice = hammer price (without DVLA fee)
    const salePrice =
      buyNowValue > 0
        ? buyNowValue
        : Math.max(0, totalCharged - DVLA_FEE_GBP);

    const {
      commissionRate,
      commissionAmount,
      sellerPayout,
      dvlaFee,
    } = calculateSettlement(salePrice);

    const nowIso = new Date().toISOString();

    // 3) Create transaction document
    const txDoc = await databases.createDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      ID.unique(),
      {
        listing_id: listing.$id,
        registration: reg,
        seller_email: sellerEmail || null,
        buyer_email: buyerEmail,
        buyer_id: buyerId || null,
        sale_price: salePrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        dvla_fee: dvlaFee,
        total_charged: totalCharged,
        stripe_payment_intent_id: paymentIntentId || null,
        payment_status: "paid",
        transaction_status: "awaiting_documents",
        documents: [],
        created_at: nowIso,
        updated_at: nowIso,
        source: "buy_now",
      }
    );

    console.log("[buy-now] Created transaction", { txId: txDoc.$id });

    // 4) Update the plate as sold
    const updatedListing = await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listing.$id,
      {
        status: "sold",
        buyer_email: buyerEmail,
        buyer_id: buyerId || null,
        sold_price: salePrice,
        sale_status: "buy_now_sold",
        payout_status: "pending",
      }
    );

    // 5) Send emails (buyer, seller, admin) – best effort, non-fatal
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("[buy-now] SMTP not configured – skipping all emails.");
    } else {
      const transporter = getTransporter();

      const prettyPrice = salePrice.toLocaleString("en-GB", {
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
        console.error("[buy-now] Buyer email failed:", buyerErr);
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
            "[buy-now] No seller_email on listing, seller email skipped."
          );
        }
      } catch (sellerErr) {
        console.error("[buy-now] Seller email failed:", sellerErr);
      }

      // Admin email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyPlate" <${smtpUser}>`,
            to: adminEmail,
            subject: `New Buy Now sale: ${reg}`,
            text: [
              `A plate has been sold using Buy Now on AuctionMyPlate.`,
              ``,
              `Registration: ${reg}`,
              `Sale price (hammer): ${prettyPrice}`,
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
        console.error("[buy-now] Admin email failed:", adminErr);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        updatedListing,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[buy-now] fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process Buy Now purchase." },
      { status: 500 }
    );
  }
}
