import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// ENV (server-side)
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Main DB
const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

// Collections
const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Use same DB for transactions
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  PLATES_DB_ID;

// HARD-CODED: your Transactions table ID really is "transactions"
const TX_COLLECTION_ID = "transactions";

console.log("MARK-SOLD ENV CHECK", {
  endpoint,
  projectId,
  PLATES_DB_ID,
  PLATES_COLLECTION_ID,
  TX_DB_ID,
  TX_COLLECTION_ID,
});

// -----------------------------
// Helper: Appwrite client
// -----------------------------
function getServerDatabases() {
  const client = new Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// -----------------------------
// POST /api/admin/mark-sold
// Body: { plateId, finalPrice, buyerEmail }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ MARK-SOLD: Missing endpoint / projectId / apiKey");
      return NextResponse.json(
        { error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }

    if (!PLATES_DB_ID || !PLATES_COLLECTION_ID || !TX_DB_ID || !TX_COLLECTION_ID) {
      console.error("❌ MARK-SOLD: Missing DB/collection IDs", {
        PLATES_DB_ID,
        PLATES_COLLECTION_ID,
        TX_DB_ID,
        TX_COLLECTION_ID,
      });
      return NextResponse.json(
        {
          error: "Server DB configuration incomplete.",
        },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { plateId, finalPrice, buyerEmail } = body || {};
    console.log("MARK-SOLD BODY", { plateId, finalPrice, buyerEmail });

    if (!plateId || finalPrice == null) {
      return NextResponse.json(
        { error: "plateId and finalPrice are required." },
        { status: 400 }
      );
    }

    const salePrice = Number(finalPrice);
    if (Number.isNaN(salePrice) || salePrice <= 0) {
      return NextResponse.json(
        { error: "finalPrice must be a positive number." },
        { status: 400 }
      );
    }

    const databases = getServerDatabases();

    // 1) Load the plate
    const plate: any = await databases.getDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      plateId
    );

    const sellerEmail = plate.seller_email as string | undefined;
    const registration = plate.registration as string | undefined;
    const commissionRateRaw = plate.commission_rate as number | undefined;
    const listingFeeRaw = plate.listing_fee as number | undefined;

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Plate has no seller_email. Cannot create transaction." },
        { status: 500 }
      );
    }

    // 2) Money
    const commissionRate =
      typeof commissionRateRaw === "number" && commissionRateRaw >= 0
        ? commissionRateRaw
        : 10; // fallback 10%

    const listingFee =
      typeof listingFeeRaw === "number" && listingFeeRaw >= 0 ? listingFeeRaw : 0;

    const commissionAmount = Math.round((salePrice * commissionRate) / 100);
    const dvlaFee = 80; // buyer pays this
    const sellerPayout = salePrice - commissionAmount - listingFee;

    const nowIso = new Date().toISOString();

    // 3) Create transaction (matches your Transactions schema + new flags)
    const txDoc = await databases.createDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      ID.unique(),
      {
        listing_id: plate.$id,
        seller_email: sellerEmail,
        buyer_email: buyerEmail || "",

        sale_price: salePrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        dvla_fee: dvlaFee,

        payment_status: "pending",
        transaction_status: "pending",
        documents: [],

        created_at: nowIso,
        updated_at: nowIso,
        registration: registration || "",

        // Seller flags
        seller_docs_requested: false,
        seller_docs_received: false,
        seller_payment_transferred: false,
        seller_process_complete: false,

        // Buyer flags
        buyer_info_requested: false,
        buyer_info_received: false,
        buyer_tax_mot_validated: false,
        buyer_payment_taken: false,
        buyer_transfer_complete: false,
      }
    );

    // 4) Update plate as sold
    await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      plate.$id,
      {
        status: "sold",
        current_bid: salePrice,
      }
    );

    console.log("✅ MARK-SOLD success", {
      plateId: plate.$id,
      txId: txDoc.$id,
    });

    // 5) Emails – Seller, Buyer, Admin
    try {
      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const regText = registration || "your registration";
        const salePriceText = salePrice.toLocaleString();
        const sellerPayoutText = sellerPayout.toLocaleString();

        // A) Seller email
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: sellerEmail,
          subject: `Your number plate has sold: ${regText}`,
          html: `
            <p>Congratulations.</p>
            <p>Your number plate <strong>${regText}</strong> has sold for <strong>£${salePriceText}</strong>.</p>
            <p>We will return <strong>£${sellerPayoutText}</strong> to you by bank transfer within 3 working days (subject to receiving the correct paperwork from you and the buyer).</p>
            <p>You will receive an email requesting further details to process the transfer.</p>
            <p>Thank you for your business.</p>
          `,
        });

        // B) Buyer email (only if we have their email)
        if (buyerEmail) {
          await transporter.sendMail({
            from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
            to: buyerEmail,
            subject: `You’ve purchased ${regText}`,
            html: `
              <p>Congratulations.</p>
              <p>You have successfully purchased <strong>${regText}</strong> for the sum of <strong>£${salePriceText}</strong>.</p>
              <p>This amount will be taken from your registered payment option once you have provided the requested information, which will be sent in a separate email.</p>
              <p>Please remember that the registration must go onto a vehicle which is taxed and holds a valid MOT (if required). This is required by DVLA for the transfer process.</p>
            `,
          });
        }

        // C) Admin email
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: "admin@auctionmyplate.co.uk",
          subject: `Plate sold: ${regText}`,
          html: `
            <p>Registration <strong>${regText}</strong> has been sold.</p>
            <ul>
              <li>Sale price: £${salePriceText}</li>
              <li>Seller payout: £${sellerPayoutText}</li>
              <li>Seller: ${sellerEmail}</li>
              <li>Buyer: ${buyerEmail || "not provided"}</li>
            </ul>
            <p>Please commence the transfer process.</p>
          `,
        });

        console.log("✅ Seller/Buyer/Admin sold emails sent");
      } else {
        console.warn("⚠️ SMTP env not set, skipping emails.");
      }
    } catch (mailErr) {
      console.error("❌ Failed to send one or more sold emails:", mailErr);
      // don’t fail whole request over email
    }

    return NextResponse.json(
      {
        ok: true,
        transaction: txDoc,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ MARK-SOLD API error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to mark plate as sold and create transaction.",
      },
      { status: 500 }
    );
  }
}
