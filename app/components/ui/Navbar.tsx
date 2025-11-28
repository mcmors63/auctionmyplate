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

      {/* NAV CONTENT */}
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center text-sm justify-end">

        {/* LEFT: TEXT LINKS IN ORDER */}
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          <Link href="/" className="hover:text-yellow-400 text-xs sm:text-sm">
            Home
          </Link>

          <Link
            href="/about"
            className="hover:text-yellow-400 text-xs sm:text-sm"
          >
            About
          </Link>

          <Link
            href="/fees"
            className="hover:text-yellow-400 text-xs sm:text-sm"
          >
            Fees
          </Link>
        </div>

        {/* MIDDLE: BIG CTA BUTTONS (Current Listings, Sell My Plate, DVLA) */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center ml-1 sm:ml-4">
          {/* CURRENT LISTINGS – big yellow button */}
          <Link
            href="/current-listings"
            className="whitespace-nowrap bg-yellow-500 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md hover:bg-yellow-400 text-xs sm:text-sm border border-yellow-300 shadow-sm"
          >
            Current Listings
          </Link>

          {/* SELL MY PLATE – match DVLA button style */}
          <Link
            href="/sell-my-plate"
            className="whitespace-nowrap bg-yellow-600 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md hover:bg-yellow-500 text-xs sm:text-sm border border-yellow-400 shadow-sm"
          >
            Sell My Plate
          </Link>

          {/* DVLA GUIDELINES – same wrapped button style */}
          <Link
            href="/dvla"
            className="whitespace-nowrap bg-yellow-600 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md hover:bg-yellow-500 text-xs sm:text-sm border border-yellow-400 shadow-sm"
          >
            DVLA Guidelines
          </Link>
        </div>

        {/* RIGHT: AUTH + ADMIN AREA */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center ml-1 sm:ml-4">
          {/* ADMIN LINK – ONLY WHEN ADMIN LOGGED IN */}
          {loaded && isAdmin && (
            <Link
              href="/admin"
              className="text-xs sm:text-sm text-gray-300 hover:text-yellow-300 underline"
            >
              Admin
            </Link>
          )}

          {/* LOGGED OUT – Login/Register in order */}
          {loaded && !user && (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap bg-transparent border border-yellow-500 text-yellow-400 px-3 sm:px-4 py-1.5 rounded-md hover:bg-yellow-600 hover:text-black text-xs sm:text-sm"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="whitespace-nowrap bg-yellow-500 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md hover:bg-yellow-400 text-xs sm:text-sm border border-yellow-300"
              >
                Register
              </Link>
            </>
          )}

          {/* LOGGED IN – Normal user or Admin */}
          {loaded && user && (
            <>
              {isAdmin ? (
                <>
                  <span className="hidden sm:inline text-xs text-yellow-300">
                    Hi <strong>Admin</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="whitespace-nowrap bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="hover:text-yellow-300 font-semibold text-xs sm:text-sm whitespace-nowrap"
                  >
                    Dashboard
                  </Link>

                  <span className="hidden sm:inline text-xs text-yellow-300">
                    Hi{" "}
                    <strong>
                      {user.name ||
                        (user.email ? user.email.split("@")[0] : "")}
                    </strong>
                  </span>

                  <button
                    onClick={handleLogout}
                    className="whitespace-nowrap bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm"
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
