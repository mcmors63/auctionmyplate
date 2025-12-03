import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | AuctionMyPlate",
  description:
    "Learn how AuctionMyPlate.co.uk works for buyers and sellers of UK cherished number plates. Auction rules, fees, DVLA paperwork and what happens after you win.",
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md border border-yellow-100 p-8">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-700 mb-4">
          How AuctionMyPlate Works
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          AuctionMyPlate.co.uk is a dedicated UK marketplace for cherished
          number plates. This page explains, in plain English, how auctions
          work for both buyers and sellers, what fees apply, and what happens
          after a plate is sold.
        </p>

        {/* 1. Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            1. The Basics
          </h2>
          <ul className="list-disc ml-5 space-y-2 text-sm text-gray-800 leading-relaxed">
            <li>
              Plates are listed into weekly online auctions. You can{" "}
              <strong>bid</strong> or, where available, use{" "}
              <strong>Buy Now</strong> to purchase immediately.
            </li>
            <li>
              All auctions are for UK registration marks only. Every plate must
              comply with DVLA rules and UK law.
            </li>
            <li>
              We handle the online process and the DVLA assignment paperwork,
              but we are{" "}
              <strong>not affiliated, authorised or endorsed by DVLA</strong>.
            </li>
          </ul>
        </section>

        {/* 2. For Buyers */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            2. Buying a Plate – Step by Step
          </h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm text-gray-800 leading-relaxed">
            <li>
              <strong>Create an account</strong> and verify your email. You can
              then browse and bid on live auctions.
            </li>
            <li>
              <strong>Browse Current Listings.</strong> Use the Current
              Listings page to see plates that are live or coming soon.
            </li>
            <li>
              <strong>Place a bid.</strong> When you bid, you are making a{" "}
              <strong>binding offer</strong> to buy if you win.
            </li>
            <li>
              <strong>Watch for outbids.</strong> If someone outbids you, you
              can choose to bid again until the auction closes.
            </li>
            <li>
              <strong>Buy Now (where available).</strong> If a listing has a
              Buy Now price, you can use it to instantly end the auction and
              secure the plate (subject to payment and checks).
            </li>
            <li>
              <strong>Pay securely.</strong> Winning bidders pay online via our
              payment provider. Card details are handled securely by the
              provider and are not stored on our servers.
            </li>
          </ol>
        </section>

        {/* 3. For Sellers */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            3. Selling a Plate – Step by Step
          </h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm text-gray-800 leading-relaxed">
            <li>
              <strong>Register and complete your profile.</strong> We need your
              full contact details so we can pay out funds and verify ownership.
            </li>
            <li>
              <strong>Click &ldquo;Sell a Plate&rdquo; in your dashboard.</strong>{" "}
              Enter the registration, plate type (vehicle or retention),
              reserve price, starting price and any key details.
            </li>
            <li>
              <strong>Admin approval.</strong> Our team reviews each listing
              for ownership, suitability and DVLA compliance. We may ask you
              for extra information before a plate is approved.
            </li>
            <li>
              <strong>Plate goes live.</strong> Once approved, your plate is
              queued into a weekly auction window and appears on the Current
              Listings page.
            </li>
            <li>
              <strong>Sale completes.</strong> When the auction ends and the
              reserve is met (or Buy Now is used), the plate is marked as sold
              in your dashboard and moves into the Transactions / Documents
              section.
            </li>
            <li>
              <strong>Upload documents & get paid.</strong> You upload the
              required DVLA documents through your dashboard. After checks and
              successful assignment, we pay out your proceeds minus any agreed
              commission.
            </li>
          </ol>
        </section>

        {/* 4. Auction rules & soft close */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            4. Auction Timing & Soft Close
          </h2>
          <p className="text-sm text-gray-800 leading-relaxed mb-2">
            Auctions normally run within a weekly window. Some key rules:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm text-gray-800 leading-relaxed">
            <li>
              <strong>Soft close:</strong> if a bid is placed in the final
              minutes of an auction, the end time may be extended to reduce
              last-second “sniping”.
            </li>
            <li>
              <strong>Reserve price:</strong> if the hidden reserve is not met,
              the seller does not have to accept the highest bid.
            </li>
            <li>
              <strong>Binding bids:</strong> when you bid or use Buy Now, you
              are committing to complete the purchase if you win.
            </li>
          </ul>
        </section>

        {/* 5. Fees */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            5. Fees & Charges
          </h2>
          <ul className="list-disc ml-5 space-y-2 text-sm text-gray-800 leading-relaxed">
            <li>
              <strong>DVLA Assignment Fee – £80.00</strong> is added to all
              winning bids. This covers the cost of processing the registration
              assignment. AuctionMyPlate.co.uk is not affiliated with DVLA but
              handles the associated paperwork.
            </li>
            <li>
              <strong>Commission:</strong> a commission fee may be deducted
              from the seller’s proceeds on successful sales. The rate is shown
              during the listing process or in your seller dashboard.
            </li>
            <li>
              <strong>Listing fees:</strong> during promotional periods, listing
              may be free. Any future listing fees will be clearly displayed
              before you submit a plate.
            </li>
          </ul>
          <p className="text-xs text-gray-600 mt-3">
            For full legal details on fees and responsibilities, please read
            our{" "}
            <a
              href="/terms"
              className="text-yellow-700 underline hover:text-yellow-800"
            >
              Terms &amp; Conditions
            </a>
            .
          </p>
        </section>

        {/* 6. After you win */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            6. What Happens After You Win?
          </h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm text-gray-800 leading-relaxed">
            <li>
              You receive confirmation in your dashboard (and usually by
              email) that you are the winning bidder or Buy Now purchaser.
            </li>
            <li>
              You complete payment online if this has not already been taken.
            </li>
            <li>
              Buyer and seller are asked to{" "}
              <strong>upload the required documents</strong> through their
              dashboards (V5C / V750 / V778, ID where needed).
            </li>
            <li>
              Our team reviews the documents and works with the parties to
              complete the DVLA assignment.
            </li>
            <li>
              Once the transfer is complete, the seller is paid their proceeds
              and the transaction is marked as complete.
            </li>
          </ol>
        </section>

        {/* 7. DVLA disclaimer */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            7. DVLA & Legal Display
          </h2>
          <p className="text-sm text-gray-800 leading-relaxed mb-2">
            AuctionMyPlate.co.uk is{" "}
            <strong>
              not affiliated, authorised, endorsed or associated with the
              Driver and Vehicle Licensing Agency (DVLA)
            </strong>{" "}
            or any UK government organisation.
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm text-gray-800 leading-relaxed">
            <li>
              It is the vehicle keeper’s responsibility to ensure the plate is
              displayed legally (correct font, spacing, colouring and
              placement).
            </li>
            <li>
              We are not responsible for fines, MOT failures or enforcement
              action arising from illegal spacing or non-compliant plates.
            </li>
          </ul>
        </section>

        {/* 8. Need help */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            8. Need Help or Have Questions?
          </h2>
          <p className="text-sm text-gray-800 leading-relaxed">
            If you are unsure about any part of the process, or you are a
            first-time buyer or seller of a cherished plate, you can contact us
            at{" "}
            <a
              href="mailto:support@auctionmyplate.co.uk"
              className="text-yellow-700 underline hover:text-yellow-800"
            >
              support@auctionmyplate.co.uk
            </a>
            . We are happy to walk you through the steps before you bid or list
            a plate.
          </p>
        </section>
      </div>
    </main>
  );
}
