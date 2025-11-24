"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

// Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function SellYourPlatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        // Try to fetch the logged-in user
        await account.get();

        // If user exists → send to dashboard
        router.replace("/dashboard");
      } catch {
        // If NOT logged in → go to the login/register page
        router.replace("/login-or-register");
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, [router]);

  // While checking session, show nothing to avoid flashing
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Checking account…
    </div>
  );
}
