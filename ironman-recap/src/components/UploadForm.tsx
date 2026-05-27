"use client";

import { useState } from "react";

export default function UploadForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult(`Imported ${data.count} participants for ${data.raceName}.`);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Race name (e.g. IRONMAN Lake Placid 2025)"
          className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2"
        />
        <input
          name="date"
          required
          type="date"
          className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2"
        />
        <input
          name="location"
          placeholder="Location"
          className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 md:col-span-2"
        />
        <input
          name="results"
          required
          type="file"
          accept=".csv,text/csv"
          className="md:col-span-2 text-sm"
        />
        <p className="md:col-span-2 text-xs text-neutral-500">
          Upload a CoachCox results CSV (header row required: Bib, Name, Country, Gender, Division,
          Overall Time, …, Qualified).
        </p>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-ironman-red hover:bg-red-700 disabled:opacity-50 text-white rounded px-5 py-2 font-medium"
      >
        {busy ? "Parsing…" : "Upload & import"}
      </button>
      {result && <p className="text-green-400 text-sm">{result}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
