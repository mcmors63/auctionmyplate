// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

// ✅ Existing imports
import Navbar from "@/components/ui/Navbar";
// ⬇️ Use the path that matches your file name:
// If your file is Footer.tsx → "@/components/ui/Footer"
// If it's footer.tsx → "@/components/ui/footer"
import Footer from "@/components/ui/footer";
import AutoLogout from "@/components/ui/AutoLogout";

// ✅ New: cookie banner
import CookieBanner from "@/components/ui/CookieBanner";

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

        <main className="flex-grow">{children}</main>

        <Footer />

        {/* 👇 Always rendered, decides itself whether to show */}
        <CookieBanner />
      </body>
    </html>
  );
}
