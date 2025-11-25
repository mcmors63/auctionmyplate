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

        const liveRes = await databases.listDocuments(DB_ID, COLLECTION_ID, [
          Query.equal("status", "live"),
        ]);

        const soonRes = await databases.listDocuments(DB_ID, COLLECTION_ID, [
          Query.equal("status", "queued"),
        ]);

        setLive(liveRes.documents);
        setSoon(soonRes.documents);
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
    <main className="min-h-screen bg-[#F5F5F5] text-gray-900">

      {/* DVLA HEADER BAR */}
      <div className="w-full bg-yellow-300 border-b-4 border-black py-4 text-center">
        <h2 className="text-xl font-extrabold text-black tracking-wide uppercase"></h2>
      </div>

      <div className="px-6 py-12">
        
        {/* PAGE TITLE */}
        <h1 className="text-center text-4xl font-extrabold text-black mb-10 tracking-tight">
          Current Listings
        </h1>

        {/* TABS */}
        <div className="max-w-xl mx-auto flex justify-center gap-4 mb-8">
          <button
            onClick={() => setTab("live")}
            className={`px-6 py-3 rounded-lg font-bold transition border ${
              tab === "live"
                ? "bg-black text-white border-black shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Live
          </button>

          <button
            onClick={() => setTab("soon")}
            className={`px-6 py-3 rounded-lg font-bold transition border ${
              tab === "soon"
                ? "bg-black text-white border-black shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Queued
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-gray-300 p-4 rounded-xl shadow-sm mb-10">
          
          <input
            type="text"
            placeholder="Search registration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-lg bg-white border border-gray-400 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-black"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full md:w-1/4 px-4 py-2 rounded-lg bg-white border border-gray-400 text-gray-900 focus:outline-none focus:border-black"
          >
            <option value="ending">Ending Soon</option>
            <option value="newest">Newest</option>
            <option value="az">A → Z</option>
            <option value="priceLow">Price (Low → High)</option>
            <option value="priceHigh">Price (High → Low)</option>
          </select>
        </div>

        {/* GRID */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && (
            <p className="col-span-full text-center text-gray-500">Loading…</p>
          )}

          {!loading &&
            filtered
              .filter((l) => l && typeof l === "object" && l.$id)
              .map((listing) => (
                <ListingCard key={listing.$id} listing={listing} />
              ))}

          {!loading &&
            filtered.filter((l) => l && l.$id).length === 0 && (
              <p className="col-span-full text-center text-gray-600">
                No listings match your filters.
              </p>
            )}
        </div>

      </div>
    </main>
  );
}
