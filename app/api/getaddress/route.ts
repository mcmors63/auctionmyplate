// app/api/getaddress/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get("postcode");

    if (!postcode) {
      return NextResponse.json(
        { error: "Missing postcode" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GETADDRESS_API_KEY;
    if (!apiKey) {
      console.error("GETADDRESS_API_KEY is missing in env");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const url = `https://api.getaddress.io/find/${encodeURIComponent(
      postcode
    )}?api-key=${apiKey}`;

    const res = await fetch(url);

    const data = await res.json();

    if (!res.ok) {
      console.error("GetAddress error:", data);
      return NextResponse.json(
        {
          error:
            (data && (data.Message || data.message)) ||
            "Address lookup failed",
        },
        { status: res.status }
      );
    }

    // Normalise so the client always gets { addresses: string[] }
    const addresses = Array.isArray(data.addresses) ? data.addresses : [];

    return NextResponse.json({ addresses });
  } catch (err) {
    console.error("Unexpected error in /api/getaddress:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
