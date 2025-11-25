import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

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

function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(project);
  client.setKey(apiKey);
  return client;
}

function getTransporter() {
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
    const sellerEmail = (listing as any).seller_email as string | undefined;

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Listing has no seller_email set." },
        { status: 400 }
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

    // 3) Create transaction row in your existing Transactions collection
    const txDoc = await databases.createDocument(
      txDbId,
      txCollectionId,
      ID.unique(),
      {
        listing_id: listing.$id,
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
      }
    );

    // 4) Mark plate as sold
    await databases.updateDocument(platesDbId, platesCollectionId, listing.$id, {
      status: "sold",
    });

    // 5) Email seller – don't kill the request if this fails
    try {
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

      const dashboardUrl = `${siteUrl}/dashboard?tab=sales`;

      const subject = `Your plate ${reg} has sold on AuctionMyPlate`;

      const text = [
        `Congratulations!`,
        ``,
        `Your registration ${reg} has sold on AuctionMyPlate for ${prettyPrice}.`,
        ``,
        `Our commission (${commissionRate}%): ${prettyCommission}`,
        `DVLA assignment fee (paid by buyer): ${prettyDvla}`,
        `Amount due to you: ${prettyPayout}`,
        ``,
        `We will collect payment from the buyer and process the DVLA transfer.`,
        `Payment to you is usually made within 10 days once the transfer is completed and all documents are received.`,
        ``,
        `You can upload your documents and track this sale here:`,
        dashboardUrl,
        ``,
        `Thank you for using AuctionMyPlate.`,
      ].join("\n");

      const html = `
        <p>Congratulations!</p>
        <p>Your registration <strong>${reg}</strong> has sold on AuctionMyPlate for <strong>${prettyPrice}</strong>.</p>
        <p>
          Our commission (${commissionRate}%): <strong>${prettyCommission}</strong><br/>
          DVLA assignment fee (paid by buyer): <strong>${prettyDvla}</strong><br/>
          Amount due to you: <strong>${prettyPayout}</strong>
        </p>
        <p>
          We will collect payment from the buyer and process the DVLA transfer.<br/>
          Payment to you is usually made within <strong>10 days</strong> once the transfer is completed and all documents are received.
        </p>
        <p>
          You can upload your documents and track this sale in your dashboard:<br/>
          <a href="${dashboardUrl}">${dashboardUrl}</a>
        </p>
        <p>Thank you for using AuctionMyPlate.</p>
      `;

      await transporter.sendMail({
        from: `"AuctionMyPlate" <${smtpUser}>`,
        to: sellerEmail,
        subject,
        text,
        html,
      });
    } catch (emailErr) {
      console.error("Failed to send seller email:", emailErr);
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
