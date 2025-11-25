// app/current-listings/AuctionTimer.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

type Props = {
  mode: "coming" | "live";
};

export default function AuctionTimer({ mode }: Props) {
  const [now, setNow] = useState(Date.now());

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Compute target + label ONCE per render (no useState, no loops)
  const { target, label } = useMemo(() => {
    const { currentStart, currentEnd, nextStart, now: windowNow } =
      getAuctionWindow();

    const nowTime = windowNow.getTime();

    if (mode === "coming") {
      // If we haven't reached currentStart yet → count to currentStart
      if (nowTime < currentStart.getTime()) {
        return {
          target: currentStart,
          label: "Auction starts in",
        };
      }

      // Otherwise → count to nextStart
      return {
        target: nextStart,
        label: "Auction starts in",
      };
    }

    // LIVE mode → countdown to currentEnd
    return {
      target: currentEnd,
      label: "Auction ends in",
    };
  }, [mode]);

  if (!target) return null;

  const diff = target.getTime() - now;
  if (diff <= 0) {
    return (
      <p className="text-xs font-semibold text-green-700">
        {mode === "coming" ? "Auction now live" : "Auction ended"}
      </p>
    );
  }

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col text-xs font-semibold text-gray-800">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="mt-0.5 inline-flex items-center gap-1">
        <span>⏱</span>
        <span>
          {days}d {hours.toString().padStart(2, "0")}h:
          {minutes.toString().padStart(2, "0")}m:
          {seconds.toString().padStart(2, "0")}s
        </span>
      </span>
    </div>
  );
}
