"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account, Databases, ID, Query } from "appwrite";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import NumberPlate from "@/components/ui/NumberPlate";
import AdminAuctionTimer from "@/components/ui/AdminAuctionTimer";
import SellerDocumentsUploader from "@/components/ui/SellerDocumentsUploader";

// -----------------------------
// Appwrite setup
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ---------------------------------------
// ENV CONSTANTS (plates + transactions)
// ---------------------------------------
const PLATES_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63"; // fallback

const PLATES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Transactions use the SAME database as plates
const TX_DB_ID = PLATES_DB_ID;
// IMPORTANT: hard-code to the actual collection id you see in Appwrite
const TX_COLLECTION_ID = "transactions";

// Helpful debug to see what the browser actually has
if (typeof window !== "undefined") {
  console.log("ENV CHECK (dashboard)", {
    PLATES_DB_ID,
    PLATES_COLLECTION_ID,
    TX_DB_ID,
    TX_COLLECTION_ID,
  });
}

// -----------------------------
// Types
// -----------------------------
type Profile = {
  $id: string;
  first_name?: string;
  surname?: string;
  house?: string;
  street?: string;
  town?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
};

type Plate = {
  $id: string;
  registration: string;
  plate_type: string;
  expiry_date?: string | null;
  description?: string;
  reserve_price: number;
  starting_price?: number;
  buy_now?: number;
  listing_fee?: number;
  commission_rate?: number;
  expected_return?: number;
  owner_confirmed?: boolean;
  agreed_terms?: boolean;
  status: string;
  seller_email: string;
  auction_end?: string;
  auction_start?: string;
  current_bid?: number;
};

type Transaction = {
  $id: string;
  registration?: string;
  listing_id?: string;
  seller_email?: string;
  buyer_email?: string;
  sale_price?: number;
  commission_amount?: number;
  commission_rate?: number;
  dvla_fee?: number;
  seller_payout?: number;
  payment_status?: string; // "pending" | "paid"
  transaction_status?: string; // "pending" | "complete" | "awaiting_documents"
  documents?: any[];
  created_at?: string;
  updated_at?: string;
};

