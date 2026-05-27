"use client";

import { useState } from "react";

export default function CheckoutButton({ participantId }: { participantId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={startCheckout} className="flex flex-col sm:flex-row gap-2">
      <input
        required
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-ironman-red hover:bg-red-700 disabled:opacity-50 text-white rounded px-5 py-2 font-medium"
      >
        {loading ? "Redirecting…" : "Buy recap — $5"}
      </button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}
