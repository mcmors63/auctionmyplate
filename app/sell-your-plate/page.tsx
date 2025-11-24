"use client";

import { useState } from "react";

export default function SellYourPlatePage() {
  const [formData, setFormData] = useState({
    reg_number: "",
    starting_price: "",
    reserve_price: "",
    expiry_date: "",
    plate_status: "vehicle",
    owner_id: "demo-user", // Replace with real user later
  });

  const [loading, setLoading] = useState(false);

  // 🧩 Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🕒 Helper function: get next Sunday start/end
  const getNextSundayTimes = () => {
    const now = new Date();

    // Find how many days to add to reach Sunday
    const daysUntilSunday = (7 - now.getDay()) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);

    // Auction end = next Sunday + 7 days - 1 minute
    const auctionEnd = new Date(nextSunday);
    auctionEnd.setDate(nextSunday.getDate() + 7);
    auctionEnd.setMinutes(auctionEnd.getMinutes() - 1);

    return { auction_start: nextSunday, auction_end: auctionEnd };
  };

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { auction_start, auction_end } = getNextSundayTimes();

      const payload = {
        ...formData,
        auction_start,
        auction_end,
      };

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ Error: ${data.error || "Failed to create listing"}`);
      } else {
        alert("✅ Listing created successfully!");
        setFormData({
          reg_number: "",
          starting_price: "",
          reserve_price: "",
          expiry_date: "",
          plate_status: "vehicle",
          owner_id: "demo-user",
        });
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6">Sell Your Plate</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">Registration Number</label>
          <input
            type="text"
            name="reg_number"
            value={formData.reg_number}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Starting Price (£)</label>
          <input
            type="number"
            name="starting_price"
            value={formData.starting_price}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Reserve Price (£)</label>
          <input
            type="number"
            name="reserve_price"
            value={formData.reserve_price}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Expiry Date</label>
          <input
            type="date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-semibold">Plate Status</label>
          <select
            name="plate_status"
            value={for
