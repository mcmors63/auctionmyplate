// app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | AuctionMyPlate",
  description:
    "How AuctionMyPlate.co.uk collects, uses and protects your personal data when you register, list number plates or place bids.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-yellow-100 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-700 mb-4">
          Privacy Policy
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Effective Date: <strong>February 2025</strong>
        </p>

        <p className="text-sm text-gray-700 mb-4">
          This Privacy Policy explains how{" "}
          <span className="font-semibold">AuctionMyPlate.co.uk</span> (&quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;) collects, uses, stores and protects your personal data when
          you use our website, register for an account, list a plate, or bid in
          an auction.
        </p>

        <p className="text-sm text-gray-700 mb-6">
          This Policy should be read together with our{" "}
          <Link
            href="/cookies"
            className="text-yellow-700 underline font-semibold"
          >
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-yellow-700 underline font-semibold"
          >
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <div className="space-y-6 text-sm text-gray-800 leading-relaxed">
          {/* 1. Who we are */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              1. Who We Are &amp; Contact Details
            </h2>
            <p>
              AuctionMyPlate.co.uk is an online marketplace that allows users
              to list and bid on personalised registration plates. We are{" "}
              <strong>
                not affiliated, authorised, endorsed or associated
              </strong>{" "}
              with the Driver and Vehicle Licensing Agency (DVLA) or any UK
              government organisation.
            </p>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or how your
              data is handled, you can contact us at:
            </p>
            <p className="mt-1">
              <strong>support@auctionmyplate.co.uk</strong>
            </p>
          </section>

          {/* 2. Data we collect */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              2. Data We Collect
            </h2>
            <p>We may collect and process the following types of data:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Account information:</strong> name, email address,
                password (encrypted), phone number, postal address.
              </li>
              <li>
                <strong>Listing information:</strong> registration marks, plate
                type (vehicle or retention), reserve price, starting price, Buy
                Now price, description and related auction details.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, links clicked, time
                on site, device type, IP address and basic analytics data.
              </li>
              <li>
                <strong>Communication data:</strong> messages we send to you
                (e.g. notifications, emails) and your responses.
              </li>
              <li>
                <strong>Transaction-related information:</strong> where
                applicable, details about winning bids, sale amounts and
                payout-related data. Card details are handled by our payment
                processor and are <strong>not stored</strong> on our servers.
              </li>
            </ul>
          </section>

          {/* 3. How we use your data */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              3. How We Use Your Data
            </h2>
            <p>We use your personal data for the following purposes:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>To create and manage your account.</li>
              <li>
                To list plates for sale, run auctions and process bids and Buy
                Now purchases.
              </li>
              <li>
                To communicate with you about your account, listings, bids,
                sales, documents and support requests.
              </li>
              <li>
                To prevent fraud, protect the platform and enforce our Terms &amp;
                Conditions.
              </li>
              <li>
                To analyse site usage so we can improve performance, layout and
                user experience.
              </li>
              <li>
                To comply with legal obligations and respond to lawful requests
                from authorities.
              </li>
            </ul>
          </section>

          {/* 4. Legal bases */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              4. Legal Basis for Processing
            </h2>
            <p>
              We process your personal data under one or more of the following
              legal bases:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Contract:</strong> to provide the services you register
                for (e.g. running auctions, handling your listings).
              </li>
              <li>
                <strong>Legitimate interests:</strong> to keep the platform
                secure, prevent fraud and improve our services.
              </li>
              <li>
                <strong>Legal obligation:</strong> to comply with applicable
                laws, regulations or court orders.
              </li>
              <li>
                <strong>Consent:</strong> where required for certain cookies or
                marketing communications.
              </li>
            </ul>
          </section>

          {/* 5. Cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              5. Cookies &amp; Tracking
            </h2>
            <p>
              We use essential cookies to keep you logged in and to maintain
              basic site functionality. We may also use analytics cookies to
              understand how visitors use the site so we can improve it.
            </p>
            <p className="mt-2">
              For more detail about exactly what cookies we use and how to
              manage them, please read our{" "}
              <Link
                href="/cookies"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* 6. Who we share with */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              6. Who We Share Your Data With
            </h2>
            <p>
              We do not sell your personal data. We may share limited data with:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Service providers:</strong> such as hosting providers,
                email services, analytics platforms and payment processors.
              </li>
              <li>
                <strong>Law enforcement or authorities:</strong> where required
                by law or to prevent fraud/criminal activity.
              </li>
              <li>
                <strong>Other users:</strong> where it is necessary to complete
                a sale or resolve an issue related to a listing or transaction.
              </li>
            </ul>
          </section>

          {/* 7. Data retention */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              7. How Long We Keep Your Data
            </h2>
            <p>
              We keep your data for as long as is reasonably necessary to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Maintain your account and transaction records.</li>
              <li>
                Resolve disputes, prevent fraud and enforce our Terms &amp;
                Conditions.
              </li>
              <li>
                Meet legal, accounting or reporting obligations (for example,
                where certain records must be retained for a number of years).
              </li>
            </ul>
            <p className="mt-2">
              Where data is no longer required, it will be deleted or
              anonymised.
            </p>
          </section>

          {/* 8. Security */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              8. How We Protect Your Data
            </h2>
            <p>
              We use reasonable technical and organisational measures to protect
              your personal data against unauthorised access, loss or misuse. No
              system is 100% secure, but we work to keep your information safe
              and review our safeguards regularly.
            </p>
          </section>

          {/* 9. Your rights */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              9. Your Rights
            </h2>
            <p>
              Depending on your location and applicable law, you may have the
              right to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request corrections to inaccurate or incomplete data.</li>
              <li>Request deletion of certain data, subject to legal limits.</li>
              <li>
                Object to or restrict certain types of processing in some
                circumstances.
              </li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact us at{" "}
              <strong>support@auctionmyplate.co.uk</strong>.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do,
              we will update the &quot;Effective Date&quot; at the top of the
              page. Your continued use of the site after any changes means you
              accept the updated policy.
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm">
          <Link href="/" className="text-yellow-700 underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
