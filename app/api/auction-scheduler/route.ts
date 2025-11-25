// app/api/auction-scheduler/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite"; // 👈 MUST be node-appwrite

export const runtime = "nodejs";

// -----------------------------
// APPWRITE SETUP
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey); // ✅ this ONLY exists on node-appwrite Client

const databases = new Databases(client);

// -----------------------------
// GET = manual scheduler run
// -----------------------------
export async function GET() {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1) Promote queued -> live when auction_start has passed
    const queuedRes = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
      Query.equal("status", "queued"),
      Query.lessThanEqual("auction_start", nowIso),
      Query.limit(100),
    ]);

    let promoted = 0;
    for (const doc of queuedRes.documents) {
      await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, doc.$id, {
        status: "live",
      });
      promoted++;
    }

    // 2) Mark finished live auctions as completed when auction_end has passed
    const liveRes = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
      Query.equal("status", "live"),
      Query.lessThanEqual("auction_end", nowIso),
      Query.limit(100),
    ]);

    let completed = 0;
    for (const doc of liveRes.documents) {
      await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, doc.$id, {
        status: "completed",
      });
      completed++;
    }

    return NextResponse.json({
      ok: true,
      now: nowIso,
      promoted,
      completed,
    });
  } catch (err: any) {
    console.error("auction-scheduler error", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
