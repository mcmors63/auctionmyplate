// app/place_bid/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Client, Databases, Account } from "appwrite";
import Link from "next/link";
import AdminAuctionTimer from "@/components/ui/AdminAuctionTimer";
import DvlaPlate from "./DvlaPlate";

// ----------------------------------------------------
// Constants
// ----------------------------------------------------
const DVLA_FEE_GBP = 80; // £80 paperwork fee

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

  // Support both old + new names just in case
  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Stripe payment method state
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [checkingPaymentMethod, setCheckingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(
    null
  );

  // ----------------------------------------------------
  // LOGIN CHECK – localStorage first (navbar), then Appwrite
  // ----------------------------------------------------
  useEffect(() => {
    const checkLogin = async () => {
      // 1) LocalStorage – same as navbar
      if (typeof window !== "undefined") {
        const storedEmail = window.localStorage.getItem("amp_user_email");
        const storedId = window.localStorage.getItem("amp_user_id");
        if (storedEmail) {
          setLoggedIn(true);
          setUserEmail(storedEmail);
          if (storedId) setUserId(storedId);
          return;
        }
      }

      // 2) Fallback: real Appwrite session
      try {
        const current = await account.get();
        setLoggedIn(true);
        setUserEmail(current.email);
        setUserId(current.$id);

        if (typeof window !== "undefined") {
          window.localStorage.setItem("amp_user_email", current.email);
          window.localStorage.setItem("amp_user_id", current.$id);
        }
      } catch {
        setLoggedIn(false);
        setUserEmail(null);
        setUserId(null);
      }
    };

    checkLogin();
  }, []);

  // ----------------------------------------------------
  // STRIPE – CHECK SAVED PAYMENT METHOD
  // ----------------------------------------------------
  useEffect(() => {
    const checkPaymentMethod = async () => {
      if (!loggedIn || !userEmail) {
        setHasPaymentMethod(null);
        return;
      }

      setCheckingPaymentMethod(true);
      setPaymentMethodError(null);

      try {
        const res = await fetch("/api/stripe/has-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail, userId }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.error || "Could not verify your payment method."
          );
        }

        setHasPaymentMethod(Boolean(data.hasPaymentMethod));
      } catch (err: any) {
        console.error("has-payment-method error:", err);
        setPaymentMethodError(
          err.message || "Could not verify your payment method."
        );
        setHasPaymentMethod(null);
      } finally {
        setCheckingPaymentMethod(false);
      }
    };

    checkPaymentMethod();
  }, [loggedIn, userEmail, userId]);

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

  const hasReserve =
    typeof listing.reserve_price === "number" && listing.reserve_price > 0;
  const reserveMet =
    hasReserve && effectiveBaseBid >= (listing.reserve_price as number);

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

  // Timer props for AdminAuctionTimer – match current-listings card
  const auctionStart =
    listing.auction_start ?? listing.start_time ?? null;

  const auctionEnd =
    listing.auction_end ?? listing.end_time ?? null;

  // ---- NEW: detect if the auction has actually ended based on time ----
  const auctionEndMs = auctionEnd ? Date.parse(auctionEnd) : null;
  const auctionEnded =
    auctionEndMs !== null && Number.isFinite(auctionEndMs)
      ? auctionEndMs <= Date.now()
      : false;

  // Only allow bidding / buy now when status is live AND end time is in future
  const canBidOrBuyNow = isLive && !auctionEnded;

  // Timer label + status
  let timerLabel: string;
  if (auctionEnded) {
    timerLabel = "AUCTION ENDED";
  } else if (isLive) {
    timerLabel = "AUCTION ENDS IN";
  } else {
    timerLabel = "AUCTION STARTS IN";
  }

  const timerStatus: "queued" | "live" | "ended" =
    auctionEnded ? "ended" : isLive ? "live" : isComing ? "queued" : "ended";

  const paymentBlocked =
    loggedIn &&
    !checkingPaymentMethod &&
    hasPaymentMethod === false &&
    !paymentMethodError;

  // ----------------------------------------------------
  // HANDLE BID
  // ----------------------------------------------------
  const handleBid = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !userEmail) {
      setError("You must be logged in to place a bid.");
      return;
    }

    if (paymentBlocked) {
      setError("You must add a payment method before placing a bid.");
      return;
    }

    if (!canBidOrBuyNow) {
      setError("Auction has already ended.");
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
          userEmail,
          userId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.requiresPaymentMethod) {
          setHasPaymentMethod(false);
        }
        throw new Error(data.error || "Failed to place bid.");
      }

      if (data.updatedListing) {
        setListing(data.updatedListing);
      }
      setSuccess("Bid placed successfully!");
      setBidAmount("");
    } catch (err: any) {
      setError(err.message || "Failed to place bid.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // HANDLE BUY NOW – CHARGE CARD VIA STRIPE, THEN MARK SOLD
  // ----------------------------------------------------
  const handleBuyNow = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !userEmail) {
      setError("You must be logged in to use Buy Now.");
      return;
    }

    if (paymentBlocked) {
      setError("You must add a payment method before using Buy Now.");
      return;
    }

    if (!canBidOrBuyNow) {
      setError("Auction has already ended.");
      return;
    }

    if (!buyNowPrice) {
      setError("Buy Now is not available for this listing.");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to use Buy Now and purchase ${
        listing.registration
      } for £${buyNowPrice.toLocaleString()}?\n\nAn £${DVLA_FEE_GBP.toFixed(
        2
      )} DVLA paperwork fee will be added.\nThis will end the auction immediately and commit you to the purchase.`
    );
    if (!ok) return;

    try {
      setSubmitting(true);

      // 1) Charge card via Stripe (off-session, saved payment method)
      const totalWithDvla = buyNowPrice + DVLA_FEE_GBP; // GBP
      const amountInPence = Math.round(totalWithDvla * 100);

      const stripeRes = await fetch("/api/stripe/charge-off-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          amountInPence,
          description: `Buy Now - ${
            listing.registration || displayId
          } (incl. £${DVLA_FEE_GBP} DVLA fee)`,
          metadata: {
            listingId: listing.$id,
            type: "buy_now",
          },
        }),
      });

      const stripeData = await stripeRes.json().catch(() => ({} as any));

      if (!stripeRes.ok || !stripeData.ok) {
        if (stripeData?.requiresPaymentMethod) {
          setHasPaymentMethod(false);
        }
        throw new Error(
          stripeData?.error ||
            "Your card could not be charged. Please check your payment method."
        );
      }

      const paymentIntentId: string | undefined =
        stripeData.paymentIntentId || stripeData.paymentIntentID;

      // 2) Tell backend to mark the plate as sold & create transaction
      const res = await fetch("/api/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.$id,
          userEmail,
          userId,
          paymentIntentId,
          totalCharged: totalWithDvla,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        console.error("Buy Now backend error after Stripe charge:", data);
        throw new Error(
          data.error ||
            "Payment succeeded but we could not mark the plate as sold. Please contact support immediately."
        );
      }

      if (data.updatedListing) {
        setListing(data.updatedListing);
      }

      setSuccess(
        "Buy Now successful. Your card has been charged and this plate is now sold. We’ll contact you to complete DVLA transfer."
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
      {/* BACK LINK */}
      <div className="max-w-4xl mx-auto mb-4">
        <Link
          href="/current-listings"
          className="text-blue-700 underline text-sm"
        >
          ← Back
        </Link>
      </div>

      {/* DVLA-STYLE PLATE HERO */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="relative overflow-hidden rounded-2xl border border-black/40 shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-7 sm:px-10 sm:py-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Soft glows */}
          <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-yellow-500/20 blur-3xl" />

          {/* DVLA-style plate ONLY */}
          <div className="relative z-10 flex-1 flex flex-col items-center">
            <DvlaPlate registration={listing.registration} />
          </div>

          {/* Right-hand summary */}
          <div className="relative z-10 hidden sm:flex flex-col items-end text-right text-gray-200 text-xs gap-2">
            <div>
              <p className="uppercase tracking-[0.18em] text-[10px] text-gray-400">
                Listing ID
              </p>
              <p className="text-sm font-semibold">{displayId}</p>
            </div>

            <div className="mt-2">
              <p className="uppercase tracking-[0.18em] text-[10px] text-gray-400">
                Current bid
              </p>
              <p className="text-sm font-semibold">
                £{effectiveBaseBid.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-300 shadow-sm p-6 space-y-8">
        {/* Status pills */}
        <div className="flex justify-end gap-2">
          {canBidOrBuyNow && (
            <span className="px-4 py-1 bg-[#FFD500] border border-black rounded-full font-bold text-sm">
              LIVE
            </span>
          )}
          {isComing && !auctionEnded && (
            <span className="px-4 py-1 bg-gray-200 text-gray-700 rounded-full font-bold text-sm">
              Queued
            </span>
          )}
          {auctionEnded && (
            <span className="px-4 py-1 bg-gray-300 text-gray-800 rounded-full font-bold text-sm">
              ENDED
            </span>
          )}
        </div>

        {/* Listing summary */}
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

          {buyNowPrice && canBidOrBuyNow && (
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Buy Now available: £{buyNowPrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* TIMER SECTION – uses same AdminAuctionTimer as listing cards */}
        <div>
          <p className="text-xs text-gray-500 uppercase">{timerLabel}</p>
          <div className="inline-block mt-1 px-3 py-2 bg-white border border-black rounded-lg shadow-sm font-semibold text-black">
            <AdminAuctionTimer
              start={auctionStart}
              end={auctionEnd}
              status={timerStatus}
            />
          </div>
        </div>

        {/* BID / LOGIN PANEL */}
        <div className="bg-white border border-black rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-xl font-bold">Place Your Bid</h3>

          <p className="text-sm text-gray-700">
            There will be an £80.00 fee added to all winning bids to process
            DVLA paperwork (auctionmyplate.co.uk has no affiliation with DVLA).
          </p>

          {/* Payment method banners (only when logged in) */}
          {loggedIn && (
            <div className="space-y-2 mt-2">
              {checkingPaymentMethod && (
                <p className="text-xs text-gray-600">
                  Checking your saved payment method…
                </p>
              )}

              {paymentMethodError && (
                <p className="bg-red-50 text-red-700 border border-red-200 p-2 rounded text-xs">
                  {paymentMethodError}
                </p>
              )}

              {hasPaymentMethod === false &&
                !checkingPaymentMethod &&
                !paymentMethodError && (
                  <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-3 rounded text-xs">
                    <p className="font-semibold">Action needed</p>
                    <p className="mt-1">
                      Before you can bid or use Buy Now, you must add a payment
                      method.
                    </p>
                    <Link
                      href="/payment-method"
                      className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
                    >
                      Add / manage payment method
                    </Link>
                  </div>
                )}
            </div>
          )}

          {!loggedIn ? (
            // -----------------------------
            // LOGGED OUT STATE
            // -----------------------------
            <div className="mt-4 border border-yellow-400 bg-[#FFFBE6] rounded-lg p-4 space-y-3">
              <p className="font-semibold text-yellow-800">Log in to bid</p>
              <p className="text-sm text-yellow-900">
                You need an AuctionMyPlate account to place bids and use Buy
                Now.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold text-sm"
                >
                  Register
                </Link>
              </div>
            </div>
          ) : auctionEnded ? (
            // -----------------------------
            // AUCTION ENDED MESSAGE
            // -----------------------------
            <div className="mt-4 border border-red-300 bg-red-50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-800">
                Auction has already ended.
              </p>
              <p className="text-sm text-red-900">
                No further bids or Buy Now purchases can be made on this
                listing.
              </p>
            </div>
          ) : (
            // -----------------------------
            // LOGGED IN STATE (auction live/upcoming)
            // -----------------------------
            <>
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
                  disabled={
                    !canBidOrBuyNow ||
                    submitting ||
                    paymentBlocked ||
                    checkingPaymentMethod
                  }
                  className={`flex-1 rounded-lg py-3 text-lg font-semibold text-white ${
                    canBidOrBuyNow &&
                    !paymentBlocked &&
                    !checkingPaymentMethod
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {canBidOrBuyNow
                    ? submitting
                      ? "Processing…"
                      : paymentBlocked
                      ? "Add Payment Method"
                      : checkingPaymentMethod
                      ? "Checking Payment…"
                      : "Place Bid"
                    : "Auction Not Live"}
                </button>

                {buyNowPrice && (
                  <button
                    onClick={handleBuyNow}
                    disabled={
                      !canBidOrBuyNow ||
                      submitting ||
                      paymentBlocked ||
                      checkingPaymentMethod
                    }
                    className={`flex-1 rounded-lg py-3 text-lg font-semibold ${
                      canBidOrBuyNow &&
                      !paymentBlocked &&
                      !checkingPaymentMethod
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {canBidOrBuyNow
                      ? submitting
                        ? "Processing Buy Now…"
                        : paymentBlocked
                        ? "Add Payment Method"
                        : checkingPaymentMethod
                        ? "Checking Payment…"
                        : `Buy Now £${buyNowPrice.toLocaleString()}`
                      : "Buy Now Unavailable"}
                  </button>
                )}
              </div>

              {/* Link to manage payment method even when allowed */}
              {loggedIn && (
                <div className="mt-3">
                  <Link
                    href="/payment-method"
                    className="text-xs text-blue-700 underline"
                  >
                    Manage payment method
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
