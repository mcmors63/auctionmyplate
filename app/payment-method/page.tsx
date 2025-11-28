// app/payment-method/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Client, Account } from "appwrite";

// -----------------------------
// ENV / Appwrite client
// -----------------------------
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(appwriteClient);

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// -----------------------------
// TYPES
// -----------------------------
type UserInfo = {
  id: string;
  email: string;
  name?: string;
};

// -----------------------------
// Inner form component
// -----------------------------
function PaymentMethodForm({ user }: { user: UserInfo }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create SetupIntent when page loads
  useEffect(() => {
    const createSetupIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/stripe/create-setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: user.email }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("create-setup-intent failed:", data);
          throw new Error(data.error || "Failed to create setup intent");
        }

        if (!data.clientSecret) {
          throw new Error("No clientSecret returned from server.");
        }

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error("SetupIntent error:", err);
        setError(
          "We couldn't start the card setup process. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    createSetupIntent();
  }, [user.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!stripe || !elements) {
      setError("Payment system not ready. Please wait a moment and try again.");
      return;
    }

    if (!clientSecret) {
      setError("Missing setup intent client secret. Please refresh the page.");
      console.error("No clientSecret in state when submitting.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card element not found.");
      return;
    }

    try {
      setSaving(true);

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            email: user.email,
            name: user.name || undefined,
          },
        },
      });

      console.log("confirmCardSetup result:", result);

      if (result.error) {
        // Show as much info as possible
        const msg =
          result.error.message ||
          result.error.code ||
          "Card could not be saved.";
        setError(msg);
        return;
      }

      if (!result.setupIntent) {
        setError("Card could not be saved. No setup intent returned.");
        return;
      }

      if (result.setupIntent.status !== "succeeded") {
        setError(
          `Card not saved. Status: ${result.setupIntent.status}. Please try again.`
        );
        return;
      }

      setSuccess("Card saved successfully. You can now place bids and use Buy Now.");
      // Optional: go back automatically after a short delay
      setTimeout(() => {
        router.push("/current-listings");
      }, 2500);
    } catch (err: any) {
      console.error("Save card error:", err);
      setError(err.message || "Something went wrong saving your card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-300 rounded-xl shadow-sm p-6 space-y-4">
      <h1 className="text-xl font-bold">Add a payment method</h1>

      <p className="text-sm text-gray-700">
        We securely store your card with Stripe. Your card will only be charged if
        you win an auction or use Buy Now.
      </p>

      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 p-3 rounded text-sm">
          {error}
        </p>
      )}

      {success && (
        <p className="bg-green-50 text-green-700 border border-green-200 p-3 rounded text-sm">
          {success}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Preparing secure payment form…</p>
      ) : !clientSecret ? (
        <p className="text-sm text-red-600">
          We couldn&apos;t start the card setup process.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-gray-300 rounded-md px-3 py-2 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#111827",
                    "::placeholder": { color: "#9CA3AF" },
                  },
                },
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !stripe || !elements}
            className="w-full rounded-lg bg-black text-white font-semibold py-2.5 text-sm disabled:opacity-60"
          >
            {saving ? "Saving card…" : "Save card"}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-gray-200 mt-4 flex justify-between">
        <Link
          href="/current-listings"
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          ← Back to listings
        </Link>
        <p className="text-[11px] text-gray-400">
          Powered by Stripe. We don’t store your full card details.
        </p>
      </div>
    </div>
  );
}

// -----------------------------
// PAGE WRAPPER
// -----------------------------
export default function PaymentMethodPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        setLoginError(null);

        // Same pattern as navbar / place_bid: try localStorage first
        let email: string | null = null;
        let id: string | null = null;
        let name: string | undefined = undefined;

        if (typeof window !== "undefined") {
          email = window.localStorage.getItem("amp_user_email");
          id = window.localStorage.getItem("amp_user_id");
        }

        if (!email || !id) {
          // Fallback to Appwrite account
          const current = await account.get();
          email = current.email;
          id = current.$id;
          name = current.name;

          if (typeof window !== "undefined") {
            window.localStorage.setItem("amp_user_email", email);
            window.localStorage.setItem("amp_user_id", id);
          }
        }

        if (!email || !id) {
          setLoginError("You must be logged in to add a payment method.");
          setLoadingUser(false);
          return;
        }

        setUser({ id, email, name });
      } catch (err) {
        console.error("Load user for payment method failed:", err);
        setLoginError("You must be logged in to add a payment method.");
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  // No publishable key configured
  if (!stripePublishableKey) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-red-200 rounded-xl shadow-sm p-6 space-y-3">
          <h1 className="text-lg font-bold text-red-700">
            Stripe publishable key not configured
          </h1>
          <p className="text-sm text-gray-700">
            Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in your environment
            variables to use this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-8">
      {loadingUser ? (
        <p className="text-sm text-gray-600">Checking your account…</p>
      ) : loginError || !user ? (
        <div className="max-w-md mx-auto bg-white border border-yellow-300 rounded-xl shadow-sm p-6 space-y-3">
          <p className="text-sm text-yellow-800">{loginError}</p>
          <div className="flex gap-3 mt-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 text-sm font-semibold"
            >
              Register
            </Link>
          </div>
        </div>
      ) : (
        <Elements stripe={stripePromise!} options={{}}>
          <PaymentMethodForm user={user} />
        </Elements>
      )}
    </main>
  );
}
