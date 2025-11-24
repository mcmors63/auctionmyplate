export default function Home() {
  return (
    <main className="flex flex-col min-h-screen text-gray-800 relative">
      {/* Background wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: "url('/plates-wallpaper.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Light transparent overlay for readability */}
      <div className="absolute inset-0 bg-yellow-50/70 backdrop-blur-sm"></div>

      {/* Header */}
      <header className="relative z-10 w-full bg-black text-yellow-400 shadow-md fixed top-0 left-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-widest">AUCTION MY PLATE</h1>
          <nav className="space-x-6 text-yellow-300 font-medium">
            <a href="#" className="hover:text-white">
              Home
            </a>
            <a href="#" className="hover:text-white">
              Auctions
            </a>
            <a href="#" className="hover:text-white">
              Sell a Plate
            </a>
            <a href="#" className="hover:text-white">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-grow pt-32 pb-20 px-6 text-black text-center">
        <div className="bg-yellow-400/90 p-10 rounded-lg shadow-lg border-4 border-black inline-block mb-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-widest">
            BUY & SELL CHERISHED PLATES
          </h2>
        </div>
        <p className="text-lg max-w-2xl mb-8 text-gray-900 font-medium bg-yellow-100/80 px-4 py-2 rounded">
          Weekly DVLA-style auctions every Sunday to Sunday — find your perfect registration or sell yours for top value.
        </p>
        <div className="flex gap-4">
          <a
            href="#"
            className="bg-black text-yellow-400 px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
          >
            View Current Auctions
          </a>
          <a
            href="#"
            className="border-2 border-black px-6 py-3 rounded-lg font-semibold hover:bg-black hover:text-yellow-400 transition"
          >
            List Your Plate
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-10 text-center">
        <div className="bg-white/90 rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-3 text-black">Weekly Auctions</h3>
          <p className="text-gray-700">
            Bidding opens every Sunday at 00:00 and ends the following Sunday at 23:59. Join the excitement all week long!
          </p>
        </div>
        <div className="bg-white/90 rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-3 text-black">Safe & Secure</h3>
          <p className="text-gray-700">
            All transactions are protected and verified through our trusted platform, so you can bid or sell with confidence.
          </p>
        </div>
        <div className="bg-white/90 rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-3 text-black">Simple to Use</h3>
          <p className="text-gray-700">
            Register, list, and start bidding within minutes. No complicated forms or hidden fees — just results.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black text-yellow-400 py-6 text-center">
        <p>© {new Date().getFullYear()} Auction My Plate. All rights reserved.</p>
      </footer>
    </main>
  );
}
