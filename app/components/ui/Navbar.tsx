// app/components/ui/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try real Appwrite session first
        const current = await account.get();
        setUser(current);

        // Sync localStorage fallback
        if (
          typeof window !== "undefined" &&
          current?.email &&
          !window.localStorage.getItem("amp_user_email")
        ) {
          window.localStorage.setItem("amp_user_email", current.email);
        }
      } catch (err) {
        // Fallback: check our local login marker
        if (typeof window !== "undefined") {
          const storedEmail = window.localStorage.getItem("amp_user_email");
          if (storedEmail) {
            setUser({ email: storedEmail });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoaded(true);
      }
    };

    loadUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("amp_user_email");
      }
      setUser(null);
      setLoaded(true);
      router.push("/login-or-register");
    }
  };

  const isAdmin = user?.email === "admin@auctionmyplate.co.uk";

  return (
    <nav className="bg-black text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
        {/* LOGO / BRAND */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight">
              <span className="text-white">AuctionMy</span>
              <span className="text-yellow-400">Plate</span>
              <span className="hidden sm:inline text-white">.co.uk</span>
            </span>
            <span className="hidden sm:block text-[11px] text-gray-400 tracking-[0.18em] uppercase">
              DVLA-Style Number Plate Auctions
            </span>
          </div>
        </Link>

        {/* NAV LINKS + AUTH – STACK NEATLY ON MOBILE */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 sm:gap-x-5 text-xs sm:text-sm">
          {/* Core links */}
          <Link href="/" className="hover:text-yellow-400">
            Home
          </Link>
          <Link href="/current-listings" className="hover:text-yellow-400">
            Current Listings
          </Link>
          <Link href="/sell-my-plate" className="hover:text-yellow-400">
            Sell My Plate
          </Link>
          <Link href="/about" className="hover:text-yellow-400">
            About
          </Link>
          <Link href="/fees" className="hover:text-yellow-400">
            Fees
          </Link>

          {/* DVLA GUIDELINES BUTTON */}
          <Link
            href="/dvla"
            className="bg-yellow-600 text-black font-semibold px-3 py-1 rounded hover:bg-yellow-500 text-xs sm:text-sm"
          >
            DVLA GUIDELINES
          </Link>

          {/* ADMIN LINK – ONLY WHEN ADMIN LOGGED IN */}
          {loaded && isAdmin && (
            <Link
              href="/admin"
              className="text-[11px] sm:text-sm text-gray-300 hover:text-yellow-300 underline"
            >
              Admin
            </Link>
          )}

          {/* AUTH AREA */}
          {loaded && !user && (
            <>
              <Link
                href="/login"
                className="bg-yellow-500 text-black font-semibold px-4 py-2 rounded hover:bg-yellow-400 text-xs sm:text-sm"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="border border-yellow-500 text-yellow-400 px-4 py-2 rounded hover:bg-yellow-600 hover:text-black text-xs sm:text-sm"
              >
                Register
              </Link>
            </>
          )}

          {loaded && user && (
            <>
              {isAdmin ? (
                <>
                  <span className="hidden sm:inline text-[11px] text-yellow-300">
                    Hi <strong>Admin</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded text-xs sm:text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="hover:text-yellow-300 font-semibold text-xs sm:text-sm"
                  >
                    Dashboard
                  </Link>

                  <span className="hidden sm:inline text-[11px] text-yellow-300">
                    Hi{" "}
                    <strong>
                      {user.name ||
                        (user.email ? user.email.split("@")[0] : "")}
                    </strong>
                  </span>

                  <button
                    onClick={handleLogout}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded text-xs sm:text-sm"
                  >
                    Logout
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
