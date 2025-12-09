"use client";

import { useEffect, useState } from "react";

type BannerItem = {
  title: string;
  subtitle: string;
  tag: string;
};

const BANNERS: BannerItem[] = [
  {
    title: "Free to list. Pay only when your plate sells.",
    subtitle:
      "No listing fees, no monthly subscriptions – just a success fee when the hammer drops.",
    tag: "SELL WITH CONFIDENCE",
  },
  {
    title: "Secure card payments handled by Stripe.",
    subtitle:
      "We never store your card details. Payments are encrypted and processed by Stripe.",
    tag: "SAFE PAYMENTS",
  },
  {
    title: "Weekly auctions from Monday 01:00 to Sunday 23:00.",
    subtitle:
      "Fresh stock every week – bid, win and get full DVLA-style transfer guidance.",
    tag: "WEEKLY AUCTIONS",
  },
  {
    title: "DVLA-style transfer guidance on every completed sale.",
    subtitle:
      "We walk both buyer and seller through the paperwork so the transfer doesn’t stall.",
    tag: "TRANSFER SUPPORT",
  },
];

export default function HomeBannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (BANNERS.length <= 1) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 6000); // change every 6 seconds

    return () => clearInterval(id);
  }, []);

  const current = BANNERS[index];

  return (
    <section className="bg-black border-t border-b border-gold/25">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center gap-5">
        {/* Left label / badge */}
        <div className="w-full md:w-1/3 flex flex-col items-start md:items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/70 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-gold uppercase">
            <span className="text-gold">●</span> Live Auction Updates
          </span>
          <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-xs">
            Key things every buyer and seller should know – rotating in real
            time as you browse.
          </p>
        </div>

        {/* Right rotating content */}
        <div className="w-full md:w-2/3">
          <div className="relative overflow-hidden rounded-2xl bg-black/80 border border-gold/35 px-4 sm:px-6 py-4 sm:py-5 shadow-2xl">
            <p className="text-[11px] sm:text-xs font-semibold text-gold tracking-[0.25em] uppercase mb-2">
              {current.tag}
            </p>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-200">
              {current.subtitle}
            </p>

            {/* Dots */}
            <div className="mt-4 flex gap-1.5">
              {BANNERS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-gold" : "w-2 bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
