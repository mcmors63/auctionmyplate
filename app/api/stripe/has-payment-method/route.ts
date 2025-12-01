// app/api/stripe/has-payment-method/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// STRIPE
// -----------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.warn("[has-payment-method] STRIPE_SECRET_KEY is not set.");
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// -----------------------------
// APPWRITE (profiles)
// -----------------------------
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";
const APPWRITE_PROJECT =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!;
const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

function getAppwrite() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY) {
    throw new Error(
      "Appwrite env vars missing (APPWRITE_ENDPOINT / PROJECT_ID / API_KEY)."
    );
  }

  const client = new AppwriteClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  return { databases: new Databases(client) };
}

// -----------------------------
// POST /api/stripe/has-payment-method
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe || !STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured on the server.",
          hasPaymentMethod: false,
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userEmail: string | undefined =
      body.userEmail || body.email || undefined;

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

    const { databases } = getAppwrite();

    // 1) Try to find profile by email
    const profRes = await databases.listDocuments(
      PROFILES_DB_ID,
      PROFILES_COLLECTION_ID,
      [Query.equal("email", userEmail)]
    );

    const profile = (profRes.documents[0] as any) || null;
    let stripeCustomerId: string | null =
      profile?.stripe_customer_id || null;

    async function listCardsForCustomer(customerId: string) {
      const pmList = await stripe!.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      return pmList.data;
    }

    let cards: Stripe.PaymentMethod[] = [];
    let customerIdUsed: string | null = null;

    // 2) If profile has a stored customer ID, try that first
    if (stripeCustomerId) {
      try {
        cards = await listCardsForCustomer(stripeCustomerId);
        customerIdUsed = stripeCustomerId;
      } catch (err) {
        console.error(
          "[has-payment-method] error listing cards for stored customer",
          err
        );
      }
    }

    // 3) If no cards yet, fall back to searching Stripe customers by email
    if (!cards.length) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 5,
      });

      for (const c of customers.data) {
        try {
          const cCards = await listCardsForCustomer(c.id);
          if (cCards.length) {
            cards = cCards;
            customerIdUsed = c.id;

            // Sync stripe_customer_id into profile for next time
            if (profile && profile.$id && profile.stripe_customer_id !== c.id) {
              try {
                await databases.updateDocument(
                  PROFILES_DB_ID,
                  PROFILES_COLLECTION_ID,
                  profile.$id,
                  { stripe_customer_id: c.id }
                );
              } catch (updateErr) {
                console.error(
                  "[has-payment-method] failed to sync stripe_customer_id",
                  updateErr
                );
              }
            }
            break;
          }
        } catch (err) {
          console.error(
            "[has-payment-method] error listing cards for customer",
            c.id,
            err
          );
        }
      }
    }

    const hasPaymentMethod = cards.length > 0;

    return NextResponse.json(
      {
        ok: true,
        hasPaymentMethod,
        customerId: customerIdUsed,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[has-payment-method] error:", err);
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
