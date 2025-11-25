"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "amp_cookie_consent"; // localStorage key

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run in the browser
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== "accepted") {
        setVisible(true);
      }
    } catch (err) {
      console.error("Cookie banner storage error:", err);
      // If storage fails, still show the banner
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "accepted");
      }
    } catch (err) {
      console.error("Failed to store cookie consent:", err);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      <div className="mx-auto max-w-5xl mb-4 px-4">
        <div className="bg-black text-yellow-50 border border-yellow-500/60 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-100">
            <p className="font-semibold text-yellow-300 mb-1">
              We use cookies
            </p>
            <p>
              We use essential and analytics cookies to keep the site working,
              improve performance and help you bid securely. For details, see
              our{" "}
              <Link
                href="/cookies"
                className="underline text-yellow-300 hover:text-yellow-200"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <Link
              href="/privacy"
              className="text-[11px] sm:text-xs underline text-gray-300 hover:text-yellow-200"
            >
              Privacy Policy
            </Link>

            <button
              onClick={handleAccept}
              className="px-4 py-2 rounded-full bg-yellow-400 text-black text-xs sm:text-sm font-semibold hover:bg-yellow-300 transition"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
