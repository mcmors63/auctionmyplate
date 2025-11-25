// app/current-listings/ListingCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminAuctionTimer from "@/components/ui/AdminAuctionTimer";

type Listing = {
  $id: string;
  $createdAt?: string;
  listing_id?: string;
  registration?: string;
  status?: string;
  current_bid?: number | null;
  bids?: number | null;
  reserve_price?: number | null; // ✅ pull from Appwrite
  buy_now?: number | null;       // ✅ NEW: Buy Now price
  auction_start?: string | null;
  auction_end?: string | null;
};

type Props = {
  listing: Listing;
};

export default function ListingCard({ listing }: Props) {
  const {
    $id,
    $createdAt,
    listing_id,
    registration,
    status,
    current_bid,
    bids,
    reserve_price,
    buy_now,
    auction_start,
    auction_end,
  } = listing;

  // -----------------------------
  // Status flags
  // -----------------------------
  const isLive = status?.toLowerCase() === "live";
  const isQueued = status?.toLowerCase() === "queued";

  const timerLabel = isLive ? "AUCTION ENDS IN" : "AUCTION STARTS IN";

  // -----------------------------
  // "NEW" badge logic
  // -----------------------------
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const createdMs = $createdAt ? new Date($createdAt).getTime() : null;
  const ageMs = createdMs ? now - createdMs : null;
  const isNew = ageMs !== null && ageMs < 86400000; // 24 hours

  // -----------------------------
  // Reserve status (display only)
  // -----------------------------
  const numericCurrentBid = current_bid ?? 0;
  const hasReserve =
    typeof reserve_price === "number" && reserve_price > 0;
  const reserveMet =
    hasReserve && numericCurrentBid >= (reserve_price as number);

  // -----------------------------
  // Buy Now display logic
  // -----------------------------
  const hasBuyNow =
    isLive && typeof buy_now === "number" && buy_now > 0;

  return (
    <div className="bg-white text-gray-900 border border-gold/40 rounded-xl shadow-md p-4 flex flex-col gap-3 transition hover:shadow-lg">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] text-gold">Listing ID</p>
          <p className="font-semibold text-[12px] max-w-[130px] truncate">
            {listing_id || $id}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] text-gold">Reg</p>
          <p className="font-bold text-base tracking-wide">
            {registration}
          </p>
        </div>

        {/* BADGES */}
        <div className="flex flex-col items-end gap-1">
          {isLive && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-gold text-black rounded-full">
              LIVE
            </span>
          )}

          {isQueued && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 text-gray-700 rounded-full">
              COMING
            </span>
          )}

          {isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-full">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* PLATE PREVIEW */}
      <div className="flex flex-col items-center gap-2 py-2 bg-gray-100 rounded-lg border border-gold/20">
        <div className="bg-white text-black font-extrabold tracking-[0.12em] text-xl px-3 py-1.5 rounded-md border border-gray-400 shadow-sm">
          {registration}
        </div>

        <div className="bg-yellow-300 text-black font-extrabold tracking-[0.12em] text-xl px-3 py-1.5 rounded-md border border-yellow-600 shadow-sm">
          {registration}
        </div>
      </div>

      {/* TIMER + BID INFO */}
      <div className="flex justify-between items-center w-full">
        {/* TIMER */}
        <div>
          <p className="text-[9px] text-gray-500">{timerLabel}</p>

          <div className="px-3 py-1.5 bg-white border border-gold rounded-lg shadow-sm">
            <AdminAuctionTimer
              start={auction_start}
              end={auction_end}
              status={status}
            />
          </div>
        </div>

        {/* BID AMOUNT + RESERVE / BUY NOW */}
        <div className="text-right ml-2">
          <p className="text-[9px] text-gold">Bid</p>
          <p className="font-bold text-gold text-sm">
            £{numericCurrentBid.toLocaleString()}
          </p>

          {/* ✅ Only ever show positive "Reserve Met" */}
          {reserveMet && (
            <p className="text-[9px] text-green-700 font-semibold mt-1">
              Reserve Met
            </p>
          )}

          {/* ✅ Show Buy Now only when live and > 0 */}
          {hasBuyNow && (
            <p className="text-[9px] text-emerald-700 font-semibold mt-1">
              Buy Now: £{buy_now!.toLocaleString()}
            </p>
          )}

          <p className="text-[8px] text-gray-500 mt-1 leading-tight max-w-[120px]">
            £80 DVLA paperwork fee added to all winning bids.
          </p>
        </div>

        {/* BID COUNT */}
        <div className="text-right">
          <p className="text-[9px] text-gold">Bids</p>
          <p className="font-semibold text-sm">{bids || 0}</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center pt-1">
        <Link
          href={`/place_bid?id=${$id}`}
          className="text-blue-600 underline text-[12px]"
        >
          View
        </Link>

        {isLive ? (
          <Link
            href={`/place_bid?id=${$id}`}
            className="bg-gold text-black px-3 py-1.5 rounded-md font-bold text-[12px] shadow-sm hover:bg-yellow-400 transition"
          >
            Bid
          </Link>
        ) : (
          <Link
            href={`/place_bid?id=${$id}`}
            className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md font-bold text-[12px] shadow-sm hover:bg-gray-300 transition"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
