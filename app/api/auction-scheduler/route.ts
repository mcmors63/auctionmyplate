// app/api/auction-scheduler/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, Query, ID } from "node-appwrite"; // 👈 MUST be node-appwrite
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// APPWRITE SETUP
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// BIDS collection (same DB)
const BIDS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  "";

// TRANSACTIONS collection (same DB)
const TRANSACTIONS_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey); // ✅ only on node-appwrite Client

const databases = new Databases(client);

// -----------------------------
// STRIPE
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// -----------------------------
// SMALL HELPERS
// -----------------------------
const DVLA_FEE_GBP = 80;

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
// Helper: create transaction doc (best-effort)
// -----------------------------
async function createTransactionForWinner(params: {
  listing: any;
  finalBidAmount: number;
  totalWithDvla: number;
  winnerEmail: string;
  paymentIntentId: string;
}) {
  if (!TRANSACTIONS_COLLECTION_ID) {
    console.warn(
      "No TRANSACTIONS_COLLECTION_ID configured; skipping transaction creation."
    );
    return;
  }

  const { listing, finalBidAmount, totalWithDvla, winnerEmail, paymentIntentId } =
    params;

  const listingId = listing.$id as string;
  const reg = (listing.registration as string | undefined) || "";
  const listingRef =
    (listing.listing_id as string | undefined) || listingId;

  const sellerEmail =
    (listing.seller_email as string | undefined) || "";

  const data: Record<string, any> = {
    listing_id: listingId,
    listing_ref: listingRef,
    registration: reg,
    buyer_email: winnerEmail,
    seller_email: sellerEmail,
    final_bid: finalBidAmount,
    dvla_fee: DVLA_FEE_GBP,
    total_charged: totalWithDvla,
    stripe_payment_intent_id: paymentIntentId,
    status: "pending_documents",
    source: "auction_scheduler",
    type: "auction_winner",
  };

  try {
    await databases.createDocument(
      DB_ID,
      TRANSACTIONS_COLLECTION_ID,
      ID.unique(),
      data
    );
  } catch (err) {
    console.error(
      "Failed to create transaction document for listing",
      listingId,
      err
    );
    // Don't throw – Stripe has already charged the buyer, we must not blow up the scheduler.
  }
}

