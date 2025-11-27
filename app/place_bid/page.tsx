// app/place_bid/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Client, Databases, Account } from "appwrite";
import Link from "next/link";
import AuctionTimer from "../current-listings/AuctionTimer";

// ----------------------------------------------------
// Appwrite
// ----------------------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const db = new Databases(client);
const account = new Account(client);

const PLATES_DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------
type Listing = {
  $id: string;
  registration?: string;
  listing_id?: string;
  status?: string;
  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;
  auction_end?: string | null;
  buy_now?: number | null;
  buy_now_price?: number | null;
};

// ----------------------------------------------------
// BID INCREMENTS
// ----------------------------------------------------
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

// ----------------------------------------------------
// PAGE
// ----------------------------------------------------
export default function PlaceBidPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get("id");

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // ----------------------------------------------------
  // LOGIN CHECK
  // ----------------------------------------------------
  useEffect(() => {
    account.get().then(
      () => setLoggedIn(true),
      () => setLoggedIn(false)
    );
  }, []);

  // ----------------------------------------------------
  // LOAD LISTING
  // ----------------------------------------------------
  useEffect(() => {
    if (!listingId) {
      setError("Missing listing ID.");
      setLoading(false);
      return;
    }

    db.getDocument(PLATES_DB, PLATES_COLLECTION, listingId)
      .then((doc) => setListing(doc as Listing))
      .catch(() => setError("Listing not found."))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-lg text-gray-600">Loading listing…</p>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-red-600 text-xl">Listing not found.</p>
      </div>
    );

  // ----------------------------------------------------
  // CALCULATIONS
  // ----------------------------------------------------
  const effectiveBaseBid =
    listing.current_bid != null
      ? listing.current_bid
      : listing.starting_price ?? 0;

  const bidIncrement = getBidIncrement(effectiveBaseBid);
  const minimumAllowed = effectiveBaseBid + bidIncrement;

  const bidsCount = listing.bids ?? 0;

  // Reserve logic: only treat as met if reserve > 0
  const hasReserve =
    typeof listing.reserve_price === "number" && listing.reserve_price > 0;
  const reserveMet =
    hasReserve && effectiveBaseBid >= (listing.reserve_price as number);

  // Buy Now – use buy_now from Appwrite, fallback to buy_now_price
  const rawBuyNow =
    (listing.buy_now as number | null | undefined) ??
    (listing.buy_now_price as number | null | undefined) ??
    null;

  const buyNowPrice =
    typeof rawBuyNow === "number" && rawBuyNow > 0 ? rawBuyNow : null;

  const isLive = listing.status === "live";
  const isComing = listing.status === "queued";

  const displayId =
    listing.listing_id || `AMP-${listing.$id.slice(-6).toUpperCase()}`;

  // ----------------------------------------------------
  // HANDLE BID
  // ----------------------------------------------------
  const handleBid = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn) {
      router.push("/login");
      return;
    }

    if (!isLive) {
      setError("Auction not live.");
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setError("Enter a valid number.");
      return;
    }

    if (amount < minimumAllowed) {
      setError(`Minimum bid is £${minimumAllowed.toLocaleString()}`);
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.$id,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setListing(data.updatedListing);
      setSuccess("Bid placed successfully!");
      setBidAmount("");
    } catch (err: any) {
      setError(err.message || "Failed to place bid.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // HANDLE BUY NOW (with confirmation)
  // ----------------------------------------------------
  const handleBuyNow = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn) {
      router.push("/login");
      return;
    }

    if (!isLive) {
      setError("Auction not live.");
      return;
    }

    if (!buyNowPrice) {
      setError("Buy Now is not available for this listing.");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to use Buy Now and purchase ${listing.registration} for £${buyNowPrice.toLocaleString()}?\n\nThis will end the auction immediately and commit you to the purchase.`
    );
    if (!ok) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.$id,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error
      }

      if (!res.ok) {
        throw new Error(
          data?.error || `Buy Now failed (HTTP ${res.status}).`
        );
      }

      if (data?.updatedListing) {
        setListing(data.updatedListing);
      }

      setSuccess(
        "Buy Now successful. This plate is now sold and we’ll contact you to complete payment and DVLA transfer."
      );
    } catch (err: any) {
      console.error("Buy Now error:", err);
      setError(err.message || "Buy Now failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F5F5F5] py-8 px-4">
      {/* BACK */}
      <div className="max-w-4xl mx-auto mb-4">
        <Link
          href="/current-listings"
          className="text-blue-700 underline text-sm"
        >
          ← Back
        </Link>
      </div>

            {/* PLATE HERO (no external image) */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="relative mx-auto w-full max-w-[520px] aspect-[16/9] rounded-3xl border-[3px] border-black bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Glow / road shadow */}
          <div className="absolute inset-x-8 bottom-6 h-2 bg-black/40 blur-lg rounded-full" />

          {/* Simple car hint: roof line */}
          <div className="absolute inset-x-16 top-8 h-10 rounded-full border-2 border-slate-500/80" />

          {/* Number plate */}
          <div className="relative">
            <div className="bg-[#FFD500] text-black font-extrabold tracking-[0.18em] text-lg sm:text-2xl px-6 sm:px-8 py-2 sm:py-3 rounded-md border-[3px] border-black shadow-[0_8px_0_rgba(0,0,0,0.6)] text-center">
              {listing.registration}
            </div>
          </div>

          {/* Front bumper bar behind plate */}
          <div className="absolute inset-x-20 bottom-10 h-3 bg-slate-700 rounded-full opacity-70" />
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-500">
          Registration shown for illustration &mdash; vehicle image is for display only.
        </p>
      </div>

      {/* PANEL */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-300 shadow-sm p-6 space-y-8">
        <div className="flex justify-end gap-2">
          {isLive && (
            <span className="px-4 py-1 bg-[#FFD500] border border-black rounded-full font-bold text-sm">
              LIVE
            </span>
          )}
          {isComing && (
            <span className="px-4 py-1 bg-gray-200 text-gray-700 rounded-full font-bold text-sm">
              Queued
            </span>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase">Listing ID</p>
          <p className="font-bold text-lg">{displayId}</p>

          <h2 className="text-4xl font-extrabold text-green-700 mt-4">
            £{effectiveBaseBid.toLocaleString()}
          </h2>
          <p className="text-gray-700">Current Bid</p>

          <p className="mt-4 font-semibold text-lg">
            {bidsCount} {bidsCount === 1 ? "Bid" : "Bids"}
          </p>

          {reserveMet && (
            <p className="mt-2 font-bold text-green-700">Reserve Met</p>
          )}

          {buyNowPrice && (
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Buy Now available: £{buyNowPrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* TIMER */}
        <div>
          <p className="text-xs text-gray-500 uppercase">Auction Ends In</p>
          <div className="inline-block mt-1 px-3 py-2 bg-white border border-black rounded-lg shadow-sm font-semibold text-black">
            <AuctionTimer
              mode={isLive ? "live" : "coming"}
              endTime={listing.auction_end ?? undefined}
            />
          </div>
        </div>

        {/* BID + BUY NOW PANEL */}
        <div className="bg-white border border-black rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-xl font-bold">Place Your Bid</h3>

          <p className="text-sm text-gray-700">
            There will be an £80.00 fee added to all winning bids to process
            DVLA paperwork (auctionmyplate.co.uk has no affiliation with DVLA).
          </p>

          {error && (
            <p className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">
              {error}
            </p>
          )}

          {success && (
            <p className="bg-green-50 text-green-700 border border-green-200 p-3 rounded">
              {success}
            </p>
          )}

          <p className="text-sm text-gray-700">
            Minimum bid:{" "}
            <strong>£{minimumAllowed.toLocaleString()}</strong>
          </p>

          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            min={minimumAllowed}
            placeholder={`£${minimumAllowed.toLocaleString()}`}
            className="w-full border border-black rounded-lg p-3 text-lg text-center"
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={handleBid}
              disabled={!isLive || submitting}
              className={`flex-1 rounded-lg py-3 text-lg font-semibold text-white ${
                isLive
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isLive
                ? submitting
                  ? "Processing…"
                  : "Place Bid"
                : "Auction Not Live"}
            </button>

            {buyNowPrice && (
              <button
                onClick={handleBuyNow}
                disabled={!isLive || submitting}
                className={`flex-1 rounded-lg py-3 text-lg font-semibold ${
                  isLive
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                {isLive
                  ? submitting
                    ? "Processing Buy Now…"
                    : `Buy Now £${buyNowPrice.toLocaleString()}`
                  : "Buy Now Unavailable"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
