"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      let session;

      // Newer Appwrite SDK
      if (typeof (account as any).createEmailPasswordSession === "function") {
        session = await (account as any).createEmailPasswordSession({
          email,
          password,
        });
      }
      // Older SDK fallback
      else if (typeof (account as any).createEmailSession === "function") {
        session = await (account as any).createEmailSession(email, password);
      } else {
        throw new Error(
          "No suitable login method found on Appwrite Account client."
        );
      }

      console.log("Login session created:", session);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = err?.message || "";

      if (msg.includes("Invalid credentials")) {
        setError("Email or password is incorrect.");
      } else if (msg.includes("session is active")) {
        setError("You are already logged in. Go straight to your dashboard.");
      } else if (msg.toLowerCase().includes("project")) {
        setError(
          "Project configuration issue (Project ID / endpoint). Check Appwrite settings."
        );
      } else if (msg) {
        setError(msg);
      } else {
        setError("Login failed. Please try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFBEA] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-yellow-100 p-6">
        <h1 className="text-2xl font-extrabold text-yellow-700 mb-2 text-center">
          Account Login
        </h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Sign in to access your account, place bids, and manage your plates.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-md w-full px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded-md w-full px-3 py-2 text-sm"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md text-sm disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Having trouble logging in? Make sure you registered with this email
          and completed email verification.
        </p>
      </div>
    </main>
  );
}
