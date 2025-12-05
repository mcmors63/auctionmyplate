// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";

// ✅ Existing imports
import Navbar from "@/components/ui/Navbar";
// ⬇️ Make sure this path matches your actual file name & case
import Footer from "@/components/ui/footer";
import AutoLogout from "@/components/ui/AutoLogout";

// ✅ Cookie banner
import CookieBanner from "@/components/ui/CookieBanner";

// ✅ Vercel Analytics
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Auction My Plate",
  description:
    "Buy and sell cherished number plates through weekly auctions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FFFFEA] text-black antialiased flex flex-col min-h-screen">
        <Navbar />

        <AutoLogout />

        <main className="flex-grow">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>

        <Footer />

        {/* 👇 Always rendered, decides itself whether to show */}
        <CookieBanner />

        {/* 👇 Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
