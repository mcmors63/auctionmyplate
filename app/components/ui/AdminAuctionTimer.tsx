"use client";

import { useEffect, useState } from "react";

export default function AdminAuctionTimer({
  start,
  end,
  status,
}: {
  start: string | null;
  end: string | null;
  status: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isComing = status === "queued";
  const target = isComing ? start : end;

  if (!target) return null;

  const diff = new Date(target).getTime() - now;

  if (diff <= 0) {
    return (
      <p className="text-red-600 font-semibold">
        {isComing ? "Auction started" : "Auction ended"}
      </p>
    );
  }

  const sec = Math.floor(diff / 1000) % 60;
  const min = Math.floor(diff / 60000) % 60;
  const hr = Math.floor(diff / 3600000) % 24;
  const day = Math.floor(diff / 86400000);

  return (
    <div className="flex flex-col text-yellow-800 font-semibold text-sm">
      <span className="uppercase text-[10px] tracking-wide text-gray-500">
        {isComing ? "Auction starts in:" : "Auction ends in:"}
      </span>

      <span className="flex items-center gap-1">
        ⏱ {day}d {hr}h:{min.toString().padStart(2, "0")}m:
        {sec.toString().padStart(2, "0")}s
      </span>
    </div>
  );
}
