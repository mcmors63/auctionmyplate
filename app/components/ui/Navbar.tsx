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
        const current = await account.get();
        setUser(current);

        if (
          typeof window !== "undefined" &&
          current?.email &&
          !window.localStorage.getItem("amp_user_email")
        ) {
          window.localStorage.setItem("amp_user_email", current.email);
        }
      } catch (err) {
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

   // --------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (err) {
      // Common case if session has already expired:
      // "User (role: guests) missing scopes (['account'])"
      console.warn(
        "Logout: no active Appwrite session, treating as logged out.",
        err
      );
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("amp_user_email");
        window.localStorage.removeItem("amp_user_name");
      }
      router.push("/login-or-register");
    }
  };

  const isAdmin = user?.email === "admin@auctionmyplate.co.uk";

  // Common classes for all top nav links so they look consistent
  const navLinkBase =
    "text-xs sm:text-sm font-semibold px-3 py-1 rounded transition-colors";
  const navLinkDefault =
    navLinkBase +
    " text-white hover:text-yellow-300 hover:bg-yellow-500/10";

  return (
    <nav className="bg-black text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-lg">
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

      {/* NAV LINKS */}
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center text-sm justify-end">
        {/* Left / main section */}
        <Link href="/" className={navLinkDefault}>
          Home
        </Link>
        <Link href="/about" className={navLinkDefault}>
          About
        </Link>
        <Link href="/fees" className={navLinkDefault}>
          Fees
        </Link>
        <Link href="/current-listings" className={navLinkDefault}>
          Current Listings
        </Link>
        <Link href="/sell-my-plate" className={navLinkDefault}>
          Sell My Plate
        </Link>
        <Link href="/dvla" className={navLinkDefault}>
          DVLA Guidelines
        </Link>

        {/* ADMIN LINK – ONLY WHEN ADMIN LOGGED IN */}
        {loaded && isAdmin && (
          <Link
            href="/admin"
            className={
              navLinkBase +
              " text-yellow-300 underline hover:text-yellow-200"
            }
          >
            Admin
          </Link>
        )}

        {/* LOGGED OUT – Login/Register */}
        {loaded && !user && (
          <>
            <Link
              href="/login"
              className={
                navLinkBase +
                " border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10"
              }
            >
              Login
            </Link>

            <Link
              href="/register"
              className={
                navLinkBase +
                " border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10"
              }
            >
              Register
            </Link>
          </>
        )}

        {/* LOGGED IN – Normal user or Admin */}
        {loaded && user && (
          <>
            {!isAdmin && (
              <Link
                href="/dashboard"
                className={navLinkDefault + " font-bold"}
              >
                Dashboard
              </Link>
            )}

            <span className="hidden sm:inline text-[11px] text-yellow-300">
              Hi{" "}
              <strong>
                {user.name || (user.email ? user.email.split("@")[0] : "")}
              </strong>
            </span>

            <button
              onClick={handleLogout}
              className={
                navLinkBase +
                " bg-yellow-400 text-black hover:bg-yellow-500"
              }
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
