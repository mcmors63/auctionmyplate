// app/api/stripe/create-setup-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn(
    "[create-setup-intent] STRIPE_SECRET_KEY is not set. This route will fail."
  );
}

const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2025-11-17.clover",
});


const appwriteEndpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";
const appwriteProject =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";
const appwriteApiKey = process.env.APPWRITE_API_KEY || "";

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
// POST
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userEmail: string | undefined =
      body.userEmail || body.email || undefined;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail." },
        { status: 400 }
      );
    }

    const { databases } = getAppwrite();

    // 1) Find profile by email
    const profRes = await databases.listDocuments(
      PROFILES_DB_ID,
      PROFILES_COLLECTION_ID,
      [Query.equal("email", userEmail)]
    );

    if (!profRes.documents.length) {
      return NextResponse.json(
        { error: "Profile not found for this user." },
        { status: 404 }
      );
    }

    const profile = profRes.documents[0] as any;

    // 2) Ensure Stripe Customer
    let stripeCustomerId: string | null = profile.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          appwrite_profile_id: profile.$id,
          appwrite_email: userEmail,
        },
      });

      stripeCustomerId = customer.id;

      await databases.updateDocument(
        PROFILES_DB_ID,
        PROFILES_COLLECTION_ID,
        profile.$id,
        {
          stripe_customer_id: stripeCustomerId,
        }
      );
    }

    // 3) Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
    });

    if (!setupIntent.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a client_secret." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err: any) {
    console.error("[create-setup-intent] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create setup intent." },
      { status: 500 }
    );
  }
}
