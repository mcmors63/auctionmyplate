// app/page.tsx

export const metadata = {
  title: "AuctionMyPlate – The UK's Number 1 Cherished Numberplate Auction",
  description:
    "List your cherished number plate for free and reach serious UK buyers. Weekly DVLA-style auctions, secure payments, and full transfer guidance.",
};

import Link from "next/link";
import HomeBannerCarousel from "@/components/ui/HomeBannerCarousel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-gray-100">
      {/* HERO */}
      <section className="relative w-full overflow-hidden bg-black">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=2400"
          alt="Performance car in a dark garage"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-28 flex flex-col lg:flex-row items-center gap-12">
          {/* Left: main copy */}
          <div className="flex-1 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/50 px-3 py-1 text-xs font-semibold tracking-wide text-gold mb-4">
              🔥 The UK&apos;s Number 1 Cherished Numberplate Auction
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gold tracking-tight leading-tight mb-4">
              It&apos;s Free To List
              <span className="block text-white">
                Your Cherished Number Plate
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-200 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
              Weekly DVLA-style auctions run from{" "}
              <span className="font-semibold text-gold">Monday 01:00</span> to{" "}
              <span className="font-semibold text-gold">Sunday 23:00</span>.
              Bid on rare plates or list yours for maximum exposure and a fair
              market price.
            </p>

            {/* Key benefits strip */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8 text-xs sm:text-sm text-gray-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-gold/40 px-3 py-1">
                ✅ No listing fees – ever
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-gold/40 px-3 py-1">
                🔐 Secure payments via Stripe
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-gold/40 px-3 py-1">
                📄 DVLA-style transfer guidance
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                href="/current-listings"
                className="bg-gold text-black font-semibold px-7 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg text-sm sm:text-base"
              >
                View Current Auctions
              </Link>

              <Link
                href="/login-or-register"
                className="border border-gold text-gold font-semibold px-7 py-3 rounded-xl hover:bg-gold hover:text-black transition shadow-lg text-sm sm:text-base"
              >
                List Your Plate For Free
              </Link>
            </div>

            {/* Auction timing note */}
            <p className="mt-4 text-xs sm:text-sm text-gray-300">
              New listings approved during the week are queued for the next
              Monday–Sunday auction window.
            </p>
          </div>

          {/* Right: “this week” card */}
          <div className="flex-1 w-full max-w-md mx-auto">
            <div className="bg-black/70 border border-gold/40 rounded-3xl shadow-2xl p-6 sm:p-7 backdrop-blur">
              <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-2 text-center">
                This Week&apos;s Auction
              </p>
              <p className="text-center text-sm text-gray-200 mb-4">
                Live now • Ends Sunday 23:00
              </p>

              <div className="space-y-4">
                <HighlightPlate
                  reg="E27 MOM"
                  label="Family favourite"
                  price="£200"
                />
                <HighlightPlate
                  reg="MON 567"
                  label="Monaco money"
                  price="£3,000"
                />
                <HighlightPlate
                  reg="X50 AMP"
                  label="Perfect for sound addicts"
                  price="£1,250"
                />
              </div>

              <p className="mt-4 text-xs text-gray-400 text-center">
                Highlights are for illustration – see{" "}
                <Link
                  href="/current-listings"
                  className="text-gold underline"
                >
                  Current Listings
                </Link>{" "}
                for live auctions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🔁 ACTIVE REVOLVING BANNER SECTION */}
      <HomeBannerCarousel />

      {/* VALUE STRIP */}
      <section className="bg-black border-t border-b border-gold/20">
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
          <ValueCard
            emoji="💷"
            title="SELL"
            body="List your plate for free, set a hidden reserve, and let genuine bidders fight over it in a weekly auction."
          />
          <ValueCard
            emoji="🔒"
            title="SAFE & SECURE"
            body="Verified users, secure Stripe payments and clear DVLA-style transfer guidance on every completed sale."
          />
          <ValueCard
            emoji="🛒"
            title="BUY"
            body="Bid on clever wordplay, dateless gems and ultra-rare plates with transparent pricing and timed auctions."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-black/90 border-b border-gold/20">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gold text-center mb-10">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="List Your Plate"
              body="Create a free account, add your registration, upload a photo and tell buyers why it’s special. We’ll quickly approve it."
            />
            <StepCard
              step={2}
              title="Auction Goes Live"
              body="Your plate is placed in the next weekly auction. Bidders compete from Monday 01:00 to Sunday 23:00."
            />
            <StepCard
              step={3}
              title="Secure Transfer"
              body="When it sells, we guide both buyer and seller through DVLA-style transfer, paperwork and payout."
            />
          </div>

          <div className="mt-10 text-center text-sm text-gray-300 max-w-3xl mx-auto">
            <p>
              Every winning bid has an additional{" "}
              <span className="font-semibold text-gold">£80 DVLA paperwork</span>{" "}
              fee to handle the official transfer. AuctionMyPlate.co.uk has no
              affiliation with DVLA – we simply make the process easier.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST PANEL */}
      <section className="bg-black py-16 px-6">
        <div className="max-w-4xl mx-auto bg-black/60 border border-gold/25 rounded-3xl shadow-2xl p-8 sm:p-10 text-center">
          <h2 className="text-3xl font-bold text-gold mb-4">
            Built For Plate Lovers, Traders & Collectors
          </h2>
          <p className="text-lg text-gray-200 mb-6">
            Whether you&apos;re cashing in on a clever reg or hunting for the
            perfect plate for your pride and joy, AuctionMyPlate is built around
            how UK buyers and sellers actually trade cherished numbers.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-200">
            <span className="px-4 py-2 rounded-full bg-black/70 border border-gold/30">
              Weekly auction schedule – no endless listings
            </span>
            <span className="px-4 py-2 rounded-full bg-black/70 border border-gold/30">
              Hidden reserves to protect your minimum price
            </span>
            <span className="px-4 py-2 rounded-full bg-black/70 border border-gold/30">
              Simple, transparent fee structure
            </span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/current-listings"
              className="bg-gold text-black font-semibold px-6 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg text-sm sm:text-base"
            >
              Browse Live Auctions
            </Link>
            <Link
              href="/login-or-register"
              className="border border-gold text-gold font-semibold px-6 py-3 rounded-xl hover:bg-gold hover:text-black transition shadow-lg text-sm sm:text-base"
            >
              Start Selling Today
            </Link>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

