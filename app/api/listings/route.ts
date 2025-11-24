import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      reg_number,
      starting_price,
      reserve_price,
      expiry_date,
      plate_status,
      owner_id,
      auction_start,
      auction_end,
    } = body;

    // ✅ Basic validation
    if (!reg_number || !starting_price || !reserve_price || !owner_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Prepare data for insertion
    const newListing = {
      reg_number,
      starting_price: parseFloat(starting_price),
      reserve_price: parseFloat(reserve_price),
      expiry_date: expiry_date ? expiry_date : null,
      plate_status,
      owner_id,
      auction_start: auction_start ? new Date(auction_start).toISOString() : null,
      auction_end: auction_end ? new Date(auction_end).toISOString() : null,
      created_at: new Date().toISOString(),
    };

    // ✅ Insert into Supabase
    const { error } = await supabase.from("listings").insert([newListing]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ✅ Success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
