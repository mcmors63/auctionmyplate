"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CurrentListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("approved", true);

      if (!error) setListings(data || []);
      setLoading(false);
    };

    fetchListings();
  }, []);

  if (loading) return <p className="p-6">Loading listings...</p>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Current Listings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// ListingCard component (handles timer and bidding)
// ---------------------------------------------------------------
function ListingCard({ item }: { item: any }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Countdown Timer
  useEffect(() => {
    if (!item.auction_end) return;

    const timer = setInterval(() => {
      const auctionEnd = new Date(item.auction_end).getTime();
      const now = Date.now();
      const diff = auctionEnd - now;

      if (diff <= 0) {
        setTimeLeft("Auction ended");
        clearInterval(timer);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      setTimeLeft(formatted);
    }, 1000);

    return () => clearInterval(timer);
  }, [item.auction_end]);

  // Place Bid Handler
  const handleBid = async () => {
    const bid = prompt("Enter your bid amount (£):");
    if (!bid) return;

    try {
      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: item.id,
          bid_amount: parseFloat(bid),
          user_id: "demo-user", // temp until login system connects
        }),
      });

      const data = await res.json();
      console.log("API Response:", data);

      if (!res.ok) {
        alert("Error: " + data.error);
      } else {
        alert("✅ Bid placed successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Error placing bid. Check console for details.");
    }
  };

  // Render listing card
  return (
    <div className="border rounded-xl shadow-md overflow-hidden bg-white">
      {/* Plate Display */}
      <div className="relative bg-gray-100 p-6 flex justify-center">
        <div
          className="w-full max-w-[280px] h-[70px] flex items-center justify-center font-bold text-3xl"
          style={{
            backgroundColor: "#FFD300",
            color: "#000",
            borderRadius: "6px",
            fontFamily: "'Charles Wright', 'Arial Black', sans-serif",
            border: "4px solid #000",
            letterSpacing: "4px",
          }}
        >
          {item.reg_number}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <p className="text-gray-700">
          Starting Price:{" "}
          <span className="font-semibold text-black">£{item.starting_price}</span>
        </p>
        <p className="text-gray-700">Reserve Price: £{item.reserve_price}</p>
        <p>Status: {item.plate_status}</p>
        {item.plate_status === "certificate" && (
          <p>Expiry: {item.expiry_date}</p>
        )}

        {/* Countdown */}
        {item.auction_end && (
          <p
            className={`mt-3 text-lg font-semibold ${
              timeLeft === "Auction ended"
                ? "text-gray-500"
                : timeLeft < "00:10:00"
                ? "text-red-600"
                : "text-black"
            }`}
          >
            Time left: {timeLeft}
          </p>
        )}

        {/* Place Bid Button */}
        <div className="mt-4">
          <button
            onClick={handleBid}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Place Bid
          </button>
        </div>
      </div>
    </div>
  );
}
import AuctionTimer from './AuctionTimer';

<AuctionTimer endTime="2025-11-02T23:59:00Z" />
