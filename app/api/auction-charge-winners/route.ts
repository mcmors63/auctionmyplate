// app/api/auction-charge-winners/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// CONSTANTS
// -----------------------------
const DVLA_FEE_GBP = 80;

// -----------------------------
// STRIPE INIT
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20" as any,
});

// -----------------------------
// APPWRITE INIT
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;
const PLATES_DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;
const BIDS_COLLECTION =
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  process.env.APPWRITE_BIDS_COLLECTION_ID;

if (!BIDS_COLLECTION) {
  throw new Error(
    "Missing BIDS collection env (NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID or APPWRITE_BIDS_COLLECTION_ID)"
  );
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

// -----------------------------
// TYPES (loose – we don't trust exact schema names here)
// -----------------------------
type PlateDoc = {
  $id: string;
  status?: string;
  current_bid?: number | null;
  reserve_price?: number | null;
  registration?: string;
  listing_id?: string;
};

type BidDoc = {
  $id: string;
  listing_id?: string;
  amount?: number;
  bid_amount?: number;
  bidder_email?: string;
  timestamp?: string;
};

// -----------------------------
// HELPERS
// -----------------------------
function getNumeric(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseTimestamp(ts: any): number {
  if (!ts || typeof ts !== "string") return 0;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? t : 0;
}

// -----------------------------
// POST: Charge auction winners
// Optional body: { listingId?: string }
// - If listingId provided: only processes that one listing
// - Else: processes ALL listings with status === "ended"
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { listingId }: { listingId?: string } = body || {};

    // 1) Get target listings
    let listings: PlateDoc[] = [];

    if (listingId) {
      // Single listing mode
      const doc = (await databases.getDocument(
        PLATES_DB,
        PLATES_COLLECTION,
        listingId
      )) as unknown as PlateDoc;
      listings = [doc];
    } else {
      // All ended auctions
      const res = await databases.listDocuments(PLATES_DB, PLATES_COLLECTION, [
        Query.equal("status", "ended"),
      ]);
      listings = res.documents as unknown as PlateDoc[];
    }

    if (!listings.length) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "No matching ended listings found.",
      });
    }

    const results: any[] = [];
    let processed = 0;

    // 2) For each ended listing, determine winner and charge
    for (const listing of listings) {
      const lid = listing.$id;
      const status = (listing.status || "").toLowerCase();

      // Only operate on ended auctions
      if (status !== "ended") {
        results.push({
          listingId: lid,
          skipped: true,
          reason: `status is "${listing.status}", not "ended"`,
        });
        continue;
      }

      const currentBid = getNumeric(listing.current_bid);
      const reserve = getNumeric(listing.reserve_price);

      if (!currentBid || currentBid <= 0) {
        results.push({
          listingId: lid,
          skipped: true,
          reason: "no bids / current_bid is 0",
        });
        continue;
      }

      if (reserve > 0 && currentBid < reserve) {
        results.push({
          listingId: lid,
          skipped: true,
          reason: `reserve not met (bid=${currentBid}, reserve=${reserve})`,
        });
        continue;
      }

      // 2a) Get all bids for this listing and find the latest by timestamp
      let bidsRes;
      try {
        bidsRes = await databases.listDocuments(PLATES_DB, BIDS_COLLECTION, [
          Query.equal("listing_id", lid),
        ]);
      } catch (err) {
        console.error(
          `Failed to list bids for listing ${lid}. Check BIDS indexes/attributes.`,
          err
        );
        results.push({
          listingId: lid,
          skipped: true,
          reason: "failed to load bids (Appwrite error)",
        });
        continue;
      }

      const bids = (bidsRes.documents as unknown as BidDoc[]) || [];
      if (!bids.length) {
        results.push({
          listingId: lid,
          skipped: true,
          reason: "no bids found in BIDS collection",
        });
        continue;
      }

      // Sort by timestamp descending – latest bid wins
      const sorted = bids.sort(
        (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
      );

      const winningBid = sorted[0];
      const rawAmount =
        winningBid.amount !== undefined
          ? winningBid.amount
          : winningBid.bid_amount;

      const winningAmount = getNumeric(rawAmount);
      const winnerEmail = winningBid.bidder_email || "";

      if (!winnerEmail) {
        results.push({
          listingId: lid,
          skipped: true,
          reason: "winning bid has no bidder_email",
        });
        continue;
      }

      if (!winningAmount || winningAmount <= 0) {
        results.push({
          listingId: lid,
          skipped: true,
          reason: "winning bid has invalid amount",
        });
        continue;
      }

      // Just sanity: make sure winningAmount matches listing.current_bid
      if (Math.abs(winningAmount - currentBid) > 0.0001) {
        console.warn(
          `Listing ${lid}: winning bid (${winningAmount}) != current_bid (${currentBid}). Using winningAmount.`
        );
      }

      const finalBidAmount = winningAmount || currentBid;
      const totalWithDvla = finalBidAmount + DVLA_FEE_GBP;
      const amountInPence = Math.round(totalWithDvla * 100);

      // 2b) Stripe: find/create customer & saved card
      try {
        // Find or create customer
        const existing = await stripe.customers.list({
          email: winnerEmail,
          limit: 1,
        });

        let customer = existing.data[0];
        if (!customer) {
          customer = await stripe.customers.create({
            email: winnerEmail,
          });
        }

        // Get saved card
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: "card",
          limit: 1,
        });

        if (!paymentMethods.data.length) {
          results.push({
            listingId: lid,
            skipped: true,
            reason:
              "winner has no saved card in Stripe (must add card via payment-method page)",
            winnerEmail,
          });
          continue;
        }

        const paymentMethod = paymentMethods.data[0];

        // 2c) Create + confirm PaymentIntent with idempotency
        const idempotencyKey = `winner-charge-${lid}`;

        const intent = await stripe.paymentIntents.create(
          {
            amount: amountInPence,
            currency: "gbp",
            customer: customer.id,
            payment_method: paymentMethod.id,
            confirm: true,
            off_session: true,
            description: `Auction winner - ${
              listing.registration || listing.listing_id || lid
            } (incl. £${DVLA_FEE_GBP} DVLA fee)`,
            metadata: {
              listingId: lid,
              winnerEmail,
              type: "auction_winner",
              finalBidAmount: String(finalBidAmount),
              dvlaFee: String(DVLA_FEE_GBP),
            },
          },
          { idempotencyKey }
        );

        processed++;
        results.push({
          listingId: lid,
          charged: true,
          winnerEmail,
          bid: finalBidAmount,
          totalCharged: totalWithDvla,
          paymentIntentId: intent.id,
          paymentStatus: intent.status,
        });
      } catch (err: any) {
        console.error(`Stripe error charging winner for listing ${lid}:`, err);
        const stripeError = err as Stripe.StripeError & {
          raw?: { payment_intent?: Stripe.PaymentIntent };
        };

        const entry: any = {
          listingId: lid,
          charged: false,
          winnerEmail,
          error: stripeError.message || "Stripe charge failed.",
          type: stripeError.type,
          code: (stripeError as any).code,
        };

        if (stripeError.raw?.payment_intent) {
          entry.paymentIntentId = stripeError.raw.payment_intent.id;
          entry.paymentStatus = stripeError.raw.payment_intent.status;
        }

        results.push(entry);
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      results,
    });
  } catch (err: any) {
    console.error("auction-charge-winners fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
