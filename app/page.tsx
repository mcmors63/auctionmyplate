// app/page.tsx

export const metadata = {
  title: "Auction Your Private Number Plate | AuctionMyPlate",
  description:
    "Auction your private or cherished number plate with AuctionMyPlate. Weekly UK plate auctions, hidden reserves, secure DVLA transfer and no listing fee. Start selling your reg today.",
};

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-gray-200">
      {/* HERO SECTION */}
      <section className="relative h-[480px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=2400"
          alt="Luxury car hero"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/95" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gold mb-6 tracking-tight">
            It&apos;s Free To List Your Number Plate
          </h1>

          <p className="text-xl max-w-2xl text-gray-300 mb-8 leading-relaxed">
            Weekly auctions run from{" "}
            <span className="text-gold font-semibold">Monday</span> to{" "}
            <span className="text-gold font-semibold">Sunday</span>.{" "}
            Bid on cherished plates or sell yours for the best price.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/current-listings"
              className="bg-gold text-black font-semibold px-6 py-3 rounded-xl hover:bg-yellow-500 transition shadow-lg"
            >
              View Current Auctions
            </Link>

            {/* Always send here so new users can log in or register first */}
            <Link
              href="/login-or-register"
              className="border border-gold text-gold font-semibold px-6 py-3 rounded-xl hover:bg-gold hover:text-black transition shadow-lg"
            >
              List Your Plate
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE GRID */}
      <section className="max-w-6xl mx-auto py-20 px-6">
        <div className="grid md:grid-cols-3 gap-10">
          {/* SELL */}
          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl mb-4">💷</div>
            <h3 className="text-2xl font-bold text-gold mb-3">SELL</h3>
            <p className="text-gray-400">
              Listing your plate is completely free.{"  "}
              Fast approvals and maximum exposure to serious buyers.
            </p>
          </div>

          {/* SAFE */}
          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-gold mb-3">
              SAFE &amp; SECURE
            </h3>
            <p className="text-gray-400">
              Verified users, transparent fees and DVLA-style transfer guidance
              on every sale.
            </p>
          </div>

          {/* BUY */}
          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-2xl font-bold text-gold mb-3">BUY</h3>
            <p className="text-gray-400">
              Bid in weekly auctions on unique registrations, from clever
              wordplay to ultra-rare plates.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-black/60 border-t border-gold/20 border-b py-20 px-6">
        <h2 className="text-4xl font-bold text-gold text-center mb-12">
          How It Works
        </h2>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl font-extrabold text-gold mb-4">1</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              List Your Plate
            </h3>
            <p className="text-gray-400">
              Create an account, add your plate details and submit for approval.
              Listing is free.
            </p>
          </div>

          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl font-extrabold text-gold mb-4">2</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              Auction Goes Live
            </h3>
            <p className="text-gray-400">
              Once approved, your plate enters the next Monday–Sunday auction
              window.
            </p>
          </div>

          <div className="bg-black/40 p-8 rounded-2xl border border-gold/20 shadow-xl text-center">
            <div className="text-4xl font-extrabold text-gold mb-4">3</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              Secure Transfer
            </h3>
            <p className="text-gray-400">
              When it sells, we guide both buyer and seller through a safe
              DVLA-style transfer.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST PANEL */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-black/40 p-10 rounded-2xl border border-gold/20 shadow-xl text-center">
          <h2 className="text-3xl font-bold text-gold mb-4">
            Why Choose AuctionMyPlate?
          </h2>
          <p className="text-gray-300 text-lg">
            Built for plate lovers, collectors, traders and investors.{"  "}
            Modern, transparent and secure — with{" "}
            <span className="text-gold font-semibold">no listing fees</span>{" "}
            and a weekly auction cycle designed around UK number plate buyers.
          </p>
        </div>
      </section>

      <div className="h-20" />
    </main>
  );
}
