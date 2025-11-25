// app/login-or-register/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Login or Register | AuctionMyPlate",
  description: "Login or create an account to bid or sell plates.",
};

export default function LoginOrRegisterPage() {
  return (
    <main className="min-h-screen bg-[#FFFBEA] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-yellow-100 p-6 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-yellow-700">
          You need an account
        </h1>

        <p className="text-sm text-gray-600">
          To <strong>bid</strong> or <strong>sell a plate</strong>, you must be
          logged in to your AuctionMyPlate account.
        </p>

        <div className="flex flex-col gap-3 mt-4">
          <Link
            href="/login"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md text-sm"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="w-full border border-yellow-500 text-yellow-700 hover:bg-yellow-50 font-semibold py-2 rounded-md text-sm"
          >
            Register as a new seller
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Once logged in, you can access your{" "}
          <strong>Seller Dashboard</strong>, list plates, and place bids.
        </p>
      </div>
    </main>
  );
}
