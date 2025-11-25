// app/components/ui/TermsModal.tsx

"use client";

export default function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden relative">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
            <p className="text-xs text-gray-500">Effective Date: February 2025</p>
          </div>

          <button
            className="text-gray-500 hover:text-gray-700 text-xl"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm leading-relaxed text-gray-800 space-y-6">

          <p>
            These Terms and Conditions govern your use of AuctionMyPlate.co.uk (“we”, “us”, “our”). 
            By accessing or using the platform, you agree to these Terms.
          </p>

          <p>
            AuctionMyPlate.co.uk is <strong>not affiliated</strong> with the Driver and Vehicle Licensing 
            Agency (DVLA) or any government organisation.
          </p>

          <h3 className="font-semibold text-lg">1. Eligibility</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>You must be at least 18 years old.</li>
            <li>You must provide accurate information.</li>
            <li>You must be legally capable of selling the registration.</li>
            <li>Fraud or identity deception results in immediate suspension.</li>
          </ul>

          <h3 className="font-semibold text-lg">2. User Accounts</h3>
          <p>You must keep your login secure. Fraudulent or duplicate accounts may be suspended.</p>

          <h3 className="font-semibold text-lg">3. Listings & Ownership</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>You must be the legal owner or have written permission.</li>
            <li>You must hold valid documents (V5C, V750, V778).</li>
            <li>Misrepresentation is prohibited.</li>
          </ul>

          <h3 className="font-semibold text-lg">4. Auction Format</h3>
          <p>
            Weekly auction: <strong>Monday 01:00 – Sunday 23:00</strong>.  
            Includes a <strong>5-minute soft close</strong>.
          </p>

          <h3 className="font-semibold text-lg">5. Buy Now</h3>
          <p>Buy Now ends the auction immediately. Purchase becomes binding.</p>

          <h3 className="font-semibold text-lg">6. Reserve Prices</h3>
          <p>The seller may decline sale if reserve is not met.</p>

          <h3 className="font-semibold text-lg">7. Fees</h3>
          <p><strong>Listing Fees:</strong> May be free during introductory periods.</p>
          <p><strong>Commission:</strong> Only charged when a plate sells.</p>
          <p><strong>DVLA Assignment Fee:</strong> £80 applies to all winning bids.</p>

          <h3 className="font-semibold text-lg">8. Transfer of Registration</h3>
          <p><strong>Seller must:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Provide accurate documents.</li>
            <li>Cooperate with transfer process.</li>
          </ul>

          <p><strong>Buyer must:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Ensure vehicle eligibility.</li>
            <li>Submit paperwork to DVLA.</li>
          </ul>

          <h3 className="font-semibold text-lg">9. Legal Display of Plates</h3>
          <p>You must display plates legally according to DVLA rules.</p>

          <h3 className="font-semibold text-lg">10. Prohibited Use</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Fraud or false listings.</li>
            <li>Shill bidding.</li>
            <li>Abusive behaviour.</li>
          </ul>

          <h3 className="font-semibold text-lg">11. Liability</h3>
          <p>We act as a marketplace only and are not liable for user actions or DVLA issues.</p>

          <h3 className="font-semibold text-lg">12. Non-Payment</h3>
          <p>Non-paying buyers may be suspended and sellers may relist.</p>

          <h3 className="font-semibold text-lg">13. Suspension & Removal</h3>
          <p>We may remove users or listings for any Terms violation.</p>

          <h3 className="font-semibold text-lg">14. Changes to Terms</h3>
          <p>Continued use indicates acceptance of updated Terms.</p>

          <h3 className="font-semibold text-lg">15. Contact</h3>
          <p>support@auctionmyplate.co.uk</p>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
