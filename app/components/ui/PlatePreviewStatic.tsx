"use client";

import React from "react";

type PlatePreviewStaticProps = {
  registration: string;
  width?: number;
  height?: number;
};

export default function PlatePreviewStatic({
  registration,
  width = 300,
  height = 70,
}: PlatePreviewStaticProps) {
  return (
    <div
      className="flex items-center justify-center relative"
      style={{
        backgroundColor: "#FFD500",
        border: "5px solid black",
        borderRadius: "8px",
        width: `${width}px`,
        height: `${height}px`,
        boxShadow:
          "0 0 2px #000, 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 3px rgba(0,0,0,0.3)",
        fontFamily: "'Charles Wright', 'Arial Black', sans-serif",
        color: "black",
        fontSize: `${height * 0.65}px`,
        letterSpacing: "0.25rem",
        textTransform: "uppercase",
      }}
    >
      {/* Optional left GB strip (static, decorative) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          height: "100%",
          width: `${width * 0.18}px`,
          backgroundColor: "#00247D",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${height * 0.35}px`,
          fontWeight: "bold",
          borderRight: "3px solid black",
        }}
      >
        GB
      </div>

      <span style={{ marginLeft: `${width * 0.22}px` }}>
        {registration || ""}
      </span>
    </div>
  );
}

{/* ✅ SELL A PLATE FORM */}
{activeTab === "sell" && (
  <div className="max-w-xl mx-auto">
    <h2 className="text-xl font-bold mb-4">Sell a Plate</h2>

    {error && (
      <div className="flex items-center bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md mb-4">
        <XCircleIcon className="w-5 h-5 mr-2 text-red-600" />
        <span>{error}</span>
      </div>
    )}

    {/* DVLA-style input */}
    <div className="flex justify-center mb-6">
      <div className="relative bg-[#FFE000] border-4 border-black rounded-lg w-[400px] h-[100px] flex items-center justify-center">
        <div className="absolute left-0 top-0 bottom-0 w-[50px] bg-[#003399] flex items-center justify-center">
          <span className="text-white font-bold text-lg">GB</span>
        </div>
        <input
          type="text"
          name="registration"
          placeholder="AB12 CDE"
          value={formData.registration}
          onChange={handleSellChange}
          maxLength={8}
          className="text-4xl font-bold text-black bg-transparent text-center tracking-[0.3em] outline-none w-[300px]"
        />
      </div>
    </div>

    {/* ✅ SELL FORM */}
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        name="plate_type"
        value={formData.plate_type}
        onChange={handleSellChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">Select Type</option>
        <option value="vehicle">On a Vehicle</option>
        <option value="retention">On Retention Certificate</option>
      </select>

      {formData.plate_type === "retention" && (
        <input
          type="date"
          name="expiry_date"
          value={formData.expiry_date}
          onChange={handleSellChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      )}

      <textarea
        name="description"
        value={formData.description}
        onChange={handleSellChange}
        placeholder="Description (optional)"
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      />

      <input
        type="number"
        name="reserve_price"
        value={formData.reserve_price}
        onChange={handleSellChange}
        placeholder="Reserve Price (£)"
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      />

      <input
        type="number"
        name="buy_now_price"
        value={formData.buy_now_price || ""}
        onChange={handleSellChange}
        placeholder="Buy Now Price (£)"
        className="w-full border border-gray-300 rounded-md px-3 py-2 mt-3"
      />

      {/* Fees summary */}
      <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-700">
        <p>Listing Fee: £{listingFee.toFixed(2)}</p>
        <p>Commission: {commissionRate}%</p>
        <p>Expected Return: £{expectedReturn.toFixed(2)}</p>
      </div>

      {/* Owner confirm */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          name="owner_confirmed"
          checked={formData.owner_confirmed}
          onChange={handleSellChange}
          className="mt-1"
        />
        <label className="text-sm text-gray-700">
          I confirm I am the legal owner or have permission to sell this registration mark.
        </label>
      </div>

      {/* Terms */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          name="agreed_terms"
          checked={formData.agreed_terms}
          onChange={handleSellChange}
          className="mt-1"
        />
        <label className="text-sm text-gray-700">
          I agree to the{" "}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("openTermsModal"));
              }
            }}
            className="text-yellow-600 underline hover:text-yellow-700"
          >
            Terms & Conditions
          </button>{" "}
          and understand the listing and selling fees.
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full bg-yellow-600 text-white font-semibold py-2 rounded-md hover:bg-yellow-700 transition ${
          submitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {submitting ? "Submitting..." : "Create Listing"}
      </button>
    </form>
  </div>
)}

"use client";

import { useEffect, useState } from "react";
import { Client, Databases, Account, Query } from "appwrite";
import { useRouter } from "next/navigation";
import PlatePreviewStatic from "../components/PlatePreviewStatic";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);
const account = new Account(client);

type Listing = {
  $id: string;
  registration: string;
  start_price: number;
  current_bid: number;
  buy_now?: number;
  reserve_price: number;
  auction_start?: string;
  auction_end?: string;
  status: string;
};

export default function CurrentListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState<Record<string, string>>({});

  useEffect(() => {
    account
      .get()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
          [Query.equal("status", "approved")]
        );
        setListings(res.documents);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        const updates: Record<string, string> = {};
        listings.forEach((listing) => {
          if (!listing.auction_end) return;
          const diff = new Date(listing.auction_end).getTime() - Date.now();
          if (diff <= 0) updates[listing.$id] = "Auction ended";
          else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            updates[listing.$id] = `${h}h ${m}m ${s}s`;
          }
        });
        return updates;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [listings]);

  const handleBid = async (listing: Listing) => {
    if (!user) {
      router.push("/register");
      return;
    }
    const currentBid = listing.current_bid ?? listing.start_price ?? 0;
    const bidAmount = prompt(`Enter your bid (must be higher than £${currentBid.toLocaleString()})`);
    if (!bidAmount) return;
    const bid = parseFloat(bidAmount);
    if (isNaN(bid) || bid <= currentBid) {
      alert("❌ Invalid bid.");
      return;
    }

    try {
      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.$id,
          newBid: bid,
          bidderEmail: user.email,
        }),
      });

      if (!res.ok) throw new Error("Bid failed");
      alert("✅ Bid placed!");
      setListings((prev) =>
        prev.map((l) => (l.$id === listing.$id ? { ...l, current_bid: bid } : l))
      );
    } catch (e) {
      console.error(e);
      alert("❌ Failed to place bid.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8 text-black">Current Live Listings</h1>

      {loading ? (
        <p>Loading listings...</p>
      ) : listings.length === 0 ? (
        <p>No live listings found.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div
              key={listing.$id}
              className="bg-white shadow-xl p-6 rounded-2xl border-2 border-yellow-400 text-center flex flex-col items-center"
            >
              <PlatePreviewStatic registration={listing.registration} />
              <p className="mt-3 text-lg font-semibold text-gray-800">
                Current Bid: £{listing.current_bid?.toLocaleString() ?? listing.start_price}
              </p>
              {listing.buy_now && (
                <p className="text-md text-green-600 mt-1">Buy Now: £{listing.buy_now.toLocaleString()}</p>
              )}
              <p
                className={`text-sm mt-2 font-semibold ${
                  timer[listing.$id] === "Auction ended" ? "text-red-600" : "text-gray-600"
                }`}
              >
                {timer[listing.$id] || "Calculating..."}
              </p>
              <button
                onClick={() => handleBid(listing)}
                disabled={timer[listing.$id] === "Auction ended"}
                className={`mt-4 w-full py-2 rounded-md font-semibold text-lg transition ${
                  timer[listing.$id] === "Auction ended"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-black text-yellow-400 hover:bg-yellow-400 hover:text-black"
                }`}
              >
                {timer[listing.$id] === "Auction ended" ? "Auction Ended" : "Place Bid"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
