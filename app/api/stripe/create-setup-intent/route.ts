// app/api/stripe/create-setup-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export async function POST(req: Request) {
  if (!stripeSecret) {
    console.error("STRIPE_SECRET_KEY is not set");
    return NextResponse.json(
      {
        error: "Payment configuration error. Please contact support.",
        code: "NO_STRIPE_KEY",
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-06-20",
  });

  try {
    const { userEmail } = await req.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail" },
        { status: 400 }
      );
    }

    // 1) Find or create customer for this email
    const existing = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer: Stripe.Customer;
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          appwriteUserEmail: userEmail,
        },
      });
    }

    // 2) Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (err: any) {
    console.error("create-setup-intent error:", err);
    return NextResponse.json(
      {
        error: "Failed to create setup intent",
      },
      { status: 500 }
    );
  }
}
