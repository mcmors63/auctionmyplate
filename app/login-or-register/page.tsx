"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function LoginOrRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf7f2] p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-yellow-600 mb-4">
          Login or Register to Bid
        </h1>
        <p className="text-gray-700 mb-6">
          You need to be signed in to place a bid on this registration.
        </p>
        <div className="flex justify-around">
          <button
            onClick={() => router.push(`/login?id=${id}`)}
            className="bg-black text-yellow-400 px-5 py-2 rounded-md hover:bg-gray-800 transition"
          >
            Login
          </button>
          <button
            onClick={() => router.push(`/register?id=${id}`)}
            className="bg-yellow-500 text-black px-5 py-2 rounded-md hover:bg-yellow-400 transition"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
