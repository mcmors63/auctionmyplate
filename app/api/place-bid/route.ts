// app/api/place-bid/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// Appwrite setup
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;

const PLATES_COLLECTION =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

const BIDS_COLLECTION =
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  "bids";

// -----------------------------
// Types
// -----------------------------
type Listing = {
  $id: string;
  status?: string;
  registration?: string;
  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

// -----------------------------
// Bid increment helper
// -----------------------------
function getBidIncrement(current: number): number {
  if (current < 100) return 5;
  if (current < 500) return 10;
  if (current < 1000) return 25;
  if (current < 5000) return 50;
  if (current < 10000) return 100;
  if (current < 25000) return 250;
  if (current < 50000) return 500;
  return 1000;
}

// -----------------------------
// POST /api/place-bid
// -----------------------------
export async function POST(req: Request) {
  try {
    const { listingId, amount, userId, userEmail } = await req.json();

    if (!listingId || amount == null || !userEmail) {
      return NextResponse.json(
        { error: "Missing listingId, amount or userEmail." },
        { status: 400 }
      );
    }

    const bidAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid bid amount." },
        { status: 400 }
      );
    }

    // -----------------------------
    // Load listing
    // -----------------------------
    const listing = (await databases.getDocument(
      DB_ID,
      PLATES_COLLECTION,
      listingId
    )) as unknown as Listing;

    if (!listing || listing.status !== "live") {
      return NextResponse.json(
        { error: "Auction is not live." },
        { status: 400 }
      );
    }

    // -----------------------------
    // Safety check & SOFT CLOSE
    // -----------------------------
    const nowMs = Date.now();
    const auctionEnd =
      listing.auction_end ??
      listing.end_time ??
      null;

    let newAuctionEnd: string | null = null;

    if (auctionEnd) {
      const endMs = Date.parse(auctionEnd);

      if (Number.isFinite(endMs)) {
        // Hard stop: auction already ended
        if (endMs <= nowMs) {
          return NextResponse.json(
            { error: "Auction has already ended." },
            { status: 400 }
          );
        }

        // 🕐 SOFT CLOSE – extend by 5 minutes if < 2 minutes left
        const remainingMs = endMs - nowMs;
        const TWO_MINUTES = 2 * 60 * 1000;
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (remainingMs > 0 && remainingMs <= TWO_MINUTES) {
          const extendedEnd = new Date(nowMs + FIVE_MINUTES);
          newAuctionEnd = extendedEnd.toISOString();
        }
      }
    }

    // -----------------------------
    // Calculate minimum allowed bid
    // -----------------------------
    const effectiveBaseBid =
      listing.current_bid != null
        ? listing.current_bid
        : listing.starting_price ?? 0;

    const increment = getBidIncrement(effectiveBaseBid);
    const minimumAllowed = effectiveBaseBid + increment;

    if (bidAmount < minimumAllowed) {
      return NextResponse.json(
        {
          error: `Minimum bid is £${minimumAllowed.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Create bid document in BIDS collection
    // (history of all bids on this listing)
    // -----------------------------
    let bidDoc: any = null;

    try {
      bidDoc = await databases.createDocument(
        DB_ID,
        BIDS_COLLECTION,
        ID.unique(),
        {
          listing_id: listing.$id,
          amount: bidAmount,
          timestamp: new Date().toISOString(),
          bidder_email: userEmail,
          // ❌ no bidder_id – avoids schema mismatch
        }
      );
    } catch (err) {
      console.error("Failed to create bid document:", err);
      // we DON'T fail the whole request if history logging breaks
    }

    // -----------------------------
    // Update listing current_bid + bids count (+ soft-close extension)
    // -----------------------------
    const newBidsCount =
      typeof listing.bids === "number" ? listing.bids + 1 : 1;

    const updatePayload: any = {
      current_bid: bidAmount,
      bids: newBidsCount,
    };

    if (newAuctionEnd) {
      updatePayload.auction_end = newAuctionEnd;
    }

    const updatedListing = await databases.updateDocument(
      DB_ID,
      PLATES_COLLECTION,
      listing.$id,
      updatePayload
    );

    return NextResponse.json({
      ok: true,
      updatedListing,
      bidDoc,
    });
  } catch (err: any) {
    console.error("place-bid route fatal error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error placing bid. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}