// -----------------------------
// GET = manual scheduler run
// -----------------------------
export async function GET() {
  const winnerCharges: any[] = [];

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // ---------------------------------
    // 1) Promote queued -> live
    // ---------------------------------
    const queuedRes = await databases.listDocuments(
      DB_ID,
      PLATES_COLLECTION_ID,
      [
        Query.equal("status", "queued"),
        Query.lessThanEqual("auction_start", nowIso),
        Query.limit(100),
      ]
    );

    let promoted = 0;
    for (const doc of queuedRes.documents as any[]) {
      await databases.updateDocument(
        DB_ID,
        PLATES_COLLECTION_ID,
        doc.$id,
        {
          status: "live",
        }
      );
      promoted++;
    }

    // ---------------------------------
    // 2) live -> completed
    // ---------------------------------
    const liveRes = await databases.listDocuments(
      DB_ID,
      PLATES_COLLECTION_ID,
      [
        Query.equal("status", "live"),
        Query.lessThanEqual("auction_end", nowIso),
        Query.limit(100),
      ]
    );

    let completed = 0;
    const justCompleted: any[] = [];

    for (const doc of liveRes.documents as any[]) {
      const updated = await databases.updateDocument(
        DB_ID,
        PLATES_COLLECTION_ID,
        doc.$id,
        { status: "completed" }
      );
      completed++;
      justCompleted.push(updated);
    }

    // ---------------------------------
    // 3) Charge winners for just-completed listings
    //    (if Stripe + BIDS collection are configured)
    // ---------------------------------
    if (!stripe || !BIDS_COLLECTION_ID) {
      // We still return success, but explain why no charges done
      return NextResponse.json({
        ok: true,
        now: nowIso,
        promoted,
        completed,
        winnerCharges: [],
        note:
          "Stripe or BIDS collection not configured – skipped winner charging.",
      });
    }

    for (const listing of justCompleted) {
      const lid = listing.$id as string;

      const currentBid = getNumeric(listing.current_bid);
      const reserve = getNumeric(listing.reserve_price);

      // No bids / zero current_bid
      if (!currentBid || currentBid <= 0) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "no bids / current_bid is 0",
        });
        continue;
      }

      // Reserve not met
      if (reserve > 0 && currentBid < reserve) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: `reserve not met (bid=${currentBid}, reserve=${reserve})`,
        });
        continue;
      }

      // ---- Load bids for this listing ----
      let bidsRes;
      try {
        bidsRes = await databases.listDocuments(
          DB_ID,
          BIDS_COLLECTION_ID,
          [Query.equal("listing_id", lid), Query.limit(1000)]
        );
      } catch (err) {
        console.error(
          `Failed to list bids for listing ${lid}. Check BIDS indexes/attributes.`,
          err
        );
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "failed to load bids (Appwrite error)",
        });
        continue;
      }

      const bids = (bidsRes.documents as any[]) || [];
      if (!bids.length) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "no bids found in BIDS collection",
        });
        continue;
      }

      // Latest bid wins (by timestamp)
      bids.sort(
        (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
      );
      const winningBid = bids[0];

      const rawAmount =
        winningBid.amount !== undefined
          ? winningBid.amount
          : winningBid.bid_amount;

      const winningAmount = getNumeric(rawAmount);
      const winnerEmail = winningBid.bidder_email || "";

      if (!winnerEmail) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "winning bid has no bidder_email",
        });
        continue;
      }

      if (!winningAmount || winningAmount <= 0) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "winning bid has invalid amount",
        });
        continue;
      }

      const finalBidAmount = winningAmount || currentBid;
      const totalWithDvla = finalBidAmount + DVLA_FEE_GBP;
      const amountInPence = Math.round(totalWithDvla * 100);

      try {
        // ---- Stripe: find/create customer ----
        const existing = await stripe.customers.list({
          email: winnerEmail,
          limit: 1,
        });

        let customer = existing.data[0];
        if (!customer) {
          customer = await stripe.customers.create({ email: winnerEmail });
        }

        // ---- Get saved card ----
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: "card",
          limit: 1,
        });

        if (!paymentMethods.data.length) {
          winnerCharges.push({
            listingId: lid,
            skipped: true,
            reason:
              "winner has no saved card in Stripe (must add card via payment-method page)",
            winnerEmail,
          });
          continue;
        }

        const paymentMethod = paymentMethods.data[0];

        // ---- Charge winner (idempotent) ----
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

        // ✅ Try to create a transaction document (best-effort, non-fatal)
        await createTransactionForWinner({
          listing,
          finalBidAmount,
          totalWithDvla,
          winnerEmail,
          paymentIntentId: intent.id,
        });

        winnerCharges.push({
          listingId: lid,
          charged: true,
          winnerEmail,
          bid: finalBidAmount,
          totalCharged: totalWithDvla,
          paymentIntentId: intent.id,
          paymentStatus: intent.status,
        });

        // We leave status = "completed" for now.
        // Later we'll add:
        //  - more transaction states
        //  - final "completed" emails, etc.
      } catch (err: any) {
        console.error(
          `Stripe error charging winner for listing ${lid}:`,
          err
        );
        const entry: any = {
          listingId: lid,
          charged: false,
          winnerEmail,
          error: err?.message || "Stripe charge failed.",
        };
        const anyErr = err as any;
        if (anyErr?.raw?.payment_intent) {
          entry.paymentIntentId = anyErr.raw.payment_intent.id;
          entry.paymentStatus = anyErr.raw.payment_intent.status;
        }
        winnerCharges.push(entry);
      }
    }

    return NextResponse.json({
      ok: true,
      now: nowIso,
      promoted,
      completed,
      winnerCharges,
    });
  } catch (err: any) {
    console.error("auction-scheduler error", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
