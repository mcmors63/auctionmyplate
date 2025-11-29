// app/api/stripe/charge-off-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// Stripe setup
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecret) {
  console.warn(
    "STRIPE_SECRET_KEY is not set. /api/stripe/charge-off-session will return an error."
  );
}

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// -----------------------------
// POST /api/stripe/charge-off-session
// Charge a saved card off-session for a user
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured on the server.",
          requiresPaymentMethod: true,
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      userEmail,
      amountInPence,
      description,
      metadata,
    }: {
      userEmail?: string;
      amountInPence?: number;
      description?: string;
      metadata?: Record<string, string>;
    } = body;

    if (!userEmail || !amountInPence) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing userEmail or amountInPence.",
        },
        { status: 400 }
      );
    }

    // 1) Find or create customer by email
    const existing = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer = existing.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email: userEmail });
    }

    // 2) Get a saved card for this customer
    const pmList = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });

    if (!pmList.data.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No saved card found for this customer.",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    const paymentMethod = pmList.data[0];

    // 3) Create an off-session PaymentIntent and confirm it
    const intent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: "gbp",
      customer: customer.id,
      payment_method: paymentMethod.id,
      off_session: true,
      confirm: true,
      description: description || undefined,
      metadata: metadata || {},
    });

    return NextResponse.json({
      ok: true,
      paymentIntentId: intent.id,
      status: intent.status,
    });
  } catch (err: any) {
    console.error("charge-off-session error:", err);

    const anyErr = err as any;
    const pi = anyErr?.raw?.payment_intent;

    return NextResponse.json(
      {
        ok: false,
        error: anyErr?.message || "Stripe charge failed.",
        requiresPaymentMethod:
          anyErr?.code === "authentication_required" ||
          anyErr?.code === "card_declined" ||
          false,
        paymentIntentId: pi?.id,
        paymentIntentStatus: pi?.status,
      },
      { status: 400 }
    );
  }
}
