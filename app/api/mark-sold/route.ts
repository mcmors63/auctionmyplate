// app/api/admin/mark-sold/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// ENV + APPWRITE
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Same DB/collections you used in AdminPage
const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

const TRANSACTIONS_COLLECTION_ID = "transactions"; // as per AdminPage

// -----------------------------
// EMAIL SETUP
// -----------------------------
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL =
  process.env.FROM_EMAIL || "no-reply@auctionmyplate.co.uk";
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || "admin@auctionmyplate.co.uk";
 const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP not configured – skipping email sending.");
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// -----------------------------
// COMMISSION LOGIC (adjust if needed)
// -----------------------------
const DVLA_FEE = 80;

function calcCommission(salePrice: number): number {
  // Flat 15% for now – easy to tweak later
  return Math.round(salePrice * 0.15);
}

// -----------------------------
// EMAIL TEMPLATES
// -----------------------------
type EmailContext = {
  registration: string;
  salePrice: number;
  sellerPayout: number;
  sellerEmail?: string | null;
  buyerEmail?: string | null;
};

async function sendTransactionEmails(ctx: EmailContext) {
  const transporter = createTransport();
  if (!transporter) return; // no SMTP → silently skip

  const { registration, salePrice, sellerPayout, sellerEmail, buyerEmail } =
    ctx;

  const saleStr = `£${salePrice.toLocaleString("en-GB")}`;
  const payoutStr = `£${sellerPayout.toLocaleString("en-GB")}`;

  const tasks: Promise<any>[] = [];

  // Seller email
  if (sellerEmail) {
    const subject = `Your plate ${registration} has SOLD`;
    const text = [
      `Congratulations! Your number plate ${registration} has sold for ${saleStr}.`,
      ``,
      `We will return you ${payoutStr} once the transfer is complete via bank transfer`,
      `(subject to receiving the correct paperwork from you and the buyer).`,
      ``,
      `You will receive an email requesting the further details we need to`,
      `process the transfer.`,
      ``,
      `Thank you for your business,`,
      `AuctionMyPlate.co.uk`,
    ].join("\n");

    tasks.push(
      transporter.sendMail({
        from: FROM_EMAIL,
        to: sellerEmail,
        subject,
        text,
      })
    );
  }

      // 2nd seller email – request documents
    const sellerDocsSubject = `Action required: documents for ${registration}`;
    const sellerDocsText = [
      `To complete the sale of ${registration}, we now need your DVLA documents (V5C/logbook or retention certificate as applicable).`,
      ``,
      `Please log in to your AuctionMyPlate dashboard and upload the required documents in the Transactions section:`,
      `${SITE_URL}/dashboard`,
      ``,
      `Once we have received and checked your paperwork, we will proceed with the transfer, once complete we will process your payment of ${payoutStr}.`,
      ``,
      `If you have any questions, please email admin@auctionmyplate.co.uk.`,
      ``,
      `Thank you,`,
      `AuctionMyPlate.co.uk`,
    ].join("\n");

    tasks.push(
      transporter.sendMail({
        from: FROM_EMAIL,
        to: sellerEmail,
        subject: sellerDocsSubject,
        text: sellerDocsText,
      })
    );

  // Buyer email
  if (buyerEmail) {
    const subject = `You’ve successfully purchased ${registration}`;
    const text = [
      `Congratulations! You have successfully purchased ${registration} for ${saleStr}.`,
      ``,
      `This amount will be taken from your registered payment option once you`,
      `have provided the requested information which will be sent in a`,
      `separate email.`,
      ``,
      `Please remember that the registration must go onto a vehicle which is`,
      `taxed and holds a valid MOT (if required). This is required by DVLA`,
      `for the transfer process.`,
      ``,
      `Thank you,`,
      `AuctionMyPlate.co.uk`,
    ].join("\n");

    tasks.push(
      transporter.sendMail({
        from: FROM_EMAIL,
        to: buyerEmail,
        subject,
        text,
      })
    );
  }

      // 2nd seller email – request documents
    const sellerDocsSubject = `Action required: documents for ${registration}`;
    const sellerDocsText = [
      `To complete the sale of ${registration}, we now need your DVLA documents (V5C/logbook or retention certificate as applicable).`,
      ``,
      `Please log in to your AuctionMyPlate dashboard and upload the required documents in the Transactions section:`,
      `${SITE_URL}/dashboard`,
      ``,
      `Once we have received and checked your paperwork, we will proceed with the transfer, once complete we will process your payment of ${payoutStr}.`,
      ``,
      `If you have any questions, please email admin@auctionmyplate.co.uk.`,
      ``,
      `Thank you,`,
      `AuctionMyPlate.co.uk`,
    ].join("\n");

    tasks.push(
      transporter.sendMail({
        from: FROM_EMAIL,
        to: sellerEmail,
        subject: sellerDocsSubject,
        text: sellerDocsText,
      })
    );

  // Admin email
  if (ADMIN_EMAIL) {
    const subject = `Plate sold: ${registration} for ${saleStr}`;
    const text = [
      `Registration ${registration} has been sold for ${saleStr}.`,
      ``,
      `Seller payout: ${payoutStr}.`,
      sellerEmail ? `Seller: ${sellerEmail}` : "",
      buyerEmail ? `Buyer: ${buyerEmail}` : "",
      ``,
      `Please commence the transfer process:`,
      ` - Request seller documents`,
      ` - Request buyer information`,
      ` - Confirm tax & MOT`,
      ` - Take payment`,
      ` - Complete DVLA transfer`,
      ``,
      `This is an automated notification from AuctionMyPlate.co.uk.`,
    ]
      .filter(Boolean)
      .join("\n");

    tasks.push(
      transporter.sendMail({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject,
        text,
      })
    );
  }

  await Promise.allSettled(tasks);
}

