"use client";

import { useState } from "react";
import Link from "next/link";
import TermsModal from "@/components/ui/TermsModal";

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      {/* ✅ Footer Section */}
      <footer className="relative z-10 bg-black text-yellow-400 py-6 text-center border-t border-yellow-600/40">
        <p className="text-sm">
          © {new Date().getFullYear()} AuctionMyPlate.co.uk. All rights
          reserved.{" "}
          <button
            onClick={() => setShowTerms(true)}
            className="underline hover:text-yellow-200 transition"
          >
            Terms &amp; Conditions
          </button>
          {" · "}
          <Link
            href="/privacy"
            className="underline hover:text-yellow-200 transition"
          >
            Privacy Policy
          </Link>
          {" · "}
          <Link
            href="/cookies"
            className="underline hover:text-yellow-200 transition"
          >
            Cookie Policy
          </Link>
          {" · "}
          <Link
            href="/contact"
            className="underline hover:text-yellow-200 transition"
          >
            Contact Us
          </Link>
        </p>
      </footer>

      {/* ✅ Terms & Conditions Modal (reusing the central component) */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </>
  );
}
