// app/fees/page.tsx

export const metadata = {
  title: "Fees | AuctionMyPlate",
  description:
    "Clear, transparent information on listing, commission and DVLA transfer fees at AuctionMyPlate.",
};

export default function FeesPage() {
  return (
    <div className="min-h-screen bg-[#FFFFEA] py-16 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-10 border border-gray-200">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-black mb-4 text-center">
          Fees &amp; Costs
        </h1>
        <p className="text-lg text-gray-700 text-center mb-8">
          Simple, transparent and seller-friendly. No surprises.
        </p>

        {/* FREE LISTING */}
        <div className="bg-green-100 border border-green-300 rounded-xl p-6 mb-10 text-center">
          <h2 className="text-3xl font-bold text-green-800 mb-2">
            It’s Completely Free To List Your Number Plate
          </h2>
          <p className="text-gray-700 text-lg">
            No listing fees. No upfront charges. You only pay commission if
            your plate actually sells.
          </p>
        </div>

        {/* QUICK SUMMARY */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-10 text-sm text-gray-800">
          <h2 className="text-xl font-bold mb-2 text-black">
            In summary
          </h2>
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

        {/* COMMISSION TABLE */}
        <h2 className="text-2xl font-bold mb-3">Commission Structure</h2>
        <p className="text-gray-700 mb-6">
          Commission is only charged when a sale is completed. There is{" "}
          <strong>no charge if your plate does not sell.</strong>
        </p>

        <div className="bg-gray-50 border border-gray-300 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-left text-sm md:text-base">
            <thead className="bg-black text-white">
              <tr>
                <th className="py-3 px-4">Final Sale Price (Winning Bid)</th>
                <th className="py-3 px-4">Commission Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4">Up to £4,999</td>
                <td className="py-3 px-4">10%</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4">£5,000 – £9,999</td>
                <td className="py-3 px-4">8%</td>
              </tr>
              <tr className="border-b border-gray-300">
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

        <p className="text-sm text-gray-600 mb-10 text-center">
          Commission is calculated on the winning bid amount (the hammer price)
          and automatically deducted before your payout is sent.
        </p>

        {/* DVLA FEE SECTION */}
        <h2 className="text-2xl font-bold mb-3">DVLA Transfer Fee (£80.00)</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-10 text-sm text-gray-800">
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
              It is <strong>not</strong> deducted from the seller&apos;s payout.
            </li>
            <li>
              It covers the DVLA assignment/transfer process required to move
              the registration legally.
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            AuctionMyPlate.co.uk is an independent marketplace and is not
            affiliated, associated, authorised, endorsed by, or in any way
            officially connected with the Driver and Vehicle Licensing Agency
            (DVLA) or any other UK government organisation.
          </p>
        </div>

        {/* EXAMPLES / CALCULATIONS */}
        <h2 className="text-2xl font-bold mb-4">Examples</h2>
        <p className="text-gray-700 mb-4">
          Here&apos;s exactly how it works in practice:
        </p>

        <div className="space-y-4 text-sm text-gray-800">
          {/* Example 1 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold mb-2">Example 1 – £2,000 winning bid</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Winning bid: <strong>£2,000</strong></li>
              <li>Commission band: Up to £4,999 → <strong>10%</strong></li>
              <li>Our commission: 10% of £2,000 = <strong>£200</strong></li>
              <li>Seller payout: £2,000 − £200 = <strong>£1,800</strong></li>
              <li>DVLA fee added for buyer: <strong>£80</strong></li>
              <li>
                Buyer pays in total: £2,000 + £80 ={" "}
                <strong>£2,080</strong>
              </li>
            </ul>
          </div>

          {/* Example 2 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold mb-2">Example 2 – £7,500 winning bid</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Winning bid: <strong>£7,500</strong></li>
              <li>Commission band: £5,000 – £9,999 → <strong>8%</strong></li>
              <li>Our commission: 8% of £7,500 = <strong>£600</strong></li>
              <li>Seller payout: £7,500 − £600 = <strong>£6,900</strong></li>
              <li>DVLA fee added for buyer: <strong>£80</strong></li>
              <li>
                Buyer pays in total: £7,500 + £80 ={" "}
                <strong>£7,580</strong>
              </li>
            </ul>
          </div>

          {/* Example 3 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold mb-2">Example 3 – £20,000 winning bid</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Winning bid: <strong>£20,000</strong></li>
              <li>Commission band: £10,000 – £24,999 → <strong>6%</strong></li>
              <li>Our commission: 6% of £20,000 = <strong>£1,200</strong></li>
              <li>Seller payout: £20,000 − £1,200 = <strong>£18,800</strong></li>
              <li>DVLA fee added for buyer: <strong>£80</strong></li>
              <li>
                Buyer pays in total: £20,000 + £80 ={" "}
                <strong>£20,080</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* FINAL NOTE */}
        <p className="text-xs text-gray-600 mt-8 text-center">
          All figures above are examples. Exact commission and payouts are
          calculated automatically when a plate sells, based on the final
          winning bid.
        </p>
      </div>
    </div>
  );
}
