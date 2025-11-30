// app/contact/ContactForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !message.trim()) {
      setError("Please provide your email address and a message.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "We couldn't send your message. Please try again."
        );
      }

      setSuccess(
        "Thank you – your message has been sent. We'll get back to you as soon as we can."
      );
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      setError(
        err?.message ||
          "We couldn't send your message right now. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          If you have a question about a listing, an auction, or the transfer
          process, use the form below and we&apos;ll get back to you.
        </p>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="bg-green-50 text-green-700 border border-green-200 text-sm rounded-md px-3 py-2">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Email address *
          </label>
          <input
            id="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Subject (optional)
          </label>
          <input
            id="subject"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Message *
          </label>
          <textarea
            id="message"
            required
            rows={5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send message"}
        </button>
      </form>

      <div className="pt-3 border-top border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
