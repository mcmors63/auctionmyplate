// app/terms/page.tsx

export const metadata = {
  title: "Terms & Conditions | AuctionMyPlate",
  description:
    "Read the full Terms and Conditions for using AuctionMyPlate.co.uk, including auctions, fees, reserve prices, and DVLA responsibilities.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-yellow-100 p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-gray-600">
            Effective Date: <strong>February 2025</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Please read these Terms carefully before using AuctionMyPlate.co.uk.
            By registering, listing or bidding, you agree to be bound by them.
          </p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-800">
          <p>
            These Terms and Conditions govern your use of{" "}
            <strong>AuctionMyPlate.co.uk</strong> (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;). By accessing or using the platform, you agree to
            these Terms. If you do not agree, you must not use the website.
          </p>

          <p>
            AuctionMyPlate.co.uk is{" "}
            <strong>
              not affiliated, authorised, endorsed or associated
            </strong>{" "}
            with the Driver and Vehicle Licensing Agency (DVLA) or any UK
            government organisation.
          </p>

          {/* 1. Eligibility */}
          <section>
            <h2 className="font-semibold text-lg mb-2">1. Eligibility</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You must be at least 18 years old.</li>
              <li>You must provide accurate and truthful information.</li>
              <li>
                You must be legally capable of entering into binding
                agreements.
              </li>
              <li>
                Fraud, identity misuse, or providing false information may
                result in immediate suspension or closure of your account.
              </li>
            </ul>
          </section>

          {/* 2. User Accounts */}
          <section>
            <h2 className="font-semibold text-lg mb-2">2. User Accounts</h2>
            <p>
              You are responsible for keeping your login details secure and for
              all activity carried out using your account. You must notify us
              immediately if you suspect unauthorised access to your account.
            </p>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Provide false or misleading information.</li>
              <li>Engage in abusive, fraudulent or suspicious activity.</li>
              <li>Breach these Terms or any applicable law.</li>
            </ul>
          </section>

          {/* 3. Listings & Plate Ownership */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              3. Listings &amp; Plate Ownership
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                By listing a registration, you confirm you are the legal owner
                or have written permission to sell it.
              </li>
              <li>
                You must hold the correct documentation (e.g. V5C, V750, V778)
                and provide it when requested.
              </li>
              <li>
                You must not misrepresent the registration, its eligibility for
                a vehicle, or its legal status.
              </li>
              <li>
                We may edit, suspend or remove any listing at our discretion,
                including where we suspect fraud, misrepresentation, or breach
                of DVLA guidance.
              </li>
            </ul>
          </section>

          {/* 4. Auction Format */}
          <section>
            <h2 className="font-semibold text-lg mb-2">4. Auction Format</h2>
            <p>
              Auctions typically run on a weekly cycle, with plates added into
              a live auction window. Exact timings and scheduling may be
              adjusted by us from time to time.
            </p>
            <p className="mt-2">
              Key auction rules include (but are not limited to):
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                All bids placed are legally binding offers to purchase if you
                win.
              </li>
              <li>
                You must ensure you have the funds available to complete the
                purchase, including any fees.
              </li>
              <li>
                Reserve prices are hidden from bidders. If the reserve is not
                met, the plate does not have to be sold.
              </li>
              <li>
                We may operate a soft-close system. Bids placed close to the
                end of the auction may extend the auction end time to reduce
                &quot;sniping&quot;.
              </li>
            </ul>
          </section>

          {/* 5. Buy Now */}
          <section>
            <h2 className="font-semibold text-lg mb-2">5. Buy Now</h2>
            <p>
              Some plates may offer a <strong>Buy Now</strong> option. Where
              available:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Using Buy Now places an immediate commitment to purchase at the
                displayed price.
              </li>
              <li>
                The auction will end once Buy Now is used, and the listing will
                be treated as sold (subject to successful payment and transfer).
              </li>
              <li>
                You must complete payment and any required documentation
                promptly.
              </li>
            </ul>
          </section>

          {/* 6. Reserve Prices */}
          <section>
            <h2 className="font-semibold text-lg mb-2">6. Reserve Prices</h2>
            <p>
              The seller may set a reserve price (minimum acceptable sale
              price). This value is not shown publicly.
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                If the final bid is <strong>below</strong> the reserve price, the
                seller is not obliged to complete the sale.
              </li>
              <li>
                If the final bid is <strong>at or above</strong> the reserve
                price, the plate should be treated as sold and both parties are
                expected to complete the transaction.
              </li>
            </ul>
          </section>

          {/* 7. Fees */}
          <section>
            <h2 className="font-semibold text-lg mb-2">7. Fees</h2>

            <h3 className="font-semibold mt-2">7.1 Listing Fees</h3>
            <p>
              Listing may be free during introductory or promotional periods.
              We reserve the right to introduce or amend listing fees in the
              future, and will make such fees clear before you list.
            </p>

            <h3 className="font-semibold mt-3">7.2 Commission</h3>
            <p>
              A commission fee may be charged on successful sales. Commission is
              normally calculated as a percentage of the final sale price and
              is deducted from the seller&apos;s proceeds. No commission is
              usually charged if the plate does not sell.
            </p>

            <h3 className="font-semibold mt-3">
              7.3 DVLA Assignment Fee (£80.00)
            </h3>
            <p>
              A <strong>£80.00 fee</strong> is added to all winning bids to cover
              the DVLA assignment/transfer process. AuctionMyPlate.co.uk has no
              affiliation with DVLA; this fee is to facilitate the paperwork and
              processing associated with the registration.
            </p>

            <h3 className="font-semibold mt-3">7.4 Refunds</h3>
            <p>
              Fees and commissions are generally non-refundable unless we are
              required by law to issue a refund, or we expressly agree to one
              in writing.
            </p>
          </section>

          {/* 8. Transfer of Registration */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              8. Transfer of Registration
            </h2>

            <p className="font-semibold mt-1">Seller responsibilities:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Provide accurate details and valid DVLA documentation.</li>
              <li>
                Co-operate promptly with us and/or the buyer to complete the
                transfer.
              </li>
              <li>
                Not to withhold documents or deliberately delay the transfer
                without valid reason.
              </li>
            </ul>

            <p className="font-semibold mt-3">Buyer responsibilities:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Ensure the intended vehicle is eligible for the registration.
              </li>
              <li>
                Provide accurate details required for the DVLA transfer and pay
                any fees due.
              </li>
              <li>Submit and sign documentation promptly when requested.</li>
            </ul>

            <p className="mt-3">
              We are not responsible for delays, rejections or issues caused by
              DVLA, postal services, errors in information supplied by users, or
              failure by either party to co-operate.
            </p>
          </section>

          {/* 9. Legal Display of Plates */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              9. Legal Display of Plates
            </h2>
            <p>
              All number plates must be displayed in accordance with DVLA and UK
              law (including font, spacing, colouring, and placement).
            </p>
            <p className="mt-2">
              It is the driver&apos;s responsibility to ensure the plate is
              displayed legally. We are not responsible for fines, penalties,
              MOT failures or enforcement action arising from illegal spacing,
              misrepresentation, or non-compliant plates.
            </p>
          </section>

          {/* 10. Prohibited Use */}
          <section>
            <h2 className="font-semibold text-lg mb-2">10. Prohibited Use</h2>
            <p>You must not use AuctionMyPlate.co.uk to:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>List plates you do not own or have no right to sell.</li>
              <li>Engage in fraud, money laundering or other illegal activity.</li>
              <li>
                Manipulate auctions (including shill bidding or colluding to
                distort prices).
              </li>
              <li>Harass, abuse or threaten other users or staff.</li>
              <li>
                Upload malicious code, attempt to hack, or disrupt the platform.
              </li>
            </ul>
          </section>

          {/* 11. Liability */}
          <section>
            <h2 className="font-semibold text-lg mb-2">11. Liability</h2>
            <p>
              While we aim to provide a smooth and secure platform, we do not
              guarantee uninterrupted or error-free operation.
            </p>
            <p className="mt-2">
              To the fullest extent permitted by law, we are not liable for:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Losses arising from disputes between buyers and sellers.
              </li>
              <li>DVLA decisions, delays or administrative errors.</li>
              <li>Loss of data, loss of profit, or business interruption.</li>
              <li>
                Actions or omissions of third parties (including payment
                providers or delivery services).
              </li>
            </ul>
          </section>

          {/* 12. Non-Payment by Buyer */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              12. Non-Payment by Buyer
            </h2>
            <p>
              If a winning bidder fails to pay or complete required steps within
              a reasonable time:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>We may cancel the sale.</li>
              <li>
                We may suspend or terminate the buyer&apos;s account and/or
                restrict future use.
              </li>
              <li>The seller may be allowed to relist the registration.</li>
            </ul>
          </section>

          {/* 13. Suspension & Removal */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              13. Suspension &amp; Removal
            </h2>
            <p>
              We may suspend, restrict or remove any account or listing at our
              discretion where we suspect:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Fraud or attempted fraud.</li>
              <li>Abusive or threatening behaviour.</li>
              <li>Breaches of these Terms or applicable law.</li>
              <li>
                Activity that could harm other users or our reputation as a
                marketplace.
              </li>
            </ul>
          </section>

          {/* 14. Changes to Terms */}
          <section>
            <h2 className="font-semibold text-lg mb-2">
              14. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. Changes will normally
              apply from the date they are posted on this page. Your continued
              use of AuctionMyPlate.co.uk after changes are published
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="font-semibold text-lg mb-2">15. Contact</h2>
            <p>
              If you have any questions about these Terms, your account, or a
              specific transaction, please contact:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@auctionmyplate.co.uk"
                className="text-blue-700 underline"
              >
                support@auctionmyplate.co.uk
              </a>
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
