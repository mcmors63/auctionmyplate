// app/api/stripe/charge-off-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// Stripe init
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment");
}

// Use a recent Stripe API version
const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20" as any,
});

// -----------------------------
// POST /api/stripe/charge-off-session
// Body: { userEmail, amountInPence, description?, metadata? }
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userEmail,
      amountInPence,
      description,
      metadata,
    }: {
      userEmail?: string;
      amountInPence?: number | string;
      description?: string;
      metadata?: Record<string, string>;
    } = body;

    if (!userEmail || amountInPence == null) {
      return NextResponse.json(
        { error: "Missing userEmail or amountInPence" },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(amountInPence));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amountInPence" },
        { status: 400 }
      );
    }

    // 1) Find (or create) the customer by email
    const existing = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer = existing.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email: userEmail,
      });
    }

    // 2) Get the saved card payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    if (!paymentMethods.data.length) {
      return NextResponse.json(
        {
          error:
            "No saved card found for this customer. Ask the user to add a payment method first.",
          requiresPaymentMethod: true,
        },
        { status: 402 }
      );
    }

    const paymentMethod = paymentMethods.data[0];

    // 3) Create + confirm off-session PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      customer: customer.id,
      payment_method: paymentMethod.id,
      confirm: true,
      off_session: true,
      description: description || "AuctionMyPlate charge",
      metadata: {
        email: userEmail,
        source: "auctionmyplate",
        ...(metadata || {}),
      },
    });

    return NextResponse.json({
      ok: true,
      paymentIntentId: intent.id,
      status: intent.status,
    });
  } catch (err: any) {
    console.error("charge-off-session error:", err);

    // Stripe card errors often include payment_intent info
    const stripeError = err as Stripe.StripeError & {
      raw?: { payment_intent?: Stripe.PaymentIntent };
    };

    const base: any = {
      error: stripeError.message || "Stripe charge failed.",
      type: stripeError.type,
      code: (stripeError as any).code,
    };

    if (stripeError.raw?.payment_intent) {
      base.paymentIntentId = stripeError.raw.payment_intent.id;
      base.paymentIntentStatus = stripeError.raw.payment_intent.status;
    }

    // 402 = payment required
    return NextResponse.json(base, { status: 402 });
  }
}
