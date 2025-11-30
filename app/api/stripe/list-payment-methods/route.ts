// app/api/stripe/list-payment-methods/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn(
    "[list-payment-methods] STRIPE_SECRET_KEY is not set. This route will fail."
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

export async function POST(req: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userEmail: string | undefined =
      body.userEmail || body.email || undefined;

    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing userEmail." },
        { status: 400 }
      );
    }

    const { databases } = getAppwrite();

    const profRes = await databases.listDocuments(
      PROFILES_DB_ID,
      PROFILES_COLLECTION_ID,
      [Query.equal("email", userEmail)]
    );

    if (!profRes.documents.length) {
      // No profile = no cards
      return NextResponse.json({ ok: true, paymentMethods: [] });
    }

    const profile = profRes.documents[0] as any;
    const stripeCustomerId: string | null = profile.stripe_customer_id || null;

    if (!stripeCustomerId) {
      // No customer yet = no cards
      return NextResponse.json({ ok: true, paymentMethods: [] });
    }

    // Fetch customer to know default payment method
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

    const paymentMethods = pmList.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? null,
      last4: pm.card?.last4 ?? null,
      exp_month: pm.card?.exp_month ?? null,
      exp_year: pm.card?.exp_year ?? null,
      isDefault: pm.id === defaultPmId,
    }));

    return NextResponse.json({ ok: true, paymentMethods });
  } catch (err: any) {
    console.error("[list-payment-methods] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to list payment methods." },
      { status: 500 }
    );
  }
}
