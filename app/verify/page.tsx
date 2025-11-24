export default function VerifyPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email || "your email";
  return (
    <main className="flex flex-col min-h-screen bg-yellow-50 items-center justify-center text-center p-10">
      <div className="bg-white shadow-xl rounded-2xl p-10 border-t-8 border-yellow-400 max-w-md">
        <h2 className="text-3xl font-bold text-black mb-4">Email Verified ✅</h2>
        <p className="text-gray-700 mb-6">
          Thank you, <span className="font-semibold text-black">{email}</span>, your account is now active.
        </p>
        <a
          href="/login"
          className="bg-black text-yellow-400 font-semibold px-6 py-3 rounded-lg hover:bg-gray-900 transition"
        >
          Go to Login
        </a>
      </div>
    </main>
  );
}
