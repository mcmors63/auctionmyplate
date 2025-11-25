// app/api/auction-rollover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV
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

// Server client
function getServerClient() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  return { databases };
}

/**
 * POST /api/auction-rollover
 *
 * - Find all QUEUED listings whose auction_start <= now
 * - Set status -> "live"
 * (For now we *only* do queued -> live. Live -> ended can be added later.)
 */
export async function POST(req: NextRequest) {
  try {
    const { databases } = getServerClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1) Find queued listings that should now be live
    const queued = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
      Query.equal("status", "queued"),
      Query.lessThanEqual("auction_start", nowIso),
    ]);

    let updatedCount = 0;

    for (const doc of queued.documents) {
      try {
        await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, doc.$id, {
          status: "live",
        });
        updatedCount++;
      } catch (err) {
        console.error(
          `Failed to update listing ${doc.$id} (${doc.registration}):`,
          err
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Rollover complete`,
      madeLive: updatedCount,
      now: nowIso,
    });
  } catch (err: any) {
    console.error("auction-rollover error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error in auction-rollover",
      },
      { status: 500 }
    );
  }
}

// Optional: simple GET for sanity check in browser
export async function GET(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "Use POST to actually run the rollover.",
  });
}
