// app/api/stripe/create-setup-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// ENV / STRIPE SETUP
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "[create-setup-intent] STRIPE_SECRET_KEY is not set. This route will fail."
  );
}

// Use default API version to avoid TS literal issues
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: undefined as any,
    })
  : null;

// -----------------------------
// POST /api/stripe/create-setup-intent
// Body (from client):
//   { userId?: string, userEmail?: string }  OR  { email: string }
// Returns:
//   { clientSecret: string }
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const userId = (body as any).userId as string | undefined;
    const email =
      ((body as any).userEmail as string | undefined) ||
      ((body as any).email as string | undefined);

    if (!email) {
      return NextResponse.json(
        { error: "Email (userEmail or email) is required." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 1) Find or create Stripe customer
    // -----------------------------
    const existing = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customer = existing.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: userId ? { appwriteUserId: userId } : undefined,
      });
    }

    // -----------------------------
    // 2) Create SetupIntent to save a card
    // -----------------------------
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      metadata: {
        email,
        ...(userId ? { appwriteUserId: userId } : {}),
      },
    });

    if (!setupIntent.client_secret) {
      console.error(
        "[create-setup-intent] SetupIntent created without client_secret",
        setupIntent.id
      );
      return NextResponse.json(
        { error: "Failed to create setup intent (no client secret)." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { clientSecret: setupIntent.client_secret },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[create-setup-intent] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create setup intent." },
      { status: 500 }
    );
  }
}
