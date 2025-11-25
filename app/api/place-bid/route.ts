// app/api/place-bid/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

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
    const BIDS_DB = "69198a79003733444105"; // your auctions DB
    const BIDS_COLLECTION = "bids";

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
    const reserveMet = bidAmount >= reserve; // currently just informational

    // -----------------------------
    // 5-MINUTE SOFT CLOSE LOGIC
    // -----------------------------
    const now = new Date();
    const SOFT_CLOSE_MS = 5 * 60 * 1000; // ✅ 5 minutes

    let newEndTime: string | null = null;

    if (listing.auction_end) {
      const end = new Date(listing.auction_end);
      const remainingMs = end.getTime() - now.getTime();

      // Only extend if we are in the final 5 minutes and still before the end
      if (remainingMs > 0 && remainingMs <= SOFT_CLOSE_MS) {
        // ✅ Reset to 5 minutes from *now*, not from the old end
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
      // no reserve_met field – not in schema
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
      extended: newEndTime, // null if no soft close, ISO string if extended
      reserveMet, // handy if you ever want UI to react live
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
