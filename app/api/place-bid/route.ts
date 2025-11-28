// app/api/place-bid/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

export async function POST(req: Request) {
  try {
    const { listingId, amount, userId, userEmail } = await req.json();

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!listingId || amount == null) {
      return NextResponse.json(
        { error: "Missing listingId or amount" },
        { status: 400 }
      );
    }

    const bidAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);

    if (Number.isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid bid amount." },
        { status: 400 }
      );
    }

    // Must be logged in (we need an email to find profile)
    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be logged in to place a bid." },
        { status: 401 }
      );
    }

    // -----------------------------
    // APPWRITE CLIENT (SERVER KEY)
    // -----------------------------
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const db = new Databases(client);

    const PLATES_DB = process.env.APPWRITE_PLATES_DATABASE_ID!;
    const PLATES_COLLECTION = process.env.APPWRITE_PLATES_COLLECTION_ID!;

    // Auctions DB + bids collection
    const BIDS_DB = "69198a79003733444105";
    const BIDS_COLLECTION = "bids";

    // ✅ PROFILES DB / COLLECTION (for payment method flag)
    const PROFILES_DB =
      process.env.APPWRITE_PROFILES_DATABASE_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID;
    const PROFILES_COLLECTION =
      process.env.APPWRITE_PROFILES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID;

    if (!PROFILES_DB || !PROFILES_COLLECTION) {
      console.error("Profiles DB/collection env vars missing");
      return NextResponse.json(
        {
          error:
            "Profiles configuration is missing. Please contact support before bidding.",
        },
        { status: 500 }
      );
    }

    // -----------------------------
    // PAYMENT METHOD CHECK
    // -----------------------------
    const profileRes = await db.listDocuments(PROFILES_DB, PROFILES_COLLECTION, [
      Query.equal("email", userEmail),
    ]);

    if (!profileRes.documents.length) {
      return NextResponse.json(
        {
          error:
            "We could not find your profile. Please complete your personal details before bidding.",
        },
        { status: 400 }
      );
    }

    const profile = profileRes.documents[0] as any;

    // 👇 STRONGER CHECK: only strict `true` counts as “has payment method”
    const flagRaw = profile.has_payment_method;
    const hasPaymentMethod = flagRaw === true;

    if (!hasPaymentMethod) {
      console.log("⛔ Bid blocked – has_payment_method flag:", flagRaw);

      return NextResponse.json(
        {
          error:
            "You must add a payment method before you can place a bid. Go to your dashboard and add a payment method first.",
          requiresPaymentMethod: true,
          // helpful for us while on localhost
          debugHasPaymentMethod: flagRaw ?? null,
        },
        { status: 403 }
      );
    }

    // -----------------------------
    // LOAD LISTING
    // -----------------------------
    const listing: any = await db.getDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listingId
    );

    // Only allow live auctions to accept bids
    if (listing.status !== "live") {
      return NextResponse.json(
        { error: "Auction is not live." },
        { status: 400 }
      );
    }

    const current = listing.current_bid ?? listing.starting_price ?? 0;
    const reserve = listing.reserve_price ?? 0;

    // -----------------------------
    // BID INCREMENTS
    // -----------------------------
    function getIncrement(price: number) {
      if (price < 100) return 5;
      if (price < 500) return 10;
      if (price < 1000) return 25;
      if (price < 5000) return 50;
      if (price < 10000) return 100;
      if (price < 25000) return 250;
      if (price < 50000) return 500;
      return 1000;
    }

    const requiredIncrement = getIncrement(current);
    const minimumAllowed = current + requiredIncrement;

    if (bidAmount < minimumAllowed) {
      return NextResponse.json(
        {
          error: `Minimum bid is £${minimumAllowed.toLocaleString()} (increment £${requiredIncrement})`,
        },
        { status: 400 }
      );
    }

    // We *use* reserve for logic/UI, but don’t write a reserve_met field
    const reserveMet = bidAmount >= reserve;

    // -----------------------------
    // 5-MINUTE SOFT CLOSE LOGIC
    // -----------------------------
    const now = new Date();
    const SOFT_CLOSE_MS = 5 * 60 * 1000;

    let newEndTime: string | null = null;

    if (listing.auction_end) {
      const end = new Date(listing.auction_end);
      const remainingMs = end.getTime() - now.getTime();

      if (remainingMs > 0 && remainingMs <= SOFT_CLOSE_MS) {
        const extendedTo = new Date(now.getTime() + SOFT_CLOSE_MS);
        newEndTime = extendedTo.toISOString();
      }
    }

    // -----------------------------
    // CREATE BID RECORD
    // -----------------------------
    await db.createDocument(BIDS_DB, BIDS_COLLECTION, ID.unique(), {
      listing_id: listingId,
      amount: bidAmount,
      timestamp: now.toISOString(),
      bidder_id: userId || null,
      bidder_email: userEmail || null,
    });

    // -----------------------------
    // UPDATE LISTING
    // -----------------------------
    const updatePayload: Record<string, any> = {
      current_bid: bidAmount,
      bids: (listing.bids || 0) + 1,
    };

    if (newEndTime) {
      updatePayload.auction_end = newEndTime;
    }

    const updatedListing = await db.updateDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listingId,
      updatePayload
    );

    // -----------------------------
    // RESPONSE
    // -----------------------------
    return NextResponse.json({
      success: true,
      extended: newEndTime,
      reserveMet,
      updatedListing,
    });
  } catch (err: any) {
    console.error("💥 BID ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Bid failed." },
      { status: 500 }
    );
  }
}
