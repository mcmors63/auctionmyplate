"use client";

import { useEffect, useState } from "react";
import { Client, Databases, Query } from "appwrite";
import Link from "next/link";

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

const AUCTIONS_DB = process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_DATABASE_ID!;
const AUCTIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_COLLECTION_ID!;

export default function AdminAuctionsPage() {
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [nextWeek, setNextWeek] = useState<any>(null);
  const [pastWeeks, setPastWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeeks = async () => {
      try {
        setLoading(true);

        const nowIso = new Date().toISOString();

        // Load current week (status = "current")
        const current = await databases.listDocuments(
          AUCTIONS_DB,
          AUCTIONS_COLLECTION,
          [Query.equal("status", "current")]
        );

        if (current.total > 0) setCurrentWeek(current.documents[0]);

        // Load next week (status = "coming")
        const next = await databases.listDocuments(
          AUCTIONS_DB,
          AUCTIONS_COLLECTION,
          [Query.equal("status", "coming")]
        );

        if (next.total > 0) setNextWeek(next.documents[0]);

        // Past weeks (status = "past")
        const past = await databases.listDocuments(
          AUCTIONS_DB,
          AUCTIONS_COLLECTION,
          [Query.equal("status", "past")]
        );

        setPastWeeks(past.documents);
      } catch (err) {
        console.error("Failed to load auction weeks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWeeks();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-700 mb-4">
        Auction Week Manager
      </h1>

      <Link href="/admin" className="text-blue-600 underline mb-6 inline-block">
        ← Back to Admin Dashboard
      </Link>

      {loading && <p>Loading auction weeks…</p>}

      {!loading && (
        <>
          {/* CURRENT WEEK */}
          {currentWeek && (
            <div className="border rounded-lg p-4 mb-6 bg-yellow-50">
              <h2 className="text-xl font-bold text-yellow-800">Current Week</h2>
              <p>Week Key: {currentWeek.week_key}</p>
              <p>Start: {new Date(currentWeek.start_time).toLocaleString("en-GB")}</p>
              <p>End: {new Date(currentWeek.end_time).toLocaleString("en-GB")}</p>
            </div>
          )}

          {/* NEXT WEEK */}
          {nextWeek && (
            <div className="border rounded-lg p-4 mb-6 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-800">Next Week</h2>
              <p>Week Key: {nextWeek.week_key}</p>
              <p>Start: {new Date(nextWeek.start_time).toLocaleString("en-GB")}</p>
              <p>End: {new Date(nextWeek.end_time).toLocaleString("en-GB")}</p>
            </div>
          )}

          {/* PAST WEEKS */}
          <h2 className="text-xl font-bold mt-6 mb-3">Past Weeks</h2>

          {pastWeeks.length === 0 && <p>No past auction weeks.</p>}

          {pastWeeks.map((w) => (
            <div key={w.$id} className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p>
                <strong>Week:</strong> {w.week_key}
              </p>
              <p>
                <strong>Start:</strong>{" "}
                {new Date(w.start_time).toLocaleString("en-GB")}
              </p>
              <p>
                <strong>End:</strong> {new Date(w.end_time).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
