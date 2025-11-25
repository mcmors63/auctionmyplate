// /lib/useAuctionTimer.ts
"use client";

import { useEffect, useState } from "react";
import { getAuctionWindow } from "./getAuctionWindow";

export function useAuctionTimer(endTime?: string | null) {
  const [now, setNow] = useState(Date.now());
  const [target, setTarget] = useState<Date | null>(null);

  // Decide target time
  useEffect(() => {
    if (endTime) {
      setTarget(new Date(endTime));
    } else {
      const { nextStart } = getAuctionWindow();
      setTarget(nextStart);
    }
  }, [endTime]);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) return { expired: false, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const diff = target.getTime() - now;

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { expired: false, days, hours, minutes, seconds };
}
