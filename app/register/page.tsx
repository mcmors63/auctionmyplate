"use client";

import { useState } from "react";
import { Client, Account, Databases, ID } from "appwrite";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import zxcvbn from "zxcvbn";

// ─────────────────────────────────────────────
// APPWRITE INIT
// ─────────────────────────────────────────────
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ─────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────
export default function RegisterPage() {
  // FORM STATE
  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    house: "",
    street: "",
    town: "",
    county: "",
    postcode: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });

  const [addresses, setAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // T&Cs modal
  const [showTerms, setShowTerms] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    label: "",
    color: "",
    score: 0,
  });

  // UK POSTCODE REGEX
  const ukPostcodeRegex =
    /^([GIR] 0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9ABEHMNPRV-Y]?\s?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

  const calculateStrength = (password: string) => {
    const result = zxcvbn(password);
    const score = result.score;
    const map = [
      { label: "Very Weak", color: "bg-red-600" },
      { label: "Weak", color: "bg-orange-500" },
      { label: "Fair", color: "bg-yellow-500" },
      { label: "Strong", color: "bg-green-600" },
      { label: "Very Strong", color: "bg-blue-600" },
    ];
    return {
      label: map[score].label,
      color: map[score].color,
      score,
    };
  };

  // ─────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────
  const validateFields = () => {
    const errors: any = {};

    if (!formData.first_name.trim()) errors.first_name = "Required";
    if (!formData.surname.trim()) errors.surname = "Required";

    const pc = formData.postcode.trim().toUpperCase();
    if (!pc) errors.postcode = "Required";
    else if (!ukPostcodeRegex.test(pc)) errors.postcode = "Invalid postcode";

    if (!formData.house.trim()) errors.house = "Required";
    if (!formData.street.trim()) errors.street = "Required";
    if (!formData.town.trim()) errors.town = "Required";
    if (!formData.county.trim()) errors.county = "Required";

    // PHONE
    if (!formData.phone.trim()) errors.phone = "Required";
    else {
      const parsed = parsePhoneNumberFromString(formData.phone, "GB");
      if (!parsed || !parsed.isValid()) errors.phone = "Invalid UK number";
    }

    // EMAIL
    if (!/^\S+@\S+\.\S+$/.test(formData.email))
      errors.email = "Invalid email address";

    // PASSWORD
    if (formData.password.length < 8)
      errors.password = "Minimum 8 characters";

    if (formData.password !== formData.confirm)
      errors.confirm = "Passwords do not match";

    // TERMS
    if (!formData.agree) errors.agree = "You must agree to the Terms";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─────────────────────────────────────────────
  // FORM INPUT HANDLER
  // ─────────────────────────────────────────────
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "password") {
      setPasswordStrength(calculateStrength(value));
    }
  };

  // ─────────────────────────────────────────────
  // ADDRESS LOOKUP
  // ─────────────────────────────────────────────
  const handleFindAddress = async () => {
    if (!formData.postcode.trim()) {
      setError("Enter a postcode first.");
      return;
    }
    setError("");
    setAddresses([]);
    setSelectedAddress("");
    setAddressLoading(true);

    try {
      const res = await fetch(
        `/api/getaddress?postcode=${encodeURIComponent(formData.postcode)}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Address lookup error:", data);
        setError(data.error || "Failed to find address.");
        return;
      }

      const cleaned = (data.addresses || [])
        .map((addr: string) =>
          addr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ")
        )
        .filter(Boolean)
        .sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { numeric: true })
        );

      setAddresses(cleaned);
    } catch (err) {
      console.error("Address lookup error:", err);
      setError("Failed to find address.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSelectAddress = (address: string) => {
    setSelectedAddress(address);
    const parts = address.split(",").map((p) => p.trim());

    setFormData((prev) => ({
      ...prev,
      house: parts[0] || "",
      street: parts[1] || "",
      town: parts[parts.length - 2] || "",
      county: parts[parts.length - 1] || "",
      postcode: prev.postcode.toUpperCase(),
    }));
  };

  // ─────────────────────────────────────────────
  // SUBMIT FORM
  // ─────────────────────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateFields()) return;

    setLoading(true);

    try {
      // Create user
      await account.create(
        ID.unique(),
        formData.email,
        formData.password,
        `${formData.first_name} ${formData.surname}`
      );

      // Create session
      await account.createEmailPasswordSession(
        formData.email,
        formData.password
      );

     // Send verification
const verifyUrl = `${window.location.origin.replace(/\/$/, "")}/verified`;
await account.createVerification(verifyUrl);

// Save profile  ✅ FIXED: use PROFILES db + collection env vars
await databases.createDocument(
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
  ID.unique(),
  {
    first_name: formData.first_name,
    surname: formData.surname,
    house: formData.house,
          street: formData.street,
          town: formData.town,
          county: formData.county,
          postcode: formData.postcode.toUpperCase(),
          phone: formData.phone,
          email: formData.email,
          agree_to_terms: true,
        }
      );

      // SUCCESS — form hidden, only message shown
      setSuccess(true);
      setFormData({
        first_name: "",
        surname: "",
        house: "",
        street: "",
        town: "",
        county: "",
        postcode: "",
        phone: "",
        email: "",
        password: "",
        confirm: "",
        agree: false,
      });
      setAddresses([]);
      setSelectedAddress("");
      setManualEntry(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // INPUT COMPONENT
  // ─────────────────────────────────────────────
  const renderInput = (
    name: string,
    placeholder: string,
    type = "text",
    toggle = false
  ) => {
    const value = (formData as any)[name];
    const err = fieldErrors[name];
    const isPassword = type === "password";

    const visible =
      name === "password"
        ? showPassword
        : name === "confirm"
        ? showConfirm
        : false;

    const toggleFn =
      name === "password"
        ? () => setShowPassword((s) => !s)
        : () => setShowConfirm((s) => !s);

    return (
      <div className="relative">
        <input
          type={isPassword && visible ? "text" : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={`border rounded-md px-3 py-2 w-full pr-10 ${
            err
              ? "border-red-500 bg-red-50"
              : value
              ? "border-green-500"
              : "border-gray-300"
          }`}
        />

        {value && !err && (
          <CheckCircleIcon className="w-5 h-5 text-green-600 absolute right-2 top-3" />
        )}
        {err && (
          <XCircleIcon className="w-5 h-5 text-red-500 absolute right-2 top-3" />
        )}

        {toggle && (
          <div
            onClick={toggleFn}
            className="absolute right-8 top-2.5 text-gray-600 cursor-pointer"
          >
            {visible ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </div>
        )}

        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 p-6">
      <div className="w-full max-w-lg bg-white shadow-md rounded-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-4">
          Create Your Account
        </h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-2 rounded-md mb-4 text-center">
            {error}
          </p>
        )}

        {success && (
          <p className="bg-green-100 text-green-700 p-2 rounded-md mb-4 text-center">
            ✅ Registration successful! Please check your email to verify your
            account.
          </p>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NAME ROW */}
            <div className="grid grid-cols-2 gap-4">
              {renderInput("first_name", "First Name")}
              {renderInput("surname", "Surname")}
            </div>

            {/* POSTCODE LOOKUP */}
            {!manualEntry && (
              <>
                <div className="flex gap-2">
                  {renderInput("postcode", "ENTER POSTCODE")}
                  <button
                    type="button"
                    onClick={handleFindAddress}
                    disabled={addressLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    {addressLoading ? "Searching…" : "Find"}
                  </button>
                </div>

                {addresses.length > 0 && (
                  <select
                    className="border rounded-md px-3 py-2 w-full"
                    value={selectedAddress}
                    onChange={(e) => handleSelectAddress(e.target.value)}
                  >
                    <option value="">Select Address</option>
                    {addresses.map((a, i) => (
                      <option key={i}>{a}</option>
                    ))}
                  </select>
                )}

                <p
                  className="text-sm text-blue-600 underline cursor-pointer text-center"
                  onClick={() => setManualEntry(true)}
                >
                  Can&apos;t find your address? Enter manually
                </p>
              </>
            )}

            {(manualEntry || selectedAddress) && (
              <>
                {renderInput("house", "House Name or Number")}
                {renderInput("street", "Street")}
                {renderInput("town", "Town or City")}
                {renderInput("county", "County")}
                {renderInput("postcode", "Postcode")}

                {manualEntry && (
                  <p
                    className="text-sm text-blue-600 underline cursor-pointer text-center"
                    onClick={() => setManualEntry(false)}
                  >
                    Use postcode lookup instead
                  </p>
                )}
              </>
            )}

            {renderInput("phone", "Phone Number")}
            {renderInput("email", "Email Address", "email")}
            {renderInput("password", "Password", "password", true)}

            {/* Strength bar */}
            {formData.password && (
              <div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 rounded-full ${passwordStrength.color}`}
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {passwordStrength.label}
                </p>
              </div>
            )}

            {renderInput("confirm", "Confirm Password", "password", true)}

            {/* TERMS */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
              />
              <label className="text-sm">
                I agree to the{" "}
                <span
                  className="text-blue-600 underline cursor-pointer"
                  onClick={() => setShowTerms(true)}
                >
                  Terms &amp; Conditions
                </span>
              </label>
            </div>
            {fieldErrors.agree && (
              <p className="text-xs text-red-600">{fieldErrors.agree}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Register"}
            </button>
          </form>
        )}
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* T&Cs MODAL – main site version               */}
      {/* ───────────────────────────────────────────── */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Terms &amp; Conditions
                </h2>
                <p className="text-xs text-gray-500">
                  Effective Date: February 2025
                </p>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => setShowTerms(false)}
                aria-label="Close terms"
              >
                ✕
              </button>
            </div>

            {/* Body (same content as main site) */}
            <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm leading-relaxed text-gray-800 space-y-6">
              <p>
                These Terms and Conditions govern your use of
                AuctionMyPlate.co.uk (“we”, “us”, “our”). By accessing or
                using the platform, you agree to these Terms.
              </p>

              <p>
                AuctionMyPlate.co.uk is{" "}
                <strong>
                  not affiliated, authorised, endorsed or associated
                </strong>{" "}
                with the Driver and Vehicle Licensing Agency (DVLA) or any UK
                government organisation.
              </p>

              <h3 className="font-semibold text-lg">1. Eligibility</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>You must be at least 18 years old.</li>
                <li>You must provide accurate information.</li>
                <li>
                  You must be legally capable of selling the registration.
                </li>
                <li>
                  Fraud or identity deception results in immediate account
                  suspension.
                </li>
              </ul>

              <h3 className="font-semibold text-lg">2. User Accounts</h3>
              <p>
                You are responsible for keeping your login details secure. We
                may suspend or terminate accounts that breach our rules or
                appear fraudulent. Multiple accounts without permission are
                not allowed.
              </p>

              <h3 className="font-semibold text-lg">
                3. Listings &amp; Plate Ownership
              </h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  You must be the legal owner or have written permission to
                  sell.
                </li>
                <li>
                  You must hold correct documentation (V5C, V750, V778).
                </li>
                <li>
                  You must not misrepresent the registration or its
                  eligibility.
                </li>
                <li>
                  We reserve the right to remove or suspend any listing at our
                  discretion.
                </li>
              </ul>

              <h3 className="font-semibold text-lg">4. Auction Format</h3>
              <p>
                Weekly auctions run{" "}
                <strong>Monday 01:00 – Sunday 23:00</strong> with a{" "}
                <strong>5-minute soft close</strong>. All bids placed are
                legally binding. Bidders must ensure they have sufficient
                funds. Reserve prices are hidden. If the reserve is met, the
                plate will sell.
              </p>

              <h3 className="font-semibold text-lg">5. Buy Now</h3>
              <p>
                Selecting Buy Now ends the auction immediately. The sale
                becomes legally binding and the buyer must complete payment
                and DVLA transfer obligations promptly.
              </p>

              <h3 className="font-semibold text-lg">6. Reserve Prices</h3>
              <p>
                The seller may set a reserve. If the reserve is not met, the
                seller is not obliged to complete the sale. If the reserve{" "}
                <strong>is</strong> met, both parties must complete the
                transaction.
              </p>

              <h3 className="font-semibold text-lg">7. Fees</h3>

              <h4 className="font-semibold">7.1 Listing Fees</h4>
              <p>
                Listing may be free during introductory periods. Future fees
                may apply to sellers and/or buyers.
              </p>

              <h4 className="font-semibold">7.2 Commission</h4>
              <p>
                Commission is deducted automatically when a plate sells. No
                commission is charged if it does not sell.
              </p>

              <h4 className="font-semibold">
                7.3 DVLA Assignment Fee (£80.00)
              </h4>
              <p>
                A <strong>£80.00 DVLA assignment fee</strong> is added to all
                winning bids to cover the processing of documentation and
                registration transfer. AuctionMyPlate.co.uk has no affiliation
                with the DVLA.
              </p>

              <h4 className="font-semibold">7.4 Refunds</h4>
              <p>Fees are non-refundable unless required by law.</p>

              <h3 className="font-semibold text-lg">
                8. Transfer of Registration
              </h3>
              <p>
                <strong>Seller responsibilities:</strong>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Provide accurate information and valid documents.</li>
                <li>
                  Cooperate promptly in completing the registration transfer.
                </li>
              </ul>

              <p>
                <strong>Buyer responsibilities:</strong>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Ensure their vehicle is eligible for the registration.</li>
                <li>Pay any DVLA-required fees.</li>
                <li>Submit paperwork correctly and promptly.</li>
              </ul>

              <p>
                We are not responsible for DVLA delays, rejections, lost post,
                or mistakes made by buyers or sellers.
              </p>

              <h3 className="font-semibold text-lg">
                9. Legal Display of Plates
              </h3>
              <p>
                All plates must be displayed in accordance with DVLA
                regulations. Illegal spacing or styling may result in fines,
                MOT failure, or police action. We are not responsible for how
                users choose to display their registrations.
              </p>

              <h3 className="font-semibold text-lg">10. Prohibited Use</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Fraudulent listings or shill bidding.</li>
                <li>Illegal spacing or misrepresentation.</li>
                <li>Harassment or abusive behaviour.</li>
                <li>Using fake identities or payment methods.</li>
                <li>Manipulating auction outcomes.</li>
              </ul>

              <h3 className="font-semibold text-lg">11. Liability</h3>
              <p>
                We are not liable for losses, disputes, DVLA issues, platform
                downtime, inaccurate listings, or the behaviour of other
                users. We act solely as a marketplace.
              </p>

              <h3 className="font-semibold text-lg">
                12. Non-Payment by Buyer
              </h3>
              <p>
                If a buyer fails to complete the transaction, we may cancel
                the sale, suspend the account, and allow the seller to relist
                the registration.
              </p>

              <h3 className="font-semibold text-lg">
                13. Suspension &amp; Removal
              </h3>
              <p>
                We may remove listings or suspend accounts at our discretion
                in cases of fraud, suspicious activity, abusive behaviour, or
                breaches of these Terms.
              </p>

              <h3 className="font-semibold text-lg">
                14. Changes to Terms
              </h3>
              <p>
                We may update these Terms at any time. Continued use of the
                platform constitutes acceptance of the updated Terms.
              </p>

              <h3 className="font-semibold text-lg">15. Contact</h3>
              <p>
                For support:{" "}
                <strong>support@auctionmyplate.co.uk</strong>
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 rounded-md bg-black text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
