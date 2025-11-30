// app/api/stripe/charge-transaction/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  Client as AppwriteClient,
  Databases,
} from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn(
    "[charge-transaction] STRIPE_SECRET_KEY is not set. This route will fail until configured."
  );
}

const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-06-20",
});

// Appwrite (server-side)
const appwriteEndpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";
const appwriteProject =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";
const appwriteApiKey = process.env.APPWRITE_API_KEY || "";

// Transactions use the plates DB
const TX_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// Profiles (for stripe_customer_id)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!;
const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

function getAppwrite() {
  if (!appwriteEndpoint || !appwriteProject || !appwriteApiKey) {
    throw new Error(
      "Appwrite env vars missing (APPWRITE_ENDPOINT / PROJECT_ID / API_KEY)."
    );
  }

  const client = new AppwriteClient()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteApiKey);

  const databases = new Databases(client);
  return { databases };
}

// -----------------------------
// Helpers
// -----------------------------
async function getBuyerProfileByEmail(email: string) {
  const { databases } = getAppwrite();
  const res = await databases.listDocuments(
    PROFILES_DB_ID,
    PROFILES_COLLECTION_ID,
    [
      // server-side Queries are slightly different, but this works
      // with node-appwrite's Query builder OR plain filter object in newer SDKs.
      // If you're using Query, import it and use Query.equal.
      // For safety, we'll use the "queries" array style:
    ] as any
  );

  // Older node-appwrite requires Query.equal; if you already use Query in other routes,
  // change the listDocuments call above to:
  //
  // import { Query } from "node-appwrite";
  // listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [Query.equal("email", email)])
  //
  // For now, we assume you've already done this in create-setup-intent route.
  // To keep this compile-safe, we won’t rely on this helper for filtering;
  // instead we’ll just copy the same logic as your create-setup-intent route.
  return res;
}

// -----------------------------
// POST /api/stripe/charge-transaction
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const transactionId: string | undefined = body.transactionId;

    if (!transactionId) {
      return NextResponse.json(
        { ok: false, error: "Missing transactionId." },
        { status: 400 }
      );
    }

    const { databases } = getAppwrite();

    // 1) Load the transaction
    const tx = await databases.getDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      transactionId
    );

    const buyerEmail = (tx as any).buyer_email as string | undefined;
    const salePrice = Number((tx as any).sale_price ?? 0);
    const dvlaFee = Number((tx as any).dvla_fee ?? 80); // default £80 if not set

    if (!buyerEmail) {
      return NextResponse.json(
        { ok: false, error: "Transaction has no buyer_email set." },
        { status: 400 }
      );
    }

    if (!salePrice || salePrice <= 0) {
      return NextResponse.json(
        { ok: false, error: "Transaction has no valid sale_price." },
        { status: 400 }
      );
    }

    const totalToCharge = salePrice + dvlaFee;
    const amountInPence = Math.round(totalToCharge * 100);

    // 2) Get buyer profile (for stripe_customer_id)
    const profRes = await databases.listDocuments(
      PROFILES_DB_ID,
      PROFILES_COLLECTION_ID,
      // use same pattern as your create-setup-intent route
      // with Query.equal("email", buyerEmail)
      // here we just assume that env IDs are correct
      // @ts-ignore
      [ (require("node-appwrite") as any).Query.equal("email", buyerEmail) ]
    );

    if (!profRes.documents.length) {
      return NextResponse.json(
        { ok: false, error: "Buyer profile not found." },
        { status: 404 }
      );
    }

    const profile = profRes.documents[0] as any;
    const stripeCustomerId: string | undefined = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Buyer has no Stripe customer / saved card. Ask them to add a payment method.",
        },
        { status: 400 }
      );
    }

    // 3) Get default payment method (or first card)
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    let defaultPmId: string | null = null;

    if (!("deleted" in customer)) {
      const invoiceSettings = customer.invoice_settings;
      const defPm = invoiceSettings?.default_payment_method as
        | string
        | { id: string }
        | null
        | undefined;

      if (typeof defPm === "string") defaultPmId = defPm;
      else if (defPm && typeof defPm === "object") defaultPmId = defPm.id;
    }

    const pmList = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    const firstCard = pmList.data[0];
    const paymentMethodId = defaultPmId || firstCard?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No saved card found for this buyer. Ask them to add a payment method.",
        },
        { status: 400 }
      );
    }

    // 4) Create and confirm PaymentIntent (off-session)
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInPence,
        currency: "gbp",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `AuctionMyPlate – ${String(
          (tx as any).registration ||
            (tx as any).plate_registration ||
            (tx as any).plate_id ||
            transactionId
        )}`,
        metadata: {
          transaction_id: transactionId,
          buyer_email: buyerEmail,
        },
      });
    } catch (err: any) {
      console.error("[charge-transaction] Stripe error:", err);

      // If card requires authentication, Stripe throws specific error codes
      const msg =
        err?.message ||
        err?.raw?.message ||
        "Stripe charge failed. Card may require authentication.";

      // Mark transaction as failed payment
      try {
        await databases.updateDocument(
          TX_DB_ID,
          TX_COLLECTION_ID,
          transactionId,
          {
            payment_status: "failed",
            payment_error: msg,
          }
        );
      } catch (updateErr) {
        console.error(
          "[charge-transaction] failed to update transaction on error:",
          updateErr
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: msg,
          code: err?.code || err?.raw?.code,
        },
        { status: 402 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      const msg = `PaymentIntent not succeeded (status: ${paymentIntent.status}).`;
      await databases.updateDocument(
        TX_DB_ID,
        TX_COLLECTION_ID,
        transactionId,
        {
          payment_status: "failed",
          payment_error: msg,
          stripe_payment_intent_id: paymentIntent.id,
        }
      );
      return NextResponse.json(
        { ok: false, error: msg },
        { status: 400 }
      );
    }

    // 5) Update transaction as paid
    await databases.updateDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      transactionId,
      {
        payment_status: "paid",
        // You may want a separate status like "processing" vs "complete"
        transaction_status:
          (tx as any).transaction_status || "processing",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_amount_charged: totalToCharge,
        stripe_currency: "gbp",
      }
    );

    return NextResponse.json({
      ok: true,
      paymentIntentId: paymentIntent.id,
      amountCharged: totalToCharge,
    });
  } catch (err: any) {
    console.error("[charge-transaction] unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to charge transaction.",
      },
      { status: 500 }
    );
  }
}
