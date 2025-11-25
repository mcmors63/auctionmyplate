import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";
import nodemailer from "nodemailer";

// ✅ Appwrite server setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

export async function POST(req: Request) {
  try {
    const { listingId, seller_email, registration } = await req.json();

    if (!listingId || !seller_email || !registration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { currentStart, currentEnd } = getAuctionWindow();

    // ✅ Update listing to queued for next auction
    const updated = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      listingId,
      {
        status: "queued",
        auction_start: currentStart.toISOString(),
        auction_end: currentEnd.toISOString(),
      }
    );

    // ✅ Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"AuctionMyPlate" <no-reply@auctionmyplate.co.uk>`,
      to: seller_email,
      subject: `✅ ${registration} has been re-listed`,
      text: `Your number plate ${registration} has been successfully re-listed for the upcoming auction starting on ${currentStart.toLocaleDateString(
        "en-GB"
      )}.\n\nGood luck this time!\n\n— AuctionMyPlate Team`,
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Relist error:", error);
    return NextResponse.json(
      { error: "Failed to relist plate", details: (error as any).message },
      { status: 500 }
    );
  }
}
