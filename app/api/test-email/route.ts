// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    console.error("❌ Missing email env vars in /api/test-email", {
      SMTP_HOST: !!SMTP_HOST,
      SMTP_USER: !!SMTP_USER,
      SMTP_PASS: !!SMTP_PASS,
      FROM_EMAIL: !!FROM_EMAIL,
    });
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function GET() {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: "Email transport not configured" },
        { status: 500 }
      );
    }

    if (!TEST_EMAIL_TO) {
      return NextResponse.json(
        { error: "TEST_EMAIL_TO not set" },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: TEST_EMAIL_TO,
      subject: "AuctionMyPlate test email",
      text: "If you’re reading this, SMTP is working from your Next.js app.",
    });

    return NextResponse.json({ ok: true, sentTo: TEST_EMAIL_TO });
  } catch (err) {
    console.error("❌ /api/test-email failed:", err);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