// -----------------------------
// HANDLER
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plateId = body.plateId as string | undefined;
    const finalPrice = Number(body.finalPrice);
    const buyerEmail = (body.buyerEmail as string | undefined)?.trim() || null;

    if (!plateId || !finalPrice || Number.isNaN(finalPrice) || finalPrice <= 0) {
      return NextResponse.json(
        { error: "plateId and valid finalPrice are required." },
        { status: 400 }
      );
    }

    // Appwrite client (server-side)
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // 1) Load listing
    const plate: any = await databases.getDocument(
      DB_ID,
      PLATES_COLLECTION_ID,
      plateId
    );

    const registration: string = plate.registration || "Unknown plate";
    const sellerEmail: string | null = plate.seller_email || null;

    const salePrice = Math.round(finalPrice);
    const commissionAmount = calcCommission(salePrice);
    const dvlaFee = DVLA_FEE;
    const sellerPayout = salePrice - commissionAmount - dvlaFee;

    const nowIso = new Date().toISOString();
    const listingRef =
      plate.listing_id ||
      `AMP-${String(plate.$id || "")
        .slice(-6)
        .toUpperCase()}`;

    // 2) Update listing → SOLD
    await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, plate.$id, {
      status: "sold",
      sold_via: "auction",
      sold_price: salePrice,
      sold_at: nowIso,
      current_bid: salePrice,
    });

    // 3) Create transaction row
    const tx = await databases.createDocument(
      DB_ID,
      TRANSACTIONS_COLLECTION_ID,
      ID.unique(),
      {
        plate_id: plate.$id,
        registration,
        listing_id: listingRef,
        seller_email: sellerEmail,
        buyer_email: buyerEmail,
        sale_price: salePrice,
        commission_amount: commissionAmount,
        dvla_fee: dvlaFee,
        seller_payout: sellerPayout,
        payment_status: "pending",
        transaction_status: "awaiting_documents",
        created_at: nowIso,
        updated_at: nowIso,
      }
    );

    // 4) Fire off emails (don't let errors break the response)
    try {
      await sendTransactionEmails({
        registration,
        salePrice,
        sellerPayout,
        sellerEmail,
        buyerEmail,
      });
    } catch (emailErr) {
      console.error("mark-sold: email sending failed", emailErr);
      // continue anyway
    }

    return NextResponse.json(
      {
        success: true,
        transaction: tx,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("mark-sold error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to mark listing as sold." },
      { status: 500 }
    );
  }
}
