// app/cookies/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | AuctionMyPlate",
  description:
    "Find out how AuctionMyPlate.co.uk uses cookies and similar technologies to keep your account secure and improve your number plate auction experience.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/cookies",
  },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-yellow-100 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-700 mb-4">
          Cookie Policy
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Effective Date: <strong>February 2025</strong>
        </p>

        <p className="text-sm text-gray-700 mb-4">
          This Cookie Policy explains how{" "}
          <span className="font-semibold">AuctionMyPlate.co.uk</span> (&quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;) uses cookies and similar technologies when you visit or use our
          website.
        </p>

        <p className="text-sm text-gray-700 mb-6">
          This Policy should be read alongside our{" "}
          <Link
            href="/privacy"
            className="text-yellow-700 font-semibold underline"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-yellow-700 font-semibold underline"
          >
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <div className="space-y-6 text-sm text-gray-800 leading-relaxed">
          {/* 1. What cookies are */}
          <section>
            <h2 className="text-lg font-semibold mb-2">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. They help the site remember your actions and
              preferences (such as login details or region) so you don&apos;t
              have to re-enter them every time you return.
            </p>
            <p className="mt-2">
              We also use similar technologies such as local storage to help
              keep you logged in and maintain session-related data while you use
              AuctionMyPlate to browse and bid on number plates.
            </p>
          </section>

          {/* 2. How we use cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Essential cookies:</strong> required for the site to
                function, such as keeping you logged in to your AuctionMyPlate
                account, securing forms, and enabling bidding and checkout.
              </li>
              <li>
                <strong>Preference cookies:</strong> to remember basic choices
                and improve your experience on repeat visits.
              </li>
              <li>
                <strong>Analytics cookies:</strong> to understand how visitors
                use the site so we can improve layout, performance and content.
              </li>
            </ul>
          </section>

          {/* 3. Types we use */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              3. Types of Cookies We May Use
            </h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Session cookies:</strong> temporary cookies that are
                deleted when you close your browser.
              </li>
              <li>
                <strong>Persistent cookies:</strong> remain on your device for a
                set period or until you delete them.
              </li>
              <li>
                <strong>First-party cookies:</strong> set by
                AuctionMyPlate.co.uk.
              </li>
              <li>
                <strong>Third-party cookies:</strong> set by external services
                such as analytics or payment providers.
              </li>
            </ul>
          </section>

          {/* 4. Examples (generic) */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              4. Examples of Cookies in Use
            </h2>
            <p>Examples include (this is not an exhaustive list):</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Cookies that store your login session so you don&apos;t have to
                sign in on every page view.
              </li>
              <li>
                Cookies that remember your chosen preferences on the site (for
                example, display options or filters).
              </li>
              <li>
                Analytics cookies that help us measure how many people visit and
                which pages are most popular.
              </li>
            </ul>
          </section>

          {/* 5. Managing cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              5. Managing &amp; Disabling Cookies
            </h2>
            <p>
              You can choose to accept or reject cookies by adjusting your
              browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Delete existing cookies from your device.</li>
              <li>Block all cookies or certain types of cookies.</li>
              <li>
                Receive a warning before cookies are stored so you can decide.
              </li>
            </ul>
            <p className="mt-2">
              Please note that blocking or deleting certain cookies may affect
              the functionality of the site. For example, you may not be able to
              stay logged in, place bids, or complete purchases correctly if
              essential cookies are disabled.
            </p>
          </section>

          {/* 6. Third-party services */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              6. Third-Party Cookies &amp; Services
            </h2>
            <p>
              We may use third-party services (for example, analytics providers
              or payment processors) that set their own cookies. These cookies
              are controlled by the respective third parties and are subject to
              their own privacy and cookie policies.
            </p>
          </section>

          {/* 7. Updates */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              7. Changes to This Cookie Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in technology, law or how we operate the site. When we do,
              we will update the &quot;Effective Date&quot; at the top of this
              page.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-2">8. Contact Us</h2>
            <p>
              If you have questions about this Cookie Policy or how we use
              cookies, you can contact us at{" "}
              <strong>support@auctionmyplate.co.uk</strong>.
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
