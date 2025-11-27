// app/api/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// ENV (server-side)
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

function getDatabases() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return new Databases(client);
}

// -----------------------------
// POST /api/approve-listing
// Body: { listingId, sellerEmail, interesting_fact, starting_price, reserve_price }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ APPROVE-LISTING: Missing Appwrite config");
      return NextResponse.json(
        { error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const listingId = body.listingId as string | undefined;
    const sellerEmail = body.sellerEmail as string | undefined;
    const interestingFactRaw = body.interesting_fact as string | undefined;
    const startingPriceRaw = body.starting_price;
    const reservePriceRaw = body.reserve_price;

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 }
      );
    }

    const databases = getDatabases();

    // Load existing plate
    const plate: any = await databases.getDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId
    );

    const registration = plate.registration as string | undefined;

    // Normalise prices, with fallback to existing values
    const startingPrice =
      startingPriceRaw !== undefined &&
      startingPriceRaw !== null &&
      !Number.isNaN(Number(startingPriceRaw))
        ? Number(startingPriceRaw)
        : typeof plate.starting_price === "number"
        ? plate.starting_price
        : 0;

    const reservePrice =
      reservePriceRaw !== undefined &&
      reservePriceRaw !== null &&
      !Number.isNaN(Number(reservePriceRaw))
        ? Number(reservePriceRaw)
        : typeof plate.reserve_price === "number"
        ? plate.reserve_price
        : 0;

    // Normalise interesting_fact: use admin text if provided, otherwise keep existing
    const interestingFact =
      typeof interestingFactRaw === "string" &&
      interestingFactRaw.trim().length > 0
        ? interestingFactRaw.trim()
        : (plate.interesting_fact as string | undefined) || "";

    // 🔑 Approve & queue for next auction
    const updated = await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId,
      {
        status: "queued",
        starting_price: startingPrice,
        reserve_price: reservePrice,
        interesting_fact: interestingFact,
      }
    );

    // -----------------------------
    // Optional: email seller
    // -----------------------------
    try {
      if (
        sellerEmail &&
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
        const dashboardLink = `${SITE_URL}/dashboard`;

        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: sellerEmail,
          subject: `✅ Your plate has been approved: ${regText}`,
          html: `
            <p>Good news!</p>
            <p>Your number plate <strong>${regText}</strong> has been approved by the AuctionMyPlate team.</p>
            <p>It is now <strong>queued</strong> for the next weekly auction.</p>
            <p>You can view the status of your listing in your dashboard:</p>
            <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
            <p>Thank you for listing with <strong>AuctionMyPlate.co.uk</strong>.</p>
          `,
        });

        console.log("✅ Approval email sent to seller", sellerEmail);
      } else {
        console.warn(
          "⚠️ SMTP not fully configured or sellerEmail missing, skipping approval email."
        );
      }
    } catch (mailErr) {
      console.error("❌ Failed to send approval email:", mailErr);
      // Do not fail main request over email
    }

    console.log("✅ Plate approved & queued", { listingId });

    return NextResponse.json(
      {
        ok: true,
        plate: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ APPROVE-LISTING error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to approve listing.",
      },
      { status: 500 }
    );
  }
}
