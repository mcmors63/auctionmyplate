import { NextResponse } from "next/server";
import { Client, Databases, Query } from "appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // server key

const databases = new Databases(client);

export async function GET() {
  try {
    //
    // 1. GET THE CURRENT WEEK + NEXT WEEK
    //
    const { now, currentStart, currentEnd, nextStart } = getAuctionWindow();

    const nowTs = now.getTime();
    const weekStartTs = currentStart.getTime();
    const weekEndTs = currentEnd.getTime();

    //
    // 2. GET ALL PLATES
    //
    const plates = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!
    );

    let updates = 0;

    //
    // 3. ROLLOVER QUEUED → LIVE (at Sunday 00:00)
    //
    if (nowTs >= weekStartTs && nowTs < weekEndTs) {
      for (const p of plates.documents) {
        if (p.status === "queued" && p.auction_start) {
          // Start = now
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
            p.$id,
            {
              status: "live",
            }
          );
          updates++;
        }
      }
    }

    //
    // 4. ROLLOVER LIVE → ENDED (after Sunday 23:59)
    //
    if (nowTs > weekEndTs) {
      for (const p of plates.documents) {
        if (p.status === "live" && p.auction_end) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
            p.$id,
            {
              status: "ended",
            }
          );
          updates++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      updates,
      message: updates > 0 ? "Rollover complete" : "No changes needed",
    });
  } catch (err) {
    console.error("Rollover error:", err);
    return NextResponse.json(
      { error: "Rollover failed", detail: String(err) },
      { status: 500 }
    );
  }
}
