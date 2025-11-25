// app/sell-my-plate/page.tsx

export const metadata = {
  title: "Sell or Auction Your Private Number Plate | AuctionMyPlate UK",
  description:
    "Ready to sell your private number plate? List your reg with AuctionMyPlate, set your own reserve and auction it to UK buyers. No listing fee, simple DVLA transfer and weekly auctions.",
};

export default function SellMyPlatePage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-yellow-100">
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-700 mb-4">
          Sell your private number plate at auction
        </h1>

        <p className="text-gray-800 mb-6 leading-relaxed">
          Want to sell your private number plate but not sure what it&apos;s
          worth? AuctionMyPlate lets you list your reg, set a hidden reserve and
          auction it to genuine UK buyers – without paying a listing fee.
          Whether your plate is on a vehicle or a retention certificate, we
          handle the auction process and guide you through the DVLA transfer so
          you can sell with confidence.
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">
            Why auction instead of a fixed price sale?
          </h2>
          <p className="text-gray-800 mb-3">
            A fixed price listing is guesswork. If you price too low, you lose
            out. If you price too high, nothing happens.
          </p>
          <ul className="list-disc ml-5 space-y-1 text-gray-800 text-sm md:text-base">
            <li>
              <strong>Finds the true market value</strong> – buyers compete,
              pushing the price up.
            </li>
                        <li>
              <strong>Creates urgency</strong> – a clear end time and soft-close
              window encourage real bidding.
            </li>
            <li>
              <strong>Filters out time-wasters</strong> – bidders must register
              and verify details before they can bid.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">
            What you&apos;ll need to list your plate
          </h2>
          <ul className="list-disc ml-5 space-y-1 text-gray-800 text-sm md:text-base">
            <li>Your registration number (exactly as on your documents)</li>
            <li>
              Whether it&apos;s on a <strong>vehicle</strong> or a{" "}
              <strong>retention certificate</strong>
            </li>
                        <li>A realistic reserve price</li>
            <li>
              A short description of why the plate is desirable (wording, age,
              initials, etc.)
            </li>
          </ul>
          <p className="text-gray-800 mt-3">
            You can also choose a starting price and optional Buy Now price.
            We&apos;ll show you the expected fees and payout before you confirm.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">
            Fees &amp; your payout
          </h2>
          <ul className="list-disc ml-5 space-y-1 text-gray-800 text-sm md:text-base">
            <li>
              <strong>Listing fee:</strong> £0 – no charge to list a plate
              during our launch period.
            </li>
            <li>
              <strong>Commission:</strong> a small percentage only if your plate
              sells (based on your reserve band).
            </li>
            <li>
              <strong>DVLA fee:</strong> the standard £80 DVLA assignment fee is
              paid by the buyer.
            </li>
          </ul>
          <p className="text-gray-800 mt-3">
            Before you submit your listing, we show your reserve price, our
            commission rate and an estimated payout to you after fees. If the
            reserve isn&apos;t met, the plate simply doesn&apos;t sell and you
            owe nothing.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">
            How selling your plate with AuctionMyPlate works
          </h2>
          <ol className="list-decimal ml-5 space-y-2 text-gray-800 text-sm md:text-base">
            <li>
              <strong>Create your seller account</strong> – register with your
              name, address and contact details. We verify email and phone.
            </li>
            <li>
              <strong>Submit your plate</strong> – enter your registration,
              choose plate type, add details and set your reserve / Buy Now.
            </li>
            <li>
              <strong>Admin review</strong> – we check the listing for obvious
              issues. If anything is missing we&apos;ll contact you before
              approving it.
            </li>
            <li>
              <strong>Queued for the next auction</strong> – once approved, your
              plate is queued for the next weekly auction window. You&apos;ll
              see the countdown in your dashboard.
            </li>
            <li>
              <strong>Live auction</strong> – buyers place bids and can use Buy
              Now if enabled.
            </li>
            <li>
              <strong>Sale, transfer, payout</strong> – when the auction ends
              and the reserve is met, we confirm the sale, oversee the DVLA
              transfer and pay your proceeds once everything is complete.
            </li>
          </ol>
        </section>

        <div className="border-t border-yellow-100 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-gray-800 text-sm md:text-base">
            Ready to get started? It takes just a few minutes to list your
            plate.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-md text-sm md:text-base"
          >
            Create your free seller account
          </a>
        </div>
      </div>
    </main>
  );
}