// -----------------------------
// Component
// -----------------------------
export default function DashboardPage() {
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "profile" | "sell" | "awaiting" | "approvedQueued" | "live" | "history" | "transactions"
  >("sell");

  // Auth + profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Loading + feedback
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  // Plate groups
  const [awaitingPlates, setAwaitingPlates] = useState<Plate[]>([]);
  const [approvedPlates, setApprovedPlates] = useState<Plate[]>([]);
  const [livePlates, setLivePlates] = useState<Plate[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Sell form
  const [sellForm, setSellForm] = useState({
    registration: "",
    plate_type: "",
    expiry_date: "",
    description: "",
    reserve_price: "",
    starting_price: "",
    buy_now: "",
    owner_confirmed: false,
    agreed_terms: false,
  });

  const [listingFee, setListingFee] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(0);
  const [sellError, setSellError] = useState("");
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Terms
  const [showTerms, setShowTerms] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --------------------------------------------------------
  // LOAD EVERYTHING (auth-only redirect, no loop)
  // --------------------------------------------------------
  useEffect(() => {
    const loadAll = async () => {
      // 1) AUTH CHECK – ONLY THIS IS ALLOWED TO REDIRECT
      let current: any;
      try {
        current = await account.get();
      } catch (err) {
        console.warn("Auth error in dashboard (probably just logged out):", err);
        router.push("/login-or-register");
        return;
      }

      // 🔥 If this is the admin account, do NOT show seller dashboard
      if (current.email === "admin@auctionmyplate.co.uk") {
        router.push("/admin");
        return;
      }

      if (!current.emailVerification) {
        router.push("/resend-verification");
        return;
      }

      setUser(current);

      // 2) DATA LOAD – errors here should NOT boot you to login
      try {
        // ----- PROFILE -----
        const profRes = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
          [Query.equal("email", current.email)]
        );
        if (profRes.documents.length > 0) {
          setProfile(profRes.documents[0] as Profile);
        }

        // ----- PLATES -----
        const platesRes = await databases.listDocuments(
          PLATES_DB_ID,
          PLATES_COLLECTION_ID,
          [Query.equal("seller_email", current.email)]
        );
        const docs = platesRes.documents as Plate[];

        setAwaitingPlates(docs.filter((p) => p.status === "pending"));
        setApprovedPlates(docs.filter((p) => p.status === "queued"));
        setLivePlates(docs.filter((p) => p.status === "live"));
        setPlates(docs);

        // ----- TRANSACTIONS (NON-FATAL) -----
        try {
          if (!TX_DB_ID || !TX_COLLECTION_ID) {
            console.warn("Transactions env vars missing", {
              TX_DB_ID,
              TX_COLLECTION_ID,
            });
          } else {
            const txRes = await databases.listDocuments(
              TX_DB_ID,
              TX_COLLECTION_ID,
              [Query.equal("seller_email", current.email)]
            );
            setTransactions(txRes.documents as Transaction[]);
          }
        } catch (txErr) {
          console.error("Transactions load error (non-fatal):", txErr);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
        setBannerError(
          "We couldn't load all your dashboard data. Please refresh the page or try again later."
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadAll();
  }, [router]);

  // --------------------------------------------------------
  // AUTO LOGOUT AFTER 5 MINUTES
  // --------------------------------------------------------
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await account.deleteSession("current");
        } catch {
          // ignore
        }
        alert("Logged out due to inactivity.");
        router.push("/login");
      }, 5 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [router]);

  // --------------------------------------------------------
  // PROFILE CHANGE HANDLER
  // --------------------------------------------------------
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
    setBannerError("");
    setBannerSuccess("");
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSavingProfile(true);
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
        profile.$id,
        {
          first_name: profile.first_name || "",
          surname: profile.surname || "",
          house: profile.house || "",
          street: profile.street || "",
          town: profile.town || "",
          county: profile.county || "",
          postcode: profile.postcode || "",
          phone: profile.phone || "",
        }
      );
      setBannerSuccess("Profile updated!");
    } catch {
      setBannerError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // --------------------------------------------------------
  // PASSWORD HANDLING
  // --------------------------------------------------------
  const validateNewPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (!validateNewPassword(newPassword)) {
      setPasswordError("Password must be 8+ chars incl. letters & numbers.");
      return;
    }

    setPasswordLoading(true);
    try {
      await account.updatePassword(newPassword, currentPassword);
      setPasswordSuccess("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Error updating password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // --------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore
    }
    router.push("/login-or-register");
  };

  // --------------------------------------------------------
  // FEE CALCULATOR
  // --------------------------------------------------------
  const calculateFees = (reserve: number) => {
    let fee = 0;
    let commission = 0;

    if (reserve <= 4999.99) {
      fee = 0;
      commission = 10;
    } else if (reserve <= 9999.99) {
      commission = 8;
    } else if (reserve <= 24999.99) {
      commission = 7;
    } else if (reserve <= 49999.99) {
      commission = 6;
    } else {
      commission = 5;
    }

    const expected = reserve - (reserve * commission) / 100 - fee;

    setListingFee(fee);
    setCommissionRate(commission);
    setExpectedReturn(isNaN(expected) ? 0 : expected);
  };

  // --------------------------------------------------------
  // SELL FORM HANDLING
  // --------------------------------------------------------
  const handleSellChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type, checked } = e.target;
    let val: any = type === "checkbox" ? checked : value;

    // Format registration spacing
    if (name === "registration") {
      let reg = value.replace(/\s+/g, "").toUpperCase();
      if (reg.length > 4) reg = reg.slice(0, 4) + " " + reg.slice(4);
      val = reg;
    }

    setSellForm((prev) => ({ ...prev, [name]: val }));
    setSellError("");

    if (name === "reserve_price") {
      const num = parseFloat(value);
      if (!isNaN(num)) calculateFees(num);
    }
  };

  const validateRetentionDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    return d > today;
  };

  // --------------------------------------------------------
