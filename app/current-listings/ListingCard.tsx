// app/current-listings/ListingCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuctionTimer from "./AuctionTimer";
import NumberPlate from "@/components/ui/NumberPlate";
import { formatDvlaRegistration } from "@/lib/formatDvlaRegistration";

type Listing = {
  $id: string;
  $createdAt?: string;
  listing_id?: string;
  registration?: string;
  status?: string;

  // These often end up as strings from Appwrite, so allow both
  current_bid?: number | string | null;
  bids?: number | null;
  reserve_price?: number | null;
  buy_now?: number | string | null;

  auction_start?: string | null;
  auction_end?: string | null;

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
    sold_price,
    sale_status,
  } = listing;

  // -----------------------------
  // Normalised DVLA-style reg
  // -----------------------------
  const formattedReg = registration
    ? formatDvlaRegistration(registration)
    : "";

  // -----------------------------
  // Status flags
  // -----------------------------
  const lowerStatus = (status || "").toLowerCase();
  const saleStatusLower = (sale_status || "").toLowerCase();

  const isLive = lowerStatus === "live";
  const isQueued = lowerStatus === "queued";

  const isSold =
    lowerStatus === "sold" ||
    saleStatusLower === "sold" ||
    (typeof sold_price === "number" && sold_price > 0);

  const timerLabel = isSold
    ? "SOLD"
    : isLive
    ? "AUCTION ENDS IN"
    : "AUCTION STARTS IN";

  // -----------------------------
  // "NEW" badge
  // -----------------------------
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const createdMs = $createdAt ? new Date($createdAt).getTime() : null;
  const ageMs = createdMs ? now - createdMs : null;
  const isNew = ageMs !== null && ageMs < 86400000;

  // -----------------------------
  // Reserve / bids / BUY NOW LOGIC
  // -----------------------------

  // Force everything to numbers safely
  const numericCurrentBidRaw =
    typeof current_bid === "number"
      ? current_bid
      : current_bid != null
      ? Number(current_bid)
      : 0;

  const numericCurrentBid = Number.isFinite(numericCurrentBidRaw)
    ? numericCurrentBidRaw
    : 0;

  const numericBuyNowRaw =
    typeof buy_now === "number"
      ? buy_now
      : buy_now != null
      ? Number(buy_now)
      : null;

  const numericBuyNow =
    numericBuyNowRaw !== null && Number.isFinite(numericBuyNowRaw)
      ? numericBuyNowRaw
      : null;

  const hasReserve =
    typeof reserve_price === "number" && reserve_price > 0;

  const reserveMet =
    hasReserve && numericCurrentBid >= (reserve_price as number);

  // 🔴 RULE:
  // Buy Now must disappear once bidding reaches OR beats the Buy Now amount.
  //
  // So we ONLY show Buy Now text while:
  // - auction is live
  // - not sold
  // - buy now is a valid positive number
  // - AND current bid is STRICTLY LOWER than buy now
  const hasBuyNow =
    isLive &&
    !isSold &&
    numericBuyNow !== null &&
    numericBuyNow > 0 &&
    numericCurrentBid < numericBuyNow;

  const canBid = isLive && !isSold;

  return (
    <div className="bg-white text-gray-900 border border-gold/40 rounded-xl shadow-md p-4 flex flex-col gap-3 transition hover:shadow-lg w-full">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] text-gold">Listing ID</p>
          <p className="font-semibold text-[12px] max-w-[160px] truncate">
            {listing_id || $id}
          </p>
          {formattedReg && (
            <p className="mt-1 text-[11px] text-gray-500">
              Reg:{" "}
              <span className="font-dvla font-semibold">
                {formattedReg}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
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

          {isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-full">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* DVLA PLATES – STACKED INSIDE CARD */}
      <div className="bg-gray-100 rounded-lg border border-gold/20 py-3 px-2 flex flex-col gap-2">
        <div className="flex flex-col items-center gap-3">
          {/* FRONT */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
              Front
            </span>
            <div className="w-full flex justify-center">
              <NumberPlate
                reg={formattedReg || "AB12 CDE"}
                variant="front"
                size="card"
                showBlueBand={true}
              />
            </div>
          </div>

          {/* REAR */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
              Rear
            </span>
            <div className="w-full flex justify-center">
              <NumberPlate
                reg={formattedReg || "AB12 CDE"}
                variant="rear"
                size="card"
                showBlueBand={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TIMER + BID INFO */}
      <div className="flex flex-col gap-3">
        {/* TIMER */}
        <div className="w-full">
          <p className="text-[9px] text-gray-500 mb-0.5">{timerLabel}</p>
          <div className="px-3 py-1.5 bg-white border border-gold rounded-lg shadow-sm inline-block min-w-[180px]">
            {isSold ? (
              <span className="text-[10px] font-semibold text-red-700">
                Sold – bidding closed
              </span>
            ) : isLive || isQueued ? (
              <AuctionTimer
                mode={isLive ? "live" : "coming"}
                endTime={
                  isLive
                    ? auction_end ?? undefined
                    : auction_start ?? undefined
                }
              />
            ) : (
              <span className="text-[10px]">No active auction</span>
            )}
          </div>
        </div>

        {/* BID / BUY NOW / BIDS COUNT */}
        <div className="flex flex-col xs:flex-row justify-between gap-2 items-start xs:items-end">
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

            {/* 👇 This will ONLY render while current bid < buy now */}
            {hasBuyNow && numericBuyNow !== null && (
              <p className="text-[9px] text-emerald-700 font-semibold mt-1">
                Buy Now: £{numericBuyNow.toLocaleString()}
              </p>
            )}

            <p className="text-[8px] text-gray-500 mt-1 leading-tight max-w-[220px]">
              £80 DVLA paperwork fee is added to all winning bids to cover the
              transfer process.
            </p>
          </div>

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
          View details
        </Link>

        {canBid ? (
          <Link
            href={`/place_bid?id=${$id}`}
            className="bg-gold text-black px-3 py-1.5 rounded-md font-bold text-[12px] shadow-sm hover:bg-yellow-400 transition"
          >
            Bid now
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
