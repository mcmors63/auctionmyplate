// app/api/buy-now/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

// -------------------------------------
// Appwrite server client
// -------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

// Plates DB/collection (SERVER env)
const PLATES_DB = process.env.APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.APPWRITE_PLATES_COLLECTION_ID!;

// Transactions live in the same DB
const TX_DB = PLATES_DB;
const TX_COLLECTION = "transactions";

// -------------------------------------
// Commission helper – same tiers as dashboard
// -------------------------------------
function getCommissionRate(reserve: number): number {
  if (reserve <= 4999.99) return 10;
  if (reserve <= 9999.99) return 8;
  if (reserve <= 24999.99) return 7;
  if (reserve <= 49999.99) return 6;
  return 5;
}

// -------------------------------------
// POST /api/buy-now
// -------------------------------------
export async function POST(req: Request) {
  try {
    const { listingId, buyerEmail } = await req.json();

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

    const status = listing.status;
    const buyNow: number | null =
      typeof listing.buy_now === "number"
        ? listing.buy_now
        : typeof listing.buy_now_price === "number"
        ? listing.buy_now_price
        : null;

    // Must be live
    if (status !== "live") {
      return NextResponse.json(
        { error: "Buy Now is only available on live listings." },
        { status: 400 }
      );
    }

    // Must have a valid Buy Now price
    if (!buyNow || buyNow <= 0) {
      return NextResponse.json(
        { error: "No valid Buy Now price set for this listing." },
        { status: 400 }
      );
    }

    // Not already sold
    if (listing.status === "sold") {
      return NextResponse.json(
        { error: "This listing has already been sold." },
        { status: 400 }
      );
    }

    // Make sure auction hasn't ended already
    if (listing.auction_end) {
      const now = new Date();
      const end = new Date(listing.auction_end);
      if (now.getTime() > end.getTime()) {
        return NextResponse.json(
          { error: "Auction has already ended." },
          { status: 400 }
        );
      }
    }

    const nowIso = new Date().toISOString();

    // -----------------------------
    // Commission + payout calculation
    // -----------------------------
    const reserve =
      typeof listing.reserve_price === "number" && listing.reserve_price > 0
        ? listing.reserve_price
        : buyNow;

    const commissionRate = getCommissionRate(reserve);
    const commissionAmount = Math.round((buyNow * commissionRate) / 100);

    const dvlaFee = 80; // buyer pays on top
    const sellerPayout = buyNow - commissionAmount;

    // -----------------------------
    // Update listing: mark sold, end auction
    // (no reserve_met field – avoid schema errors)
// -----------------------------
    const updatedListing = await db.updateDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listingId,
      {
        status: "sold",
        current_bid: buyNow,
        auction_end: nowIso,
      }
    );

    // -----------------------------
    // Create transaction row
    // -----------------------------
    const txDoc = await db.createDocument(
      TX_DB,
      TX_COLLECTION,
      ID.unique(),
      {
        registration: listing.registration || "",
        listing_id: listing.listing_id || listing.$id,
        seller_email: listing.seller_email || "",
        buyer_email: buyerEmail || "",
        sale_price: buyNow,
        commission_rate: commissionRate,
