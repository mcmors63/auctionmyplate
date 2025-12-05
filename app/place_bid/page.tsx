// app/place_bid/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Client, Databases, Account } from "appwrite";
import Link from "next/link";
import Image from "next/image";
import NumberPlate from "@/components/ui/NumberPlate";
import DvlaPlate from "./DvlaPlate";

// ----------------------------------------------------
// Constants
// ----------------------------------------------------
const DVLA_FEE_GBP = 80; // £80 paperwork fee
const VEHICLE_NOTICE_KEY_PREFIX = "amp_vehicle_warning_accepted_";

// ----------------------------------------------------
// Appwrite
// ----------------------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const db = new Databases(client);
const account = new Account(client);

const PLATES_DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

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

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  buy_now?: number | null;
  buy_now_price?: number | null;

  description?: string;
  interesting_fact?: string | null;
};

type TimerStatus = "queued" | "live" | "ended";

// ----------------------------------------------------
// SIMPLE LOCAL TIMER
// ----------------------------------------------------
function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function LocalAuctionTimer({
  start,
  end,
  status,
}: {
  start: string | null;
  end: string | null;
  status: TimerStatus;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  let targetStr: string | null = null;

  if (status === "queued") {
    targetStr = start ?? null;
  } else if (status === "live") {
    targetStr = end ?? null;
  }

  if (!targetStr) {
    return <span className="font-mono text-sm">—</span>;
  }

  const targetMs = Date.parse(targetStr);
  if (!Number.isFinite(targetMs)) {
    return <span className="font-mono text-sm">—</span>;
  }

  const diff = targetMs - now;
  const label = diff <= 0 ? "00:00:00" : formatRemaining(diff);

  return <span className="font-mono text-sm">{label}</span>;
}

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

  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(
    null
  );
  const [checkingPaymentMethod, setCheckingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] =
    useState<string | null>(null);

  const [vehicleNoticeAccepted, setVehicleNoticeAccepted] = useState(false);

  // ----------------------------------------------------
  // LOGIN CHECK
  // ----------------------------------------------------
  useEffect(() => {
    const checkLogin = async () => {
      if (typeof window !== "undefined") {
        const storedEmail = window.localStorage.getItem("amp_user_email");
        const storedId = window.localStorage.getItem("amp_user_id");
        if (storedEmail) {
          setLoggedIn(true);
          setUserEmail(storedEmail);
          if (storedId) setUserId(storedId);
        }
      }

      if (!userEmail) {
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
      }
    };

    void checkLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const msg =
          err?.message || "Could not verify your payment method.";

        if (msg.includes("Stripe is not configured on the server")) {
          setPaymentMethodError(null);
          setHasPaymentMethod(null);
        } else {
          setPaymentMethodError(msg);
          setHasPaymentMethod(null);
        }
      } finally {
        setCheckingPaymentMethod(false);
      }
    };

    void checkPaymentMethod();
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

  // ----------------------------------------------------
  // PER-PLATE DVLA NOTICE STATE
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!listing?.$id) return;

    const key = `${VEHICLE_NOTICE_KEY_PREFIX}${listing.$id}`;
    const stored = window.localStorage.getItem(key);
    setVehicleNoticeAccepted(stored === "true");
  }, [listing?.$id]);

  // ----------------------------------------------------
  // EARLY RETURNS
  // ----------------------------------------------------
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
    typeof listing.reserve_price === "number" &&
    listing.reserve_price > 0;
  const reserveMet =
    hasReserve && effectiveBaseBid >= (listing.reserve_price as number);

  const rawBuyNow =
    (listing.buy_now as number | null | undefined) ??
    (listing.buy_now_price as number | null | undefined) ??
    null;

  const buyNowPrice =
    typeof rawBuyNow === "number" && rawBuyNow > 0 ? rawBuyNow : null;

  const isLiveStatus = listing.status === "live";
  const isComingStatus = listing.status === "queued";
  const isSoldStatus = listing.status === "sold";

  const displayId =
    listing.listing_id || `AMP-${listing.$id.slice(-6).toUpperCase()}`;

  const auctionStart = listing.auction_start ?? listing.start_time ?? null;
  const auctionEnd = listing.auction_end ?? listing.end_time ?? null;

  const auctionEndMs = auctionEnd ? Date.parse(auctionEnd) : null;
  const auctionEndedTime =
    auctionEndMs !== null && Number.isFinite(auctionEndMs)
      ? auctionEndMs <= Date.now()
      : false;

  const auctionEnded = auctionEndedTime || isSoldStatus;

  const isSoldForDisplay = isSoldStatus || (auctionEnded && reserveMet);

  const canBidOrBuyNow = isLiveStatus && !auctionEnded;

  const canShowBuyNow =
    buyNowPrice !== null &&
    canBidOrBuyNow &&
    effectiveBaseBid < buyNowPrice;

  let timerLabel: string;
  if (auctionEnded) {
    timerLabel = "AUCTION ENDED";
  } else if (isLiveStatus) {
    timerLabel = "AUCTION ENDS IN";
  } else {
    timerLabel = "AUCTION STARTS IN";
  }

  const timerStatus: TimerStatus =
    auctionEnded
      ? "ended"
      : isLiveStatus
      ? "live"
      : isComingStatus
      ? "queued"
      : "ended";

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

    if (!vehicleNoticeAccepted) {
      setError(
        "Please confirm you have read the DVLA notice before placing a bid."
      );
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
  // HANDLE BUY NOW
  // ----------------------------------------------------
  const handleBuyNow = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !userEmail) {
      setError("You must be logged in to use Buy Now.");
      return;
    }

    if (!vehicleNoticeAccepted) {
      setError(
        "Please confirm you have read the DVLA notice before using Buy Now."
      );
      return;
    }

    if (paymentBlocked) {
      setError("You must add a payment method before using Buy Now.");
      return;
    }

    if (!canBidOrBuyNow || !canShowBuyNow) {
      setError("Buy Now is no longer available on this listing.");
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

      const totalWithDvla = buyNowPrice + DVLA_FEE_GBP;
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

      {/* CAR HERO + NUMBER PLATE – mobile friendly */}
<div className="max-w-4xl mx-auto mb-6">
  <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
    <div className="relative w-full aspect-[16/9]">
      <Image
        src="/car-rear.jpg"
        alt={`Rear of car with registration ${listing.registration || ""}`}
        width={1600}
        height={1067}
        className="w-full h-full object-cover"
        priority
      />

      {/* DESKTOP / TABLET – plate over the car */}
      <div
        className="hidden md:block absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "29%" }}
      >
        <div
          style={{
            transform: "scale(0.42)",
            transformOrigin: "center bottom",
          }}
        >
          <NumberPlate
            reg={listing.registration || ""}
            size="large"
            variant="rear"
            showBlueBand={true}
          />
        </div>
      </div>
    </div>
  </div>

  {/* MOBILE – plate below the car, not covering it */}
  <div className="mt-4 flex justify-center md:hidden">
    <div
      style={{
        transform: "scale(0.85)",
        transformOrigin: "center",
      }}
    >
      <NumberPlate
        reg={listing.registration || ""}
        size="large"
        variant="rear"
        showBlueBand={true}
      />
    </div>
  </div>
</div>


                <div className="mt-3 flex justify-between text-sm text-gray-600">
          <span>Listing ID: {displayId}</span>
        </div>

        {/* MAIN PANEL */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-300 shadow-sm p-6 space-y-8">

        {/* Header: registration + plate preview */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-yellow-600">
              {listing?.registration || "Registration"}
            </h1>
            <p className="text-xs text-gray-400">
              Auction ID: {listing?.listing_id || listing?.$id}
            </p>
          </div>

          <div className="w-full sm:w-72 flex justify-end">
            <DvlaPlate
              registration={listing?.registration || ""}
              size="large"
              variant="rear"
            />
          </div>
        </div>

        {/* Status pills */}
        <div className="flex justify-end gap-2">
          {isSoldForDisplay && (
            <span className="px-4 py-1 bg-red-700 text-white rounded-full font-bold text-sm">
              SOLD
            </span>
          )}

          {!isSoldForDisplay && canBidOrBuyNow && (
            <span className="px-4 py-1 bg-[#FFD500] border border-black rounded-full font-bold text-sm">
              LIVE
            </span>
          )}

          {!isSoldForDisplay && isComingStatus && !auctionEnded && (
            <span className="px-4 py-1 bg-gray-200 text-gray-700 rounded-full font-bold text-sm">
              Queued
            </span>
          )}

          {!isSoldForDisplay && auctionEnded && (
            <span className="px-4 py-1 bg-gray-300 text-gray-800 rounded-full font-bold text-sm">
              ENDED
            </span>
          )}
        </div>

        {/* Listing summary */}
        <div>
          <p className="text-xs text-gray-500 uppercase">Listing ID</p>
          <p className="font-bold text-lg">{displayId}</p>

          <h2
            className={`text-4xl font-extrabold mt-4 ${
              isSoldForDisplay ? "text-red-700" : "text-green-700"
            }`}
          >
            £{effectiveBaseBid.toLocaleString()}
          </h2>
          <p className="text-gray-700">
            {isSoldForDisplay ? "Winning bid" : "Current Bid"}
          </p>

          <p className="mt-4 font-semibold text-lg">
            {bidsCount} {bidsCount === 1 ? "Bid" : "Bids"}
          </p>

          {reserveMet && (
            <p className="mt-2 font-bold text-green-700">Reserve Met</p>
          )}

          {canShowBuyNow && (
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Buy Now available: £{buyNowPrice!.toLocaleString()}
            </p>
          )}
        </div>

        {/* TIMER SECTION */}
        <div>
          <p className="text-xs text-gray-500 uppercase">{timerLabel}</p>
          <div className="inline-block mt-1 px-3 py-2 bg-white border border-black rounded-lg shadow-sm font-semibold text-black">
            <LocalAuctionTimer
              start={auctionStart}
              end={auctionEnd}
              status={timerStatus}
            />
          </div>
        </div>

        {/* BID / LOGIN PANEL */}
        <div className="bg-white border border-black rounded-xl p-6 shadow-sm space-y-4">
          {/* ...rest of your existing content (unchanged)... */}

          <p className="text-sm text-gray-700">
            There will be an £80.00 fee added to all winning bids to process
            DVLA paperwork (auctionmyplate.co.uk has no affiliation with
            DVLA).
          </p>

          {/* DVLA / MOT WARNING */}
          <div className="mt-3 border border-yellow-400 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-900">
            <p className="font-semibold">Important notice</p>
            <p className="mt-1">
              Please be advised that this plate must go onto a vehicle which is{" "}
              <strong>taxed</strong> and holds a{" "}
              <strong>current MOT (if required)</strong>. Once the plate is
              transferred onto a vehicle, the registered keeper will become the
              legal owner and can then request a retention certificate.
            </p>
            {loggedIn && !vehicleNoticeAccepted && (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={vehicleNoticeAccepted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setVehicleNoticeAccepted(checked);

                    if (typeof window !== "undefined" && listing?.$id) {
                      const key = `${VEHICLE_NOTICE_KEY_PREFIX}${listing.$id}`;
                      window.localStorage.setItem(
                        key,
                        checked ? "true" : "false"
                      );
                    }
                  }}
                />
                <span>I understand and accept this notice.</span>
              </label>
            )}
            {loggedIn && vehicleNoticeAccepted && (
              <p className="mt-2 text-xs text-green-700 font-semibold">
                Notice accepted for this plate. You won&apos;t be asked again
                when bidding on this plate from this device.
              </p>
            )}
          </div>

          {/* Payment method banners */}
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
            // LOGGED OUT
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
            // AUCTION ENDED / SOLD
            <div className="mt-4 border border-red-300 bg-red-50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-800">
                {isSoldForDisplay
                  ? "This plate has been sold."
                  : "Auction has already ended."}
              </p>
              <p className="text-sm text-red-900">
                No further bids or Buy Now purchases can be made on this
                listing.
              </p>
            </div>
          ) : (
            // LOGGED IN, LIVE/UPCOMING
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

                {canShowBuyNow && (
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
                        : `Buy Now £${buyNowPrice!.toLocaleString()}`
                      : "Buy Now Unavailable"}
                  </button>
                )}
              </div>

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

      {/* DESCRIPTION + HISTORY */}
      <div className="max-w-4xl mx-auto mt-6 mb-10 space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-2">Description</h3>
          <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-800 whitespace-pre-line">
            {listing.description || "No description has been added yet."}
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold mb-2">
            Plate history &amp; interesting facts
          </h3>
          <div className="border rounded-lg p-3 bg-white text-sm text-gray-800 whitespace-pre-line">
            {listing.interesting_fact ||
              "No extra history or interesting facts have been added yet."}
          </div>
        </div>
      </div>
    </div>
  );
}
