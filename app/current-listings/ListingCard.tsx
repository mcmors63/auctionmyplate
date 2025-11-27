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
  reserve_price?: number | null;
  buy_now?: number | null;
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
  const lowerStatus = (status || "").toLowerCase();
  const isLive = lowerStatus === "live";
  const isQueued = lowerStatus === "queued";

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

  // -----------------------------
  // Timer status for AdminAuctionTimer
  // -----------------------------
  let timerStatus: "queued" | "live" | "ended" | undefined;
  if (
    lowerStatus === "queued" ||
    lowerStatus === "live" ||
    lowerStatus === "ended"
  ) {
    timerStatus = lowerStatus as "queued" | "live" | "ended";
  }

  return (
    <div className="bg-white text-gray-900 border border-gold/40 rounded-xl shadow-md p-4 flex flex-col gap-3 transition hover:shadow-lg w-full">
      {/* HEADER */}
      <div className="flex flex-col xs:flex-row justify-between gap-2 items-start">
        {/* Listing ID */}
        <div>
          <p className="text-[9px] text-gold">Listing ID</p>
          <p className="font-semibold text-[12px] max-w-[160px] truncate">
            {listing_id || $id}
          </p>
        </div>

        {/* Reg */}
        <div className="ml-auto text-right">
          <p className="text-[9px] text-gold">Reg</p>
          <p className="font-bold text-base tracking-wide">
            {registration}
          </p>
        </div>

        {/* BADGES */}
        <div className="flex flex-row xs:flex-col items-end gap-1 xs:ml-2">
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
      <div className="flex flex-col items-center gap-1.5 py-2 bg-gray-100 rounded-lg border border-gold/20">
        {/* Front plate */}
        <div className="bg-white text-black font-extrabold tracking-[0.12em] text-lg sm:text-xl px-3 py-1.5 rounded-md border border-gray-400 shadow-sm w-full max-w-[260px] text-center">
          {registration}
        </div>

        {/* Rear plate */}
        <div className="bg-yellow-300 text-black font-extrabold tracking-[0.12em] text-lg sm:text-xl px-3 py-1.5 rounded-md border border-yellow-600 shadow-sm w-full max-w-[260px] text-center">
          {registration}
        </div>
      </div>

      {/* TIMER + BID INFO – STACK ON MOBILE */}
      <div className="flex flex-col gap-3">
        {/* TIMER BLOCK */}
        <div className="w-full">
          <p className="text-[9px] text-gray-500 mb-0.5">{timerLabel}</p>
          <div className="px-3 py-1.5 bg-white border border-gold rounded-lg shadow-sm inline-block min-w-[180px]">
            <AdminAuctionTimer
              start={auction_start ?? null}
              end={auction_end ?? null}
              status={timerStatus}
            />
          </div>
        </div>

        {/* BID / BUY NOW / BIDS COUNT */}
        <div className="flex flex-col xs:flex-row justify-between gap-2 items-start xs:items-end">
          {/* Bid + reserve + buy now */}
          <div className="text-left xs:text-right flex-1">
            <p className="text-[9px] text-gold">Bid</p>
            <p className="font-bold text-gold text-sm">
              £{numericCurrentBid.toLocaleString()}
            </p>

            {reserveMet && (
              <p className="text-[9px] text-green-700 font-semibold mt-1">
                Reserve Met
              </p>
            )}

            {hasBuyNow && (
              <p className="text-[9px] text-emerald-700 font-semibold mt-1">
                Buy Now: £{buy_now!.toLocaleString()}
              </p>
            )}

            <p className="text-[8px] text-gray-500 mt-1 leading-tight max-w-[200px]">
              £80 DVLA paperwork fee added to all winning bids.
            </p>
          </div>

          {/* Bid count */}
          <div className="text-right min-w-[50px]">
            <p className="text-[9px] text-gold">Bids</p>
            <p className="font-semibold text-sm">{bids || 0}</p>
          </div>
        </div>
      </div>

      {/* FOOTER BUTTONS */}
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
