// app/api/stripe/has-payment-method/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";       // ✅ for Stripe on Next/Vercel
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export async function POST(req: Request) {
  // ✅ Never throw at the top level – always return JSON
  if (!stripeSecret) {
    console.error("STRIPE_SECRET_KEY is not set in the environment");
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

    // 1) Find or create Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          appwriteUserEmail: userEmail,
        },
      });
    }

    // 2) Check for at least one attached card
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    const hasPaymentMethod = paymentMethods.data.length > 0;

    return NextResponse.json({
      hasPaymentMethod,
      customerId: customer.id,
    });
  } catch (err: any) {
    console.error("Stripe has-payment-method error:", err);
    return NextResponse.json(
      { error: "Failed to check payment methods" },
      { status: 500 }
    );
  }
}
