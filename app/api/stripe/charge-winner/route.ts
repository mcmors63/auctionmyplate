// app/api/stripe/charge-winner/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// Make sure this is set in .env.local (you already use it for the other routes)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY in environment. Set it in .env.local."
  );
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// £80 DVLA fee (in pence)
const DVLA_FEE_PENCE = 80_00; // 8000

type ChargeWinnerBody = {
  listingId?: string;
  winnerEmail: string;
  amountInPence: number; // final bid amount, in pence
  dvlaFeeIncluded?: boolean; // if true, we do NOT add £80 again
  dvlaFeeOverridePence?: number; // optional override if you ever want it different
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChargeWinnerBody;

    const {
      listingId,
      winnerEmail,
      amountInPence,
      dvlaFeeIncluded,
      dvlaFeeOverridePence,
    } = body;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!winnerEmail || typeof winnerEmail !== "string") {
      return NextResponse.json(
        { ok: false, error: "winnerEmail is required." },
        { status: 400 }
      );
    }

    if (
      amountInPence == null ||
      typeof amountInPence !== "number" ||
      !Number.isInteger(amountInPence) ||
      amountInPence <= 0
    ) {
      return NextResponse.json(
        { ok: false, error: "amountInPence must be a positive integer." },
        { status: 400 }
      );
    }

    // -----------------------------
    // CALCULATE TOTAL CHARGE
    // -----------------------------
    let totalAmount = amountInPence;

    if (!dvlaFeeIncluded) {
      const feeToAdd =
        typeof dvlaFeeOverridePence === "number" &&
        Number.isInteger(dvlaFeeOverridePence) &&
        dvlaFeeOverridePence > 0
          ? dvlaFeeOverridePence
          : DVLA_FEE_PENCE;

      totalAmount += feeToAdd;
    }

    // -----------------------------
    // FIND STRIPE CUSTOMER BY EMAIL
    // -----------------------------
    const customers = await stripe.customers.list({
      email: winnerEmail,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          error: "No Stripe customer found for this email.",
          detail:
            "User probably never completed the setup-intent / save-card step.",
        },
        { status: 404 }
      );
    }

    // -----------------------------
    // GET DEFAULT PAYMENT METHOD
    // -----------------------------
    let paymentMethodId =
      (customer.invoice_settings
        ?.default_payment_method as string | null) ?? null;

    if (!paymentMethodId) {
      // Fallback: use first saved card, if any
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: "card",
        limit: 1,
      });

      if (!paymentMethods.data.length) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Customer has no saved card on file. Cannot charge off-session.",
          },
          { status: 400 }
        );
      }

      paymentMethodId = paymentMethods.data[0].id;
    }

    // -----------------------------
    // CREATE OFF-SESSION PAYMENT INTENT
    // -----------------------------
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "gbp",
      customer: customer.id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Auction winner charge for listing ${
        listingId ?? "unknown"
      }`,
      metadata: {
        type: "auction_winner_charge",
        listingId: listingId ?? "",
        winnerEmail,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amountCharged: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Stripe charge-winner error:", err);

    // Stripe-specific error details (useful for logs / UI later)
    const stripeError = err?.raw ?? err;

    const message =
      stripeError?.message ||
      err?.message ||
      "Failed to charge winner off-session.";

    const code = stripeError?.code;
    const declineCode = stripeError?.decline_code;

    // If card needs authentication or is declined, return 402
    const statusCode =
      code === "authentication_required" || code === "card_declined"
        ? 402
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code,
        declineCode,
      },
      { status: statusCode }
    );
  }
}
