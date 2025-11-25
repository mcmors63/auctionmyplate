// app/api/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";

// -------- Appwrite (server) --------
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

// -------- Email route base URL --------
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      listingId,
      sellerEmail,
      interesting_fact,
      starting_price,
      reserve_price,
    } = body;

    if (!listingId || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing listingId or sellerEmail" },
        { status: 400 }
      );
    }

    // Server Appwrite client
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // Load existing plate so we have registration, etc.
    const plate = await databases.getDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId
    );

    // You can extend this with auction_start / auction_end logic if needed.
    const updated = await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId,
      {
        status: "queued",
        interesting_fact,
        starting_price,
        reserve_price,
      }
    );

    // 🔔 Send approval email using the *registration*, not the ID
    try {
      await fetch(`${BASE_URL}/admin/listing-approved-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sellerEmail,
          registration: plate.registration || "your number plate",
        }),
      });
    } catch (err) {
      console.error("Failed to call listing-approved-email route:", err);
      // We DON'T fail the whole approve flow if email fails.
    }

    return NextResponse.json({ ok: true, plate: updated });
  } catch (err: any) {
    console.error("approve-listing error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to approve listing" },
      { status: 500 }
    );
  }
}
