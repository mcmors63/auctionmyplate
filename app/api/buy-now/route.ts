// app/api/buy-now/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// ENV / APPWRITE
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

const DVLA_FEE_GBP = 80;

// -----------------------------
// ENV / SMTP
// -----------------------------
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

function getAppwriteDatabases() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return new Databases(client);
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[buy-now] SMTP not fully configured, emails will be skipped.");
    return null;
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

// -----------------------------
// POST /api/buy-now
// Body: { listingId, userEmail, userId?, paymentIntentId?, totalCharged }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const listingId = body.listingId as string | undefined;
    const buyerEmail = body.userEmail as string | undefined;
    const buyerId = body.userId as string | undefined;
    const paymentIntentId = body.paymentIntentId as string | undefined;
    const totalChargedRaw = body.totalCharged;

    if (!listingId || !buyerEmail) {
      return NextResponse.json(
        { error: "listingId and userEmail are required." },
        { status: 400 }
      );
    }

    const totalCharged = Number(totalChargedRaw);
    if (!Number.isFinite(totalCharged) || totalCharged <= 0) {
      return NextResponse.json(
        { error: "totalCharged must be a positive number." },
        { status: 400 }
      );
    }

    if (!DB_ID || !PLATES_COLLECTION_ID || !TX_COLLECTION_ID) {
      console.error("[buy-now] DB or collection envs missing", {
        DB_ID,
        PLATES_COLLECTION_ID,
        TX_COLLECTION_ID,
      });
      return NextResponse.json(
        { error: "Server configuration missing for database/collections." },
        { status: 500 }
      );
    }

    const databases = getAppwriteDatabases();

    // 1) Load listing
    const listing = await databases.getDocument(
      DB_ID,
      PLATES_COLLECTION_ID,
      listingId
    );

    const reg = ((listing as any).registration as string) || "Unknown";
    const sellerEmail = (listing as any).seller_email as string | undefined;
    const commissionRateFromListing =
      (listing as any).commission_rate as number | undefined;

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Listing has no seller_email set." },
        { status: 400 }
      );
    }

    // 2) Work out sale price (plate price only, excluding DVLA)
    // totalCharged = platePrice + DVLA_FEE_GBP
    const salePrice = Math.max(0, totalCharged - DVLA_FEE_GBP);

    const settlement = calculateSettlement(salePrice);
    const commissionRate =
      typeof commissionRateFromListing === "number" &&
      commissionRateFromListing > 0
        ? commissionRateFromListing
        : settlement.commissionRate;

    const commissionAmount = settlement.commissionAmount;
    const sellerPayout = settlement.sellerPayout;
    const dvlaFee = settlement.dvlaFee;

    const nowIso = new Date().toISOString();

    // 3) Create transaction doc
    const txDoc = await databases.createDocument(
      DB_ID,
      TX_COLLECTION_ID,
      ID.unique(),
      {
        listing_id: listing.$id,
        registration: reg,
        seller_email: sellerEmail,
        buyer_email: buyerEmail,
        sale_price: salePrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        dvla_fee: dvlaFee,
        payment_status: "paid",
        transaction_status: "awaiting_documents",
        stripe_payment_intent_id: paymentIntentId || null,
        created_at: nowIso,
        updated_at: nowIso,
        // flags fields are safe if they exist in your Transactions collection;
        // if not, Appwrite will just ignore missing attributes as long as they are defined.
        seller_docs_requested: true,
        seller_docs_received: false,
        seller_payment_transferred: false,
        seller_process_complete: false,
        buyer_info_requested: true,
        buyer_info_received: false,
        buyer_tax_mot_validated: false,
        buyer_payment_taken: true,
        buyer_transfer_complete: false,
      }
    );

    // 4) Mark plate as sold (NO buyer_id!)
    await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, listing.$id, {
      status: "sold",
      sold_price: salePrice,
      buyer_email: buyerEmail,
      sale_status: "sold_buy_now",
      payout_status: "pending",
    });

    // 5) Emails (best-effort, do NOT throw if they fail)
    const transporter = getTransporter();
    if (transporter) {
      const prettySale = salePrice.toLocaleString("en-GB", {
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

      const sellerDashboardUrl = `${siteUrl}/dashboard?tab=transactions`;
      const buyerDashboardUrl = `${siteUrl}/dashboard?tab=purchases`;
      const adminTxUrl = `${siteUrl}/admin?tab=transactions`;

      // Admin email
      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: ADMIN_EMAIL,
          subject: `Buy Now – ${reg} purchased`,
          text: `Buy Now purchase

Plate: ${reg}
Sale price: ${prettySale}
Buyer: ${buyerEmail}
Seller: ${sellerEmail}

Commission: ${prettyCommission}
DVLA fee (charged to buyer): ${prettyDvla}
Seller payout (expected): ${prettyPayout}

Transaction ID: ${txDoc.$id}

Admin dashboard: ${adminTxUrl}
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send admin email:", err);
      }

      // Buyer email
      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: buyerEmail,
          subject: `You’ve bought ${reg} via Buy Now`,
          text: `Thank you for your purchase.

You’ve successfully bought registration ${reg} on AuctionMyPlate for ${prettySale}.
A DVLA paperwork fee of ${prettyDvla} has also been charged.

We’ll now contact you to collect the details needed to complete the DVLA transfer.

You can track this purchase in your dashboard:
${buyerDashboardUrl}

Thank you for using AuctionMyPlate.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send buyer email:", err);
      }

      // Seller email
      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: sellerEmail,
          subject: `Your plate ${reg} has sold via Buy Now`,
          text: `Good news!

Your registration ${reg} has been sold via Buy Now on AuctionMyPlate for ${prettySale}.

Our commission (${commissionRate}%): ${prettyCommission}
DVLA assignment fee (paid by buyer): ${prettyDvla}
Amount due to you (subject to successful transfer): ${prettyPayout}

We’ll process the DVLA transfer and release funds to you once the transfer is complete and all documents are received.

You can upload your documents and track this sale in your dashboard:
${sellerDashboardUrl}

Thank you for using AuctionMyPlate.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send seller email:", err);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        transactionId: txDoc.$id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[buy-now] fatal error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error in Buy Now. Please contact support.",
      },
      { status: 500 }
    );
  }
}
