// app/api/buy-now/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import Stripe from "stripe";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV VARS
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const PLATES_DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

// Transactions live in same DB, separate collection
const TRANSACTIONS_COLLECTION =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";

// Email config
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT
  ? parseInt(process.env.SMTP_PORT, 10)
  : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail =
  process.env.FROM_EMAIL || "AuctionMyPlate <no-reply@auctionmyplate.co.uk>";
const adminEmail =
  process.env.ADMIN_NOTIFICATIONS_EMAIL || "admin@auctionmyplate.co.uk";

// -----------------------------
// APPWRITE CLIENT
// -----------------------------
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

// -----------------------------
// HELPERS
// -----------------------------
function getBuyNowPrice(listing: any): number | null {
  const raw =
    (typeof listing.buy_now === "number" ? listing.buy_now : null) ??
    (typeof listing.buy_now_price === "number" ? listing.buy_now_price : null);

  if (typeof raw === "number" && raw > 0) return raw;
  return null;
}

function hasSmtpConfig() {
  return Boolean(smtpHost && smtpUser && smtpPass);
}

function createTransport() {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendSaleEmails(params: {
  registration: string | undefined;
  listingRef: string;
  finalPrice: number;
  buyerEmail: string;
  sellerEmail?: string | null;
}) {
  if (!hasSmtpConfig()) {
    console.warn(
      "[buy-now] SMTP not configured, skipping sale notification emails."
    );
    return;
  }

  const transporter = createTransport();

  const { registration, listingRef, finalPrice, buyerEmail, sellerEmail } =
    params;

  const regText = registration || "your number plate";
  const priceText = `£${finalPrice.toLocaleString()}`;

  const buyerSubject = `You’ve secured ${regText} on AuctionMyPlate!`;
  const sellerSubject = `Your plate ${regText} has SOLD on AuctionMyPlate!`;
  const adminSubject = `AuctionMyPlate – ${regText} sold via Buy Now`;

  const buyerBody = `
Hi,

Great news – you’ve successfully used Buy Now on AuctionMyPlate.

You’ve secured ${regText} for ${priceText}.

Listing reference: ${listingRef}
Registration: ${regText}
Final price (Buy Now): ${priceText}

An £80 DVLA paperwork fee will be added to your final invoice as per our terms.

What happens next:
- You will receive a 2nd email requesting what documentation you need to upload in your Dashboard.
- Once this is received, we will begin the transfer process on your behalf.

If you have any questions, just reply to this email.

Regards,
AuctionMyPlate
`.trim();

  const sellerBody = `
Hi,

Fantastic news – your plate ${regText} has SOLD on AuctionMyPlate via Buy Now for ${priceText}.

Listing reference: ${listingRef}
Registration: ${regText}
Final price (Buy Now): ${priceText}

What happens next:
- You will receive a 2nd email requesting what documentation you need to upload in your Dashboard.
- Once this is received, we will begin the transfer process on your behalf.

You don’t need to do anything right now – we’ll be in touch shortly with next steps.

Regards,
AuctionMyPlate
`.trim();

  const adminBody = `
Admin notification – Buy Now sale

Buyer: ${buyerEmail}
Seller: ${sellerEmail || "Unknown / not stored"}
Listing reference: ${listingRef}
Registration: ${regText}
Final price (Buy Now): ${priceText}

Please ensure payment is collected and DVLA paperwork is processed.
`.trim();

  const jobs: Promise<any>[] = [];

  // Buyer notification
  jobs.push(
    transporter.sendMail({
      from: fromEmail,
      to: buyerEmail,
      subject: buyerSubject,
      text: buyerBody,
    })
  );

  // Seller notification (if we have seller_email on the listing)
  if (sellerEmail) {
    jobs.push(
      transporter.sendMail({
        from: fromEmail,
        to: sellerEmail,
        subject: sellerSubject,
        text: sellerBody,
      })
    );
  }

  // Admin notification
  if (adminEmail) {
    jobs.push(
      transporter.sendMail({
        from: fromEmail,
        to: adminEmail,
        subject: `[ADMIN] ${adminSubject}`,
        text: adminBody,
      })
    );
  }

  try {
    await Promise.all(jobs);
    console.log("[buy-now] Sale emails sent.");
  } catch (err) {
    console.error("[buy-now] Failed to send one or more sale emails:", err);
  }
}

async function sendDocRequestEmails(params: {
  registration: string | undefined;
  listingRef: string;
  buyerEmail: string;
  sellerEmail?: string | null;
}) {
  if (!hasSmtpConfig()) {
    console.warn(
      "[buy-now] SMTP not configured, skipping document request emails."
    );
    return;
  }

  const transporter = createTransport();

  const { registration, listingRef, buyerEmail, sellerEmail } = params;

  const regText = registration || "your number plate";

  const buyerSubject = `Documents required for ${regText} – AuctionMyPlate`;
  const sellerSubject = `Documents required – ${regText} sale on AuctionMyPlate`;

  const commonLines = `
Listing reference: ${listingRef}
Registration: ${regText}

To move forward, we now need you to upload specific documentation through your AuctionMyPlate Dashboard.
`.trim();

  const buyerBody = `
Hi,

This is your documents request email for your recent purchase.

${commonLines}

Please log in to your Dashboard and go to:
My Dashboard → Transactions

Select the transaction for ${regText} and follow the instructions to upload the required documents. 
The exact documents needed will be shown in your Dashboard, but may include:
- Proof of ID
- Proof of address
- DVLA documentation (e.g. V5C, V750 or retention certificate)

Once your documents are uploaded and verified, we will begin the transfer process on your behalf.

Regards,
AuctionMyPlate
`.trim();

  const sellerBody = `
Hi,

This is your documents request email for the sale of your plate.

${commonLines}

Please log in to your Dashboard and go to:
My Dashboard → Transactions

Select the transaction for ${regText} and follow the instructions to upload the required documents. 
The exact documents needed will be shown in your Dashboard, but may include:
- DVLA documentation for the plate
- Proof of ID
- Any supporting paperwork requested in the transaction view

Once your documents are uploaded and verified, we will begin the transfer process on your behalf.

Regards,
AuctionMyPlate
`.trim();

  const jobs: Promise<any>[] = [];

  // Buyer docs email
  jobs.push(
    transporter.sendMail({
      from: fromEmail,
      to: buyerEmail,
      subject: buyerSubject,
      text: buyerBody,
    })
  );

  // Seller docs email (if seller_email is known)
  if (sellerEmail) {
    jobs.push(
      transporter.sendMail({
        from: fromEmail,
        to: sellerEmail,
        subject: sellerSubject,
        text: sellerBody,
      })
    );
  }

  try {
    await Promise.all(jobs);
    console.log("[buy-now] Document request emails sent.");
  } catch (err) {
    console.error(
      "[buy-now] Failed to send one or more document request emails:",
      err
    );
  }
}

// -----------------------------
// ROUTE
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, userId, userEmail } = body || {};

    console.log("buy-now incoming:", { listingId, userId, userEmail });

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!listingId) {
      return NextResponse.json(
        { error: "Missing listingId." },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail." },
        { status: 400 }
      );
    }

    const finalUserId =
      typeof userId === "string" && userId.trim().length > 0
        ? userId
        : "unknown";

    // -----------------------------
    // STRIPE: MUST HAVE PAYMENT METHOD
    // -----------------------------
    if (!stripeSecret) {
      console.error("STRIPE_SECRET_KEY is not set");
      return NextResponse.json(
        {
          error: "Payment configuration error. Please contact support.",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecret, {});

    // Find or create customer by email
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
          appwriteUserId: finalUserId,
        },
      });
    }

    // Must have at least one attached card
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json(
        {
          error:
            "You must add a payment method before using Buy Now. Please add a card and try again.",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // LOAD LISTING
    // -----------------------------
    let listing: any;
    try {
      listing = await databases.getDocument(
        PLATES_DB,
        PLATES_COLLECTION,
        listingId
      );
    } catch (err) {
      console.error("getDocument failed for listing (buy-now):", listingId, err);
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    if (listing.status !== "live") {
      return NextResponse.json(
        { error: "This listing is not currently live." },
        { status: 400 }
      );
    }

    // Optional: ensure auction hasn't already ended
    if (listing.auction_end) {
      const now = new Date();
      const endTime = new Date(listing.auction_end);
      if (now > endTime) {
        return NextResponse.json(
          { error: "This auction has already ended." },
          { status: 400 }
        );
      }
    }

    const buyNowPrice = getBuyNowPrice(listing);

    if (!buyNowPrice) {
      return NextResponse.json(
        { error: "Buy Now is not available for this listing." },
        { status: 400 }
      );
    }

    // -----------------------------
    // UPDATE LISTING
    // -----------------------------
    const newBidsCount =
      typeof listing.bids === "number" ? listing.bids + 1 : 1;

    const updatedListing = await databases.updateDocument(
      PLATES_DB,
      PLATES_COLLECTION,
      listing.$id,
      {
        status: "sold", // adjust if your sold status is different
        current_bid: buyNowPrice,
        bids: newBidsCount,
      }
    );

    // -----------------------------
    // CREATE TRANSACTION (if configured)
// -----------------------------
    const listingRef =
      listing.listing_id || `AMP-${String(listing.$id).slice(-6).toUpperCase()}`;

    const sellerEmail: string | null =
      typeof listing.seller_email === "string"
        ? listing.seller_email
        : null;

    let transactionDoc: any = null;

    if (TRANSACTIONS_COLLECTION) {
      try {
        const dvlaFee = 80;
        const totalPayable = buyNowPrice + dvlaFee;

        transactionDoc = await databases.createDocument(
          PLATES_DB,
          TRANSACTIONS_COLLECTION,
          ID.unique(),
          {
            listing_id: listing.$id,
            listing_ref: listingRef,
            registration: listing.registration,
            buyer_email: userEmail,
            seller_email: sellerEmail,
            final_price: buyNowPrice,
            dvla_fee: dvlaFee,
            total_payable: totalPayable,
            status: "pending_docs",
            channel: "buy_now",
            timestamp: new Date().toISOString(),
          }
        );

        console.log("[buy-now] Transaction created:", transactionDoc.$id);
      } catch (err) {
        console.error("[buy-now] Failed to create transaction document:", err);
        // Not fatal for the sale – listing is already marked sold
      }
    } else {
      console.warn(
        "[buy-now] APPWRITE_TRANSACTIONS_COLLECTION_ID not set – skipping transaction creation."
      );
    }

    // -----------------------------
    // SEND EMAILS (non-blocking)
// -----------------------------
    sendSaleEmails({
      registration: listing.registration,
      listingRef,
      finalPrice: buyNowPrice,
      buyerEmail: userEmail,
      sellerEmail,
    }).catch((err) => {
      console.error("[buy-now] sendSaleEmails threw:", err);
    });

    sendDocRequestEmails({
      registration: listing.registration,
      listingRef,
      buyerEmail: userEmail,
      sellerEmail,
    }).catch((err) => {
      console.error("[buy-now] sendDocRequestEmails threw:", err);
    });

    // Still not charging the card yet – PaymentIntent logic will come later.
    return NextResponse.json({
      ok: true,
      updatedListing,
      transaction: transactionDoc,
    });
  } catch (err: any) {
    console.error("buy-now route fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Buy Now failed." },
      { status: 500 }
    );
  }
}
