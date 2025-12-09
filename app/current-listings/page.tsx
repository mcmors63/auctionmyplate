// app/current-listings/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import ListingCard from "./ListingCard";
import { Client, Databases, Query } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

export default function CurrentListingsPage() {
  const [tab, setTab] = useState<"live" | "soon">("live");
  const [live, setLive] = useState<any[]>([]);
  const [soon, setSoon] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("ending");

  // ------------------------------------------------------------
  // LOAD LISTINGS
  // ------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Include BOTH live + sold so Buy-Now lots stay on the page
        const liveRes = await databases.listDocuments(DB_ID, COLLECTION_ID, [
          Query.equal("status", ["live", "sold"]),
        ]);

        const soonRes = await databases.listDocuments(DB_ID, COLLECTION_ID, [
          Query.equal("status", "queued"),
        ]);

        setLive(liveRes.documents);
        setSoon(soonRes.documents);
      } catch (err) {
        console.error("Failed to load current listings:", err);
        setLive([]);
        setSoon([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ------------------------------------------------------------
  // FILTER + SORT
  // ------------------------------------------------------------
  const filtered = useMemo(() => {
    const source = tab === "live" ? live : soon;
    let results = [...source];

    if (search.trim() !== "") {
      results = results.filter((l) =>
        l.registration?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === "ending") {
      results.sort((a, b) => {
        const aTime = new Date(a.auction_end ?? a.auction_start).getTime();
        const bTime = new Date(b.auction_end ?? b.auction_start).getTime();
        return aTime - bTime;
      });
    }

    if (sort === "newest") {
      results.sort(
        (a, b) =>
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );
    }

    if (sort === "az") {
      results.sort((a, b) =>
        (a.registration || "").localeCompare(b.registration || "")
      );
    }

    if (sort === "priceLow") {
      results.sort((a, b) => (a.current_bid || 0) - (b.current_bid || 0));
    }

    if (sort === "priceHigh") {
      results.sort((a, b) => (b.current_bid || 0) - (a.current_bid || 0));
    }

    return results;
  }, [tab, live, soon, search, sort]);

  // ------------------------------------------------------------
  // RETURN JSX
  // ------------------------------------------------------------
  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-yellow-100 p-6 md:p-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-400 tracking-tight">
              Current Listings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Browse live auctions and queued plates ready for upcoming sales.
            </p>
          </div>
        </header>

        {/* TABS */}
        <div className="flex justify-center md:justify-start gap-3 mb-6 border-b border-gray-200 pb-3">
          <button
            onClick={() => setTab("live")}
            className={`px-4 md:px-5 py-2 text-sm md:text-base font-semibold rounded-full border transition ${
              tab === "live"
                ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Live Auctions
          </button>

          <button
            onClick={() => setTab("soon")}
            className={`px-4 md:px-5 py-2 text-sm md:text-base font-semibold rounded-full border transition ${
              tab === "soon"
                ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Queued / Coming Soon
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#FFFCF3] border border-yellow-100 p-4 rounded-xl mb-8">
          <div className="w-full md:w-1/2">
            <label className="block text-xs font-semibold text-yellow-500 mb-1">
              Search by registration
            </label>
            <input
              type="text"
              placeholder="e.g. AB12 CDE"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>

          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-yellow-500 mb-1">
              Sort listings
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            >
              <option value="ending">Ending Soon</option>
              <option value="newest">Newest</option>
              <option value="az">Registration A → Z</option>
              <option value="priceLow">Price (Low → High)</option>
              <option value="priceHigh">Price (High → Low)</option>
            </select>
          </div>
        </div>

        {/* GRID */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && (
            <p className="col-span-full text-center text-gray-500 text-sm">
              Loading listings…
            </p>
          )}

          {!loading &&
            filtered
              .filter((l) => l && typeof l === "object" && l.$id)
              .map((listing) => (
                <ListingCard key={listing.$id} listing={listing} />
              ))}

          {!loading &&
            filtered.filter((l) => l && l.$id).length === 0 && (
              <p className="col-span-full text-center text-gray-600 text-sm">
                No listings match your filters.
              </p>
            )}
        </div>
      </div>
    </main>
  );
}
