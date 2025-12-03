// app/components/ui/Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

type User = {
  $id: string;
  email: string;
  name?: string;
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // -----------------------------
  // Load current session
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const current = await account.get();
        if (!alive) return;
        setUser(current as User);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setLoadingUser(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const isAdmin = user?.email === "admin@auctionmyplate.co.uk";

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore
    }
    setUser(null);
    router.push("/");
  };

  // Main nav links
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/fees", label: "Fees" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/current-listings", label: "Current Listings" },
    { href: "/sell-my-plate", label: "Sell My Plate" },
    // ✅ FIXED: point to your existing /dvla page
    { href: "/dvla", label: "DVLA Guidelines" },
    { href: "/faq", label: "FAQ" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur border-b border-yellow-600/40">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            <span className="text-white">AuctionMy</span>
            <span className="text-yellow-400">Plate.co.uk</span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-yellow-300"
                  : "text-gray-200 hover:text-yellow-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden md:flex items-center space-x-3">
          {loadingUser ? null : user ? (
            <>
              <Link
                href={isAdmin ? "/admin" : "/dashboard"}
                className="px-4 py-2 text-sm font-semibold rounded-md border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
              >
                {isAdmin ? "Admin" : "My Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold rounded-md border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold rounded-md bg-yellow-400 text-black hover:bg-yellow-300 transition"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 border border-yellow-500 rounded-md text-yellow-300"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="md:hidden border-t border-yellow-600/40 bg-black/98">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium py-1 ${
                    isActive(link.href)
                      ? "text-yellow-300"
                      : "text-gray-200 hover:text-yellow-300"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-yellow-700/40 pt-3 mt-2 flex flex-col space-y-2">
              {loadingUser ? null : user ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-md border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
                  >
                    {isAdmin ? "Admin" : "My Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-md border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-md bg-yellow-400 text-black hover:bg-yellow-300 transition"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