// SELL SUBMIT
// --------------------------------------------------------
const handleSellSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSellError("");

  if (!user) {
    setSellError("Your session has expired. Please log in again.");
    router.push("/login");
    return;
  }

  if (!sellForm.registration.trim()) {
    setSellError("Registration is required.");
    return;
  }
  if (!sellForm.plate_type) {
    setSellError("Please select a plate type.");
    return;
  }
  if (
    sellForm.plate_type === "retention" &&
    (!sellForm.expiry_date || !validateRetentionDate(sellForm.expiry_date))
  ) {
    setSellError("Retention expiry date must be a valid future date.");
    return;
  }
  if (!sellForm.owner_confirmed) {
    setSellError("You must confirm you are the legal owner.");
    return;
  }
  if (!sellForm.agreed_terms) {
    setSellError("You must agree to the Terms & Conditions.");
    return;
  }

  const reserve = parseFloat(sellForm.reserve_price);
const starting = sellForm.starting_price
  ? parseFloat(sellForm.starting_price)
  : 0;
const buyNow = sellForm.buy_now ? parseFloat(sellForm.buy_now) : 0;

// 🔒 Enforce minimum reserve price of £300
if (isNaN(reserve) || reserve < 300) {
  setSellError("Minimum reserve price is £300.");
  return;
}

  if (!isNaN(starting) && starting > 0 && starting >= reserve) {
    setSellError("Starting price must be lower than the reserve price.");
    return;
  }

  if (!isNaN(buyNow) && buyNow > 0) {
    const minBuyNow = Math.max(
      reserve,
      !isNaN(starting) && starting > 0 ? starting : 0
    );
    if (buyNow < minBuyNow) {
      setSellError(
        "Buy Now price cannot be lower than your reserve price or starting price."
      );
      return;
    }
  }

  setSellSubmitting(true);

  try {
    // 🔹 Normalise registration
    const normalizedReg = sellForm.registration.replace(/\s+/g, "").toUpperCase();

    // 🔹 DUPLICATE CHECK
    const existingRes = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      [
        Query.equal("seller_email", user.email),
        Query.equal("registration", normalizedReg),
      ]
    );

    const hasActiveDuplicate = existingRes.documents.some(
      (doc: any) =>
        doc.status === "pending" ||
        doc.status === "queued" ||
        doc.status === "live"
    );

    if (hasActiveDuplicate) {
      setSellError(
        "You already have an active listing for this registration. Please wait for the current listing to complete."
      );
      setSellSubmitting(false);
      return;
    }

    // 🔹 CREATE LISTING
    const created = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      ID.unique(),
      {
        registration: normalizedReg,
        plate_type: sellForm.plate_type,
        expiry_date: sellForm.expiry_date || null,
        description: sellForm.description || "",
        reserve_price: reserve,
        starting_price: !isNaN(starting) ? starting : 0,
        buy_now: !isNaN(buyNow) ? buyNow : 0,
        listing_fee: listingFee,
        commission_rate: commissionRate,
        expected_return: Math.round(Number(expectedReturn)),
        owner_confirmed: sellForm.owner_confirmed,
        agreed_terms: sellForm.agreed_terms,
        status: "pending",
        seller_email: user.email,
        created_at: new Date().toISOString(),
      }
    );

    // 🔔 NOTIFY ADMIN + SELLER
    try {
      const notifyRes = await fetch("/api/admin/new-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: created.$id,
          registration: normalizedReg,
          sellerEmail: user.email,
          reserve_price: reserve,
          starting_price: !isNaN(starting) ? starting : 0,
          buy_now: !isNaN(buyNow) ? buyNow : 0,
        }),
      });

      if (!notifyRes.ok) {
        const text = await notifyRes.text();
        console.error(
          "❌ /api/admin/new-listing failed:",
          notifyRes.status,
          notifyRes.statusText,
          text
        );
      } else {
        console.log("✅ /api/admin/new-listing succeeded");
      }
    } catch (notifyErr) {
      console.error("Failed to notify admin about new listing:", notifyErr);
      // don't block user if email fails
    }

    // 🔄 Refresh seller’s plates
    const platesRes = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      [Query.equal("seller_email", user.email)]
    );

    const docs = platesRes.documents as unknown as Plate[];
    setAwaitingPlates(docs.filter((p) => p.status === "pending"));
    setApprovedPlates(docs.filter((p) => p.status === "queued"));
    setLivePlates(docs.filter((p) => p.status === "live"));
    setPlates(docs);

    alert("Listing submitted! Awaiting approval.");

    // reset form + fee state
    setSellForm({
      registration: "",
      plate_type: "",
      expiry_date: "",
      description: "",
      reserve_price: "",
      starting_price: "",
      buy_now: "",
      owner_confirmed: false,
      agreed_terms: false,
    });

    setListingFee(0);
    setCommissionRate(0);
    setExpectedReturn(0);
  } catch (err: any) {
    console.error("Create listing error:", err);
    setSellError("Failed to create listing. Please try again.");
  } finally {
    setSellSubmitting(false);
  }
};

  // --------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <p className="text-gray-600 text-lg">Loading your dashboard…</p>
      </div>
    );
  }

  // --------------------------------------------------------
  // RENDER START
  // --------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FFFBEA] py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-yellow-700">
              Seller Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome,{" "}
              <span className="font-semibold">
                {profile?.first_name || user?.name || "Seller"}
              </span>
              .
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto px-4 py-2 text-sm font-semibold rounded-md border border-red-400 text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>

        {/* Banners */}
        {bannerError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-md mb-4 border border-red-200">
            <XCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerError}</span>
          </div>
        )}
        {bannerSuccess && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-md mb-4 border border-green-200">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerSuccess}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-6">
          {[
            ["profile", "Personal Details"],
            ["sell", "Sell a Plate"],
            ["awaiting", "Awaiting Approval"],
            ["approvedQueued", "Approved / Queued"],
            ["live", "Live Listings"],
            ["history", "History"],
            ["transactions", "Transactions"],
          ].map(([key, label]) => {
            const k = key as
              | "profile"
              | "sell"
              | "awaiting"
              | "approvedQueued"
              | "live"
              | "history"
              | "transactions";
            const active = activeTab === k;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(k)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-md border-b-4 transition ${
                  active
                    ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-yellow-700">
              Personal Details
            </h2>

            {!profile ? (
              <p className="text-gray-600">
                No profile found. Please contact support.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["first_name", "First Name"],
                    ["surname", "Surname"],
                    ["house", "House"],
                    ["street", "Street"],
                    ["town", "Town"],
                    ["county", "County"],
                    ["postcode", "Postcode"],
                    ["phone", "Phone"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        name={key}
                        value={(profile as any)[key] || ""}
                        onChange={handleProfileChange}
                        className="border rounded-md w-full px-3 py-2 text-sm"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Email (login)
                    </label>
                    <input
                      type="email"
                      value={profile.email || user?.email || ""}
                      disabled
                      className="border rounded-md w-full px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>

                {/* Change Password */}
                <div className="mt-10 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-700">
                    Change Password
                  </h3>

                  {passwordError && (
                    <p className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-3 border border-red-200">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2 mb-3 border border-green-200">
                      {passwordSuccess}
                    </p>
                  )}

                  <form
                    onSubmit={handlePasswordChange}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="border rounded-md w-full px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border rounded-md w-full px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Must include letters &amp; numbers, min 8 characters.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border rounded-md w-full px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
                      >
                        {passwordLoading ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Supporting Documents */}
                <div className="mt-10 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-700">
                    Supporting Documents
                  </h3>
                  <SellerDocumentsUploader
                    sellerId={profile.$id}
                    transactionId={null}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* SELL TAB */}
        {activeTab === "sell" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-xl font-bold text-yellow-700">Sell a Plate</h2>
              <p className="text-xs text-gray-600">
                Listing is free. Fees only apply if your plate sells.
              </p>
            </div>

            {sellError && (
              <p className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-2 border border-red-200">
                {sellError}
              </p>
            )}

            <form onSubmit={handleSellSubmit} className="space-y-5">
              {/* REGISTRATION + PLATE PREVIEW */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Registration
                </label>

                <input
                  name="registration"
                  value={sellForm.registration}
                  onChange={handleSellChange}
                  className="border rounded-md w-full px-3 py-2 text-sm"
                  placeholder="e.g. AB12 CDE"
                />

                <div className="flex justify-center pt-3 pb-2">
                  <NumberPlate
                    reg={sellForm.registration || ""}
                    size="large"
                    variant="rear"
                    showBlueBand={true}
                  />
                </div>
              </div>

              {/* PLATE TYPE */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Plate Type
                </label>
                <select
                  name="plate_type"
                  value={sellForm.plate_type}
                  onChange={handleSellChange}
                  className="border rounded-md w-full px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  <option value="vehicle">On a Vehicle</option>
                  <option value="retention">On a Retention Certificate</option>
                </select>
              </div>

              {/* RETENTION DATE (conditional) */}
              {sellForm.plate_type === "retention" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Retention Expiry Date
                    </label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={sellForm.expiry_date}
                      onChange={handleSellChange}
                      className="border rounded-md w-full px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be a valid future date.
                    </p>
                  </div>
                </div>
              )}

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={sellForm.description}
                  onChange={handleSellChange}
                  className="border rounded-md w-full px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Tell buyers why this plate is special."
                />
              </div>

              {/* PRICE GRID WITH EXPLANATIONS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* RESERVE PRICE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reserve Price (£)
                  </label>

                  <div className="bg-yellow-50 border border-yellow-200 text-[11px] text-gray-700 rounded-md p-2 mb-2">
                    This is the minimum amount you will accept for the plate. If
                    bidding does not reach this value, the plate will not be
                    sold.
                  </div>

                 <input
  type="number"
  name="reserve_price"
  value={sellForm.reserve_price}
  onChange={handleSellChange}
  className="border rounded-md w-full px-3 py-2 text-sm"
  min={300} // 👈 browser guard
  step="0.01"
  placeholder="Minimum reserve £300"
/>
                </div>

                {/* STARTING PRICE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Starting Price (£){" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>

                  <div className="bg-yellow-50 border border-yellow-200 text-[11px] text-gray-700 rounded-md p-2 mb-2">
                    This is the starting amount for bidding. Leave empty for £0
                    (recommended).
                  </div>

                  <input
                    type="number"
                    name="starting_price"
                    value={sellForm.starting_price}
                    onChange={handleSellChange}
                    className="border rounded-md w-full px-3 py-2 text-sm"
                    min={0}
                    step="0.01"
                    placeholder="Leave empty for £0"
                  />
                </div>

                {/* BUY NOW */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buy Now (£)
                  </label>

                  <div className="bg-yellow-50 border border-yellow-200 text-[11px] text-gray-700 rounded-md p-2 mb-2">
                    This is the price you are willing to sell the plate for
                    instantly. If a buyer uses Buy Now, the auction ends
                    immediately.
                  </div>

                  <input
                    type="number"
                    name="buy_now"
                    value={sellForm.buy_now}
                    onChange={handleSellChange}
                    className="border rounded-md w-full px-3 py-2 text-sm"
                    min={0}
                    step="0.01"
                  />
                </div>

                {/* SUMMARY BOX */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-gray-700">
                  <p>
                    Listing fee:{" "}
                    <strong>£{listingFee.toFixed(2)}</strong>
                  </p>
                  <p>
                    Commission:{" "}
                    <strong>{commissionRate.toFixed(1)}%</strong>
                  </p>
                  <p>
                    Expected return:{" "}
                    <strong>
                      £
                      {expectedReturn > 0
                        ? expectedReturn.toFixed(2)
                        : "0.00"}
                    </strong>
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-1">
                <strong>Note:</strong> These calculations are based on your
                reserve price and will be recalculated when your plate is sold.
              </p>

              {/* CHECKBOXES */}
              <div className="space-y-2 text-xs text-gray-700">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="owner_confirmed"
                    checked={sellForm.owner_confirmed}
                    onChange={handleSellChange}
                    className="mt-1"
                  />
                  <span>
                    I confirm I am the legal owner or have authority to sell
                    this registration.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="agreed_terms"
                    checked={sellForm.agreed_terms}
                    onChange={handleSellChange}
                    className="mt-1"
                  />
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      className="text-blue-600 underline"
                      onClick={() => setShowTerms(true)}
                    >
                      Terms &amp; Conditions
                    </button>
                    .
                  </span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={sellSubmitting}
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
              >
                {sellSubmitting ? "Submitting…" : "Create Listing"}
              </button>
            </form>
          </div>
        )}

        {/* AWAITING TAB */}
        {activeTab === "awaiting" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Awaiting Approval
            </h2>
            {awaitingPlates.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">
                You have no listings awaiting approval.
              </p>
            ) : (
              <div className="grid gap-4">
                {awaitingPlates.map((p) => (
                  <div
                    key={p.$id}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-lg font-bold text-yellow-700">
                        {p.registration}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Reserve: £{p.reserve_price}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: Awaiting admin approval.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPROVED / QUEUED TAB */}
        {activeTab === "approvedQueued" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Approved / Queued Listings
            </h2>

            <p className="text-sm text-gray-600 mb-4">
              These plates have been approved by admin and will enter the next
              weekly auction.
            </p>

            {approvedPlates.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">
                You have no approved listings waiting for the next auction.
              </p>
            ) : (
              <div className="grid gap-4">
                {approvedPlates.map((p) => {
                  const now = new Date();
                  const start = p.auction_start
                    ? new Date(new Date(p.auction_start).toISOString())
                    : null;
                  const end = p.auction_end
                    ? new Date(new Date(p.auction_end).toISOString())
                    : null;

                  const canWithdraw = !!(start && now < start);

                  return (
                    <div
                      key={p.$id}
                      className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-yellow-700">
                          {p.registration}
                        </h3>

                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                          Approved / Queued
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                        <p>
                          <strong>Reserve:</strong> £{p.reserve_price}
                        </p>
                        <p>
                          <strong>Starting Price:</strong> £
                          {p.starting_price || 0}
                        </p>
                        <p>
                          <strong>Buy Now:</strong>{" "}
                          {p.buy_now ? `£${p.buy_now}` : "—"}
                        </p>
                      </div>

                      <div className="mt-3 text-sm text-gray-700">
                        <strong>Auction Window: </strong>
                        {start
                          ? start.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}{" "}
                        –{" "}
                        {end
                          ? end.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}
                      </div>

                      <div className="mt-2">
                        <AdminAuctionTimer
                          start={p.auction_start}
                          end={p.auction_end}
                          status="queued"
                        />
                      </div>

                      {canWithdraw && (
                        <button
                          className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/withdraw-listing", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ listingId: p.$id }),
                              });

                              if (res.ok) {
                                setApprovedPlates((prev) =>
                                  prev.filter((x) => x.$id !== p.$id)
                                );
                                alert("Listing withdrawn successfully.");
                              } else {
                                alert("Failed to withdraw listing.");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Something went wrong.");
                            }
                          }}
                        >
                          Withdraw from Auction
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LIVE TAB */}
        {activeTab === "live" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Live Listings
            </h2>
            {livePlates.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">
                You currently have no live auction listings.
              </p>
            ) : (
              <div className="grid gap-4">
                {livePlates.map((p) => (
                  <div
                    key={p.$id}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-lg font-bold text-yellow-700">
                        {p.registration}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
                        Live
                      </span>
                    </div>

                    <p className="text-sm text-gray-700">
                      Current highest bid: £{p.current_bid || 0}
                    </p>

                    <p className="text-sm text-gray-700 mt-1">
                      Auction ends:{" "}
                      {p.auction_end
                        ? new Date(p.auction_end).toLocaleString("en-GB")
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">History</h2>

            {plates.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">
                Sold, unsold and completed auctions will appear here.
              </p>
            ) : (
              <div className="grid gap-5">
                {plates.map((plate) => (
                  <div
                    key={plate.$id}
                    className="border border-gray-200 rounded-xl p-5 bg-gray-50 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-bold text-yellow-700">
                        {plate.registration}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-semibold ${
                          plate.status === "sold"
                            ? "bg-green-100 text-green-700"
                            : plate.status === "not_sold"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {plate.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
                      <p>
                        <strong>Reserve:</strong> £{plate.reserve_price}
                      </p>
                      <p>
                        <strong>Highest Bid:</strong> £{plate.current_bid || 0}
                      </p>
                      <p>
                        <strong>Auction Ended:</strong>{" "}
                        {plate.auction_end
                          ? new Date(plate.auction_end).toLocaleString("en-GB")
                          : "—"}
                      </p>
                    </div>

                    {plate.status === "not_sold" && (
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          btn.disabled = true;
                          btn.textContent = "Relisting...";

                          try {
                            const res = await fetch("/api/relist-plate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                listingId: plate.$id,
                                seller_email: plate.seller_email,
                                registration: plate.registration,
                              }),
                            });

                            if (res.ok) {
                              setPlates((prev) =>
                                prev.map((p) =>
                                  p.$id === plate.$id
                                    ? { ...p, status: "queued" }
                                    : p
                                )
                              );
                              btn.outerHTML =
                                '<div class="mt-3 text-green-700 font-semibold bg-green-100 px-3 py-2 rounded-md text-center">Relisted</div>';
                            } else {
                              btn.textContent = "Retry Relist";
                              btn.disabled = false;
                              alert("Failed to relist. Try again.");
                            }
                          } catch (err) {
                            console.error(err);
                            btn.textContent = "Retry Relist";
                            btn.disabled = false;
                            alert("Something went wrong.");
                          }
                        }}
                        className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition"
                      >
                        Relist
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Transactions &amp; Payouts
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              Completed sales, commission and your expected payouts will appear
              here once plates are sold.
            </p>

            {transactions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">
                You don&apos;t have any transactions yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {transactions.map((tx) => {
                  const created =
                    tx.created_at && !isNaN(new Date(tx.created_at).getTime())
                      ? new Date(tx.created_at).toLocaleString("en-GB")
                      : null;

                  const updated =
                    tx.updated_at && !isNaN(new Date(tx.updated_at).getTime())
                      ? new Date(tx.updated_at).toLocaleString("en-GB")
                      : null;

                  const statusLabel =
                    tx.transaction_status || tx.payment_status || "pending";

                  const statusClasses =
                    statusLabel === "completed" || statusLabel === "paid"
                      ? "bg-green-100 text-green-700"
                      : statusLabel === "processing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600";

                  const regText =
                    (tx as any).registration ||
                    (tx as any).plate_registration ||
                    (tx as any).plate_id ||
                    "UNKNOWN";

                  const listingOrPlateId =
                    (tx as any).plate_id ||
                    (tx as any).listing_id ||
                    "N/A";

                  return (
                    <div
                      key={tx.$id}
                      className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm"
                    >
                      {/* Header: plate / listing / status */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-4">
                          {/* Plate visual */}
                          <NumberPlate registration={regText} />

                          {/* Text details */}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {regText}
                            </p>
                            <p className="text-xs text-gray-500">
                              Listing / Plate ID: {listingOrPlateId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Transaction ID: {tx.$id}
                            </p>
                          </div>
                        </div>

                        {/* Status pill */}
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${statusClasses}`}
                        >
                          {statusLabel.toUpperCase()}
                        </span>
                      </div>

                      {/* Money summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-700 mt-2">
                        <p>
                          <strong>Sale price:</strong> £
                          {(tx.sale_price ?? 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>Commission:</strong> £
                          {(tx.commission_amount ?? 0).toFixed(2)} (
                          {tx.commission_rate ?? 0}%)
                        </p>
                        <p>
                          <strong>Seller payout:</strong> £
                          {(tx.seller_payout ?? 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>DVLA fee (buyer pays):</strong> £
                          {(tx.dvla_fee ?? 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                        <p>
                          <strong>Created:</strong>{" "}
                          {created || "Not recorded"}
                        </p>
                        <p>
                          <strong>Last updated:</strong>{" "}
                          {updated || "Not recorded"}
                        </p>
                      </div>

                      {/* Seller documents uploader */}
                      {tx.transaction_status === "awaiting_documents" && (
                        <div className="mt-4 border-t pt-3">
                          <p className="text-xs text-gray-600 mb-2">
                            To progress this sale, please upload your DVLA
                            paperwork (V5C, retention certificate, or any
                            documents we have requested). Our team will review
                            them before processing your payout.
                          </p>
                          <SellerDocumentsUploader
                            transactionId={tx.$id}
                            existingDocuments={tx.documents || []}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TERMS & CONDITIONS MODAL (same as main site) */}
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

              {/* Body */}
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
    </div>
  );
}
