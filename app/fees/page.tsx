// app/fees/page.tsx

export const metadata = {
  title: "Fees | AuctionMyPlate",
  description:
    "Clear, transparent information on listing, commission and DVLA transfer fees at AuctionMyPlate.",
};

export default function FeesPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-600/60 p-8 md:p-10">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-[#FFD500] mb-4 text-center tracking-tight">
          Fees &amp; Costs
        </h1>
        <p className="text-lg text-gray-300 text-center mb-8">
          Simple, transparent and seller-friendly. No surprises.
        </p>

        {/* FREE LISTING */}
        <div className="bg-emerald-900/40 border border-emerald-500/70 rounded-xl p-6 mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-200 mb-2">
            It’s Completely Free To List Your Number Plate
          </h2>
          <p className="text-gray-100 text-base md:text-lg">
            No listing fees. No upfront charges. You only pay commission if
            your plate actually sells.
          </p>
        </div>

        {/* QUICK SUMMARY */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
            In summary
          </h2>
          <div className="bg-[#1c1c1c] border border-yellow-700/60 rounded-xl p-5 text-sm md:text-base text-gray-100">
            <ul className="list-disc list-inside space-y-1">
              <li>Listing your plate on AuctionMyPlate is free.</li>
              <li>
                If it doesn’t sell, you pay <strong>nothing</strong>.
              </li>
              <li>
                If it sells, we deduct a small percentage commission from the{" "}
                <strong>winning bid</strong>.
              </li>
              <li>
                An additional <strong>£80.00 DVLA transfer fee</strong> is added
                on top of the winning bid and is paid by the{" "}
                <strong>buyer</strong> — not taken from your payout.
              </li>
            </ul>
          </div>
        </section>

        {/* COMMISSION TABLE */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
            Commission Structure
          </h2>
          <p className="text-gray-300 mb-6 text-sm md:text-base">
            Commission is only charged when a sale is completed. There is{" "}
            <strong>no charge if your plate does not sell.</strong>
          </p>

          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-left text-sm md:text-base">
              <thead className="bg-[#FFD500] text-black">
                <tr>
                  <th className="py-3 px-4">
                    Final Sale Price (Winning Bid)
                  </th>
                  <th className="py-3 px-4">Commission Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-3 px-4">Up to £4,999</td>
                  <td className="py-3 px-4">10%</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 px-4">£5,000 – £9,999</td>
                  <td className="py-3 px-4">8%</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 px-4">£10,000 – £24,999</td>
                  <td className="py-3 px-4">6%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">£25,000+</td>
                  <td className="py-3 px-4">5%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs md:text-sm text-gray-400 mb-4 text-center">
            Commission is calculated on the winning bid amount (the hammer
            price) and automatically deducted before your payout is sent.
          </p>
        </section>

        {/* DVLA FEE SECTION */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
            DVLA Transfer Fee (£80.00)
          </h2>
          <div className="bg-[#112233] border border-blue-500/70 rounded-xl p-5 text-sm md:text-base text-gray-100">
            <p className="mb-2">
              To handle the registration transfer with the DVLA, a{" "}
              <strong>fixed £80.00 fee</strong> is added to{" "}
              <strong>every winning bid</strong>.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                This fee is paid by the <strong>buyer</strong>, on top of the
                winning bid.
              </li>
              <li>
                It is <strong>not</strong> deducted from the seller&apos;s
                payout.
              </li>
              <li>
                It covers the DVLA assignment/transfer process required to move
                the registration legally.
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              AuctionMyPlate.co.uk is an independent marketplace and is not
              affiliated, associated, authorised, endorsed by, or in any way
              officially connected with the Driver and Vehicle Licensing Agency
              (DVLA) or any other UK government organisation.
            </p>
          </div>
        </section>

        {/* EXAMPLES / CALCULATIONS */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#FFD500]">
            Examples
          </h2>
          <p className="text-gray-300 mb-4 text-sm md:text-base">
            Here&apos;s exactly how it works in practice:
          </p>

          <div className="space-y-4 text-sm md:text-base text-gray-100">
            {/* Example 1 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">
                Example 1 – £2,000 winning bid
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£2,000</strong>
                </li>
                <li>
                  Commission band: Up to £4,999 → <strong>10%</strong>
                </li>
                <li>
                  Our commission: 10% of £2,000 = <strong>£200</strong>
                </li>
                <li>
                  Seller payout: £2,000 − £200 ={" "}
                  <strong>£1,800</strong>
                </li>
                <li>DVLA fee added for buyer: <strong>£80</strong></li>
                <li>
                  Buyer pays in total: £2,000 + £80 ={" "}
                  <strong>£2,080</strong>
                </li>
              </ul>
            </div>

            {/* Example 2 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">
                Example 2 – £7,500 winning bid
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£7,500</strong>
                </li>
                <li>
                  Commission band: £5,000 – £9,999 →{" "}
                  <strong>8%</strong>
                </li>
                <li>
                  Our commission: 8% of £7,500 ={" "}
                  <strong>£600</strong>
                </li>
                <li>
                  Seller payout: £7,500 − £600 ={" "}
                  <strong>£6,900</strong>
                </li>
                <li>DVLA fee added for buyer: <strong>£80</strong></li>
                <li>
                  Buyer pays in total: £7,500 + £80 ={" "}
                  <strong>£7,580</strong>
                </li>
              </ul>
            </div>

            {/* Example 3 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">
                Example 3 – £20,000 winning bid
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£20,000</strong>
                </li>
                <li>
                  Commission band: £10,000 – £24,999 →{" "}
                  <strong>6%</strong>
                </li>
                <li>
                  Our commission: 6% of £20,000 ={" "}
                  <strong>£1,200</strong>
                </li>
                <li>
                  Seller payout: £20,000 − £1,200 ={" "}
                  <strong>£18,800</strong>
                </li>
                <li>DVLA fee added for buyer: <strong>£80</strong></li>
                <li>
                  Buyer pays in total: £20,000 + £80 ={" "}
                  <strong>£20,080</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FINAL NOTE */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          All figures above are examples. Exact commission and payouts are
          calculated automatically when a plate sells, based on the final
          winning bid.
        </p>
      </div>
    </main>
  );
}
