// app/api/admin/new-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// SMTP CONFIG (same as /api/test-email)
// -----------------------------
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || "465");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from =
  process.env.FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER; // fall back to login

if (!host || !user || !pass || !from) {
  console.error("❌ Missing email env vars in /api/admin/new-listing", {
    SMTP_HOST: !!host,
    SMTP_USER: !!user,
    SMTP_PASS: !!pass,
    FROM_EMAIL: !!from,
  });
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for 587
  auth: { user, pass },
});

// -----------------------------
// POST handler
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      plateId,
      registration,
      sellerEmail,
      reserve_price,
      starting_price,
      buy_now,
    } = body;

    if (!plateId || !registration || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing plateId, registration or sellerEmail" },
        { status: 400 }
      );
    }

    const adminTo = "admin@auctionmyplate.co.uk";

    // -------- Admin email --------
    const adminSubject = `New plate submitted: ${registration}`;
    const adminHtml = `
      <h2>New Listing Submitted</h2>
      <p>A seller has submitted a new plate for approval.</p>
      <ul>
        <li><strong>Plate ID:</strong> ${plateId}</li>
        <li><strong>Registration:</strong> ${registration}</li>
        <li><strong>Seller:</strong> ${sellerEmail}</li>
        <li><strong>Reserve:</strong> £${reserve_price ?? "0"}</li>
        <li><strong>Starting price:</strong> £${starting_price ?? "0"}</li>
        <li><strong>Buy Now:</strong> £${buy_now ?? "0"}</li>
      </ul>
      <p>Log in to the admin dashboard to review and approve this listing.</p>
    `;

    await transporter.sendMail({
      from,
      to: adminTo,
      subject: adminSubject,
      html: adminHtml,
    });

    // -------- Seller email --------
    const sellerSubject = `Your plate has been submitted: ${registration}`;
    const sellerHtml = `
      <h2>Thanks for listing your plate!</h2>
      <p>We have received your listing for <strong>${registration}</strong>.</p>
      <p>Our team will review it shortly. You will receive another email once it has been approved and queued for auction.</p>
      <p>If you did not create this listing, please contact us immediately at support@auctionmyplate.co.uk.</p>
      <p>– AuctionMyPlate.co.uk</p>
    `;

    await transporter.sendMail({
      from,
      to: sellerEmail,
      subject: sellerSubject,
      html: sellerHtml,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ /api/admin/new-listing error:", err);
    return NextResponse.json(
      { error: "Failed to send new listing emails" },
      { status: 500 }
    );
  }
}