type HighlightPlateProps = {
  reg: string;
  label: string;
  price: string;
};

function HighlightPlate({ reg, label, price }: HighlightPlateProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-black/80 border border-gold/40 px-4 py-3">
      <div className="flex-shrink-0">
        <div className="relative w-32 sm:w-36 h-12 sm:h-14 bg-[#ffec3d] border-4 border-black rounded-md flex items-center justify-center text-black font-extrabold text-lg sm:text-xl tracking-[0.18em]">
          <span className="px-2">{reg}</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-bold text-gold">{price} current bid</p>
      </div>
    </div>
  );
}

type ValueCardProps = {
  emoji: string;
  title: string;
  body: string;
};

function ValueCard({ emoji, title, body }: ValueCardProps) {
  return (
    <div className="bg-black/70 p-7 rounded-2xl border border-gold/20 shadow-xl text-center">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-xl font-bold text-gold mb-2">{title}</h3>
      <p className="text-sm text-gray-300">{body}</p>
    </div>
  );
}

type StepCardProps = {
  step: number;
  title: string;
  body: string;
};

function StepCard({ step, title, body }: StepCardProps) {
  return (
    <div className="relative bg-black/70 p-7 rounded-2xl border border-gold/25 shadow-xl">
      <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-gold text-black flex items-center justify-center font-extrabold text-lg shadow-lg">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-300">{body}</p>
    </div>
  );
}
