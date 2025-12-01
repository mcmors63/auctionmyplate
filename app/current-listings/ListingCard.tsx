// app/current-listings/ListingCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuctionTimer from "./AuctionTimer";
import NumberPlate from "@/components/ui/NumberPlate";

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
  start_time?: string | null;
  end_time?: string | null;

  sold_price?: number | null;
  sale_status?: string | null;
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
    start_time,
    end_time,
    sold_price,
    sale_status,
  } = listing;

  // -----------------------------
  // Status flags
  // -----------------------------
  const lowerStatus = (status || "").toLowerCase();
  const saleStatusLower = (sale_status || "").toLowerCase();

  const isLiveStatus = lowerStatus === "live";
  const isQueuedStatus = lowerStatus === "queued";

  const isSold =
    lowerStatus === "sold" ||
    saleStatusLower === "sold" ||
    (typeof sold_price === "number" && sold_price > 0);

  // Work out if auction end time is in the past
  const rawEnd = auction_end ?? end_time ?? null;
  let auctionEnded = false;
  if (rawEnd) {
    const endMs = Date.parse(rawEnd);
    if (Number.isFinite(endMs)) {
      auctionEnded = endMs <= Date.now();
    }
  }

  // Treat something as "live" on the card ONLY if status is live AND it hasn't ended
  const isLive = isLiveStatus && !auctionEnded && !isSold;
  const isQueued = isQueuedStatus && !auctionEnded && !isSold;

  const timerLabel = isSold
    ? "SOLD"
    : auctionEnded
    ? "AUCTION ENDED"
    : isLive
    ? "AUCTION ENDS IN"
    : "AUCTION STARTS IN";

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
  const isNew = ageMs !== null && ageMs < 86400000; // 24h
  const showNewBadge = isNew && !isSold && !auctionEnded;

  // -----------------------------
  // Reserve status
  // -----------------------------
  const numericCurrentBid = current_bid ?? 0;
  const hasReserve =
    typeof reserve_price === "number" && reserve_price > 0;
  const reserveMet =
    hasReserve && numericCurrentBid >= (reserve_price as number);

  // -----------------------------
  // Buy Now visibility
  // -----------------------------
  const hasBuyNow =
    !isSold &&
    !auctionEnded &&
    isLive &&
    typeof buy_now === "number" &&
    buy_now > 0 &&
    numericCurrentBid < buy_now;

  // Can user still bid from this card?
  const canBid = isLive && !isSold && !auctionEnded;

  const displayId =
    listing_id || `AMP-${$id.slice(-6).toUpperCase()}`;

  return (
    <div className="bg-white text-gray-900 border border-gold/40 rounded-xl shadow-md p-4 flex flex-col gap-3 transition hover:shadow-lg w-full">
      {/* HEADER */}
      <div className="flex flex-col xs:flex-row justify-between gap-2 items-start">
        {/* Listing ID */}
        <div>
          <p className="text-[9px] text-gold">Listing ID</p>
          <p className="font-semibold text-[12px] max-w-[160px] truncate">
            {displayId}
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
          {isSold && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded-full">
              SOLD
            </span>
          )}

          {!isSold && isLive && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-gold text-black rounded-full">
              LIVE
            </span>
          )}

          {!isSold && isQueued && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 text-gray-700 rounded-full">
              COMING SOON
            </span>
          )}

          {!isSold && auctionEnded && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-gray-300 text-gray-800 rounded-full">
              ENDED
            </span>
          )}

          {showNewBadge && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-full">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* FRONT + REAR PLATES */}
      <div className="flex flex-col items-center gap-3 py-3 bg-gray-100 rounded-lg border border-gold/20">
        <div className="w-full flex flex-col gap-2 px-2">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[9px] text-gray-600 uppercase tracking-wide">
              FRONT
            </p>
            <NumberPlate
              reg={registration || ""}
              variant="front"
              size="card"
              showBlueBand
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[9px] text-gray-600 uppercase tracking-wide">
              REAR
            </p>
            <NumberPlate
              reg={registration || ""}
              variant="rear"
              size="card"
              showBlueBand
            />
          </div>
        </div>
      </div>

      {/* TIMER + BID INFO */}
      <div className="flex flex-col gap-3">
        {/* TIMER BLOCK */}
        <div className="w-full">
          <p className="text-[9px] text-gray-500 mb-0.5">{timerLabel}</p>
          <div className="px-3 py-1.5 bg-white border border-gold rounded-lg shadow-sm inline-block min-w-[180px]">
            {isSold ? (
              <span className="text-[10px] font-semibold text-red-700">
                Sold – bidding closed
              </span>
            ) : auctionEnded ? (
              <span className="text-[10px] font-semibold text-gray-700">
                Auction ended
              </span>
            ) : isLive || isQueued ? (
              <AuctionTimer
                mode={isLive ? "live" : "coming"}
                endTime={
                  isLive
                    ? rawEnd ?? undefined
                    : auction_start ?? start_time ?? undefined
                }
              />
            ) : (
              <span className="text-[10px]">No active auction</span>
            )}
          </div>
        </div>

        {/* BID / BUY NOW / BIDS COUNT */}
        <div className="flex flex-col xs:flex-row justify-between gap-2 items-start xs:items-end">
          {/* Bid + reserve + buy now */}
          <div className="text-left xs:text-right flex-1">
            <p className="text-[9px] text-gold">Bid</p>
            {isSold ? (
              <p className="font-bold text-gray-600 text-sm">Sold</p>
            ) : (
              <p className="font-bold text-gold text-sm">
                £{numericCurrentBid.toLocaleString()}
              </p>
            )}

            {reserveMet && !isSold && (
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

        {canBid ? (
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
