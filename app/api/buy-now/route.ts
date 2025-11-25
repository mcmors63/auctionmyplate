// app/api/buy-now/route.ts
import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

// -------------------------------------
// Appwrite server client
// -------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

// Use the *server-side* env vars
const PLATES_DB = process.env.APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.APPWRITE_PLATES_COLLECTION_ID!;

// -------------------------------------
// POST /api/buy-now
// -------------------------------------
export async function POST(req: Request) {
  try {
    const { listingId } = await req.json();

    // ✅ Only require listingId
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    // Load listing
    const listing: any = await db.getDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listingId
    );

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const status: string = listing.status;
    const buyNow: number | null =
      typeof listing.buy_now === "number" && listing.buy_now > 0
        ? listing.buy_now
        : typeof listing.buy_now_price === "number" &&
          listing.buy_now_price > 0
        ? listing.buy_now_price
        : null;

    // Only live listings can be bought
    if (status !== "live") {
      return NextResponse.json(
        { error: "Buy Now is only available on live listings." },
        { status: 400 }
      );
    }

    // Must actually have a Buy Now price
    if (!buyNow) {
      return NextResponse.json(
        { error: "No valid Buy Now price set for this listing." },
        { status: 400 }
      );
    }

    // If it's already sold, bail
    if (listing.status === "sold") {
      return NextResponse.json(
        { error: "This listing has already been sold." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // ✅ Only update fields that actually exist in your schema
    const updated = await db.updateDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listingId,
      {
        status: "sold",
        current_bid: buyNow,
        auction_end: nowIso,
      }
    );

    // Later we’ll hook this into payments + transactions
    return NextResponse.json({
      success: true,
      updatedListing: updated,
    });
  } catch (err: any) {
    console.error("💥 BUY NOW ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Buy Now failed" },
      { status: 500 }
    );
  }
}
