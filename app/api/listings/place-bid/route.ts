import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listing_id, bid_amount, bidder_id } = body;

    // ✅ Validate
    if (!listing_id || !bid_amount || !bidder_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ✅ Insert bid into Supabase
    const { error } = await supabase.from("bids").insert([
      {
        listing_id,
        bid_amount,
        bidder_id,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ✅ Success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
