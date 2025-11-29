// app/api/stripe/has-payment-method/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// Stripe setup
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecret) {
  console.warn(
    "STRIPE_SECRET_KEY is not set. /api/stripe/has-payment-method will always fail."
  );
}

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// -----------------------------
// POST /api/stripe/has-payment-method
// Checks whether a customer (by email) has at least one saved card
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured on the server.",
          hasPaymentMethod: false,
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      userEmail,
      userId,
    }: {
      userEmail?: string;
      userId?: string | null;
    } = body;

    if (!userEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing userEmail.",
          hasPaymentMethod: false,
        },
        { status: 400 }
      );
    }

    // 1) Try to find an existing customer by email
    const existing = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer = existing.data[0];

    // If none found, then definitely no saved card
    if (!customer) {
      return NextResponse.json(
        {
          ok: true,
          hasPaymentMethod: false,
        },
        { status: 200 }
      );
    }

    // 2) List card payment methods for this customer
    const methods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    const hasPaymentMethod = methods.data.length > 0;

    return NextResponse.json(
      {
        ok: true,
        hasPaymentMethod,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("has-payment-method error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Could not verify payment method.",
        hasPaymentMethod: false,
      },
      { status: 500 }
    );
  }
}
