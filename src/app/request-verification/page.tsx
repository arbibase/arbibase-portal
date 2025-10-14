"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type PropItem = { address: string; city: string; state: string; url: string };

export default function RequestVerification() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [propsList, setPropsList] = useState<PropItem[]>([
    { address: "", city: "", state: "", url: "" },
  ]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        console.error("Supabase client is not available");
        return router.replace("/login");
      }
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.replace("/login");
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
    })();
  }, [router]);

  const addProperty = () =>
    setPropsList((arr) => [...arr, { address: "", city: "", state: "", url: "" }]);

  const removeProperty = (idx: number) =>
    setPropsList((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));

  const updateProp = (idx: number, field: keyof PropItem, value: string) =>
    setPropsList((arr) => {
      const copy = [...arr];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });

  function validEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return setStatus("You must be logged in.");
    if (!email || !validEmail(email)) return setStatus("Please enter a valid email.");
    if (!propsList.some((p) => p.address || p.url)) {
      return setStatus("Please add at least one property (address or URL).");
    }

    if (!supabase) {
      console.error("Supabase client is not available");
      return setStatus("Supabase client is not available. Please log in again.");
    }

    setSubmitting(true);
    setStatus("Submitting…");

    try {
      // 1) parent request (user_id auto-set by trigger if not provided)
      const { data: reqRow, error: reqErr } = await supabase
        .from("requests")
        .insert({ email, notes })
        .select("id")
        .single();

      if (reqErr) throw reqErr;
      const requestId = reqRow.id as string;

      // 2) property items
      const items = propsList
        .filter((p) => p.address || p.city || p.state || p.url)
        .map((p) => ({
          request_id: requestId,
          property_address: p.address || null,
          city: p.city || null,
          state: p.state || null,
          property_url: p.url || null,
        }));

      if (items.length) {
        const { error: itemsErr } = await supabase.from("request_items").insert(items);
        if (itemsErr) throw itemsErr;
      }

// 3) push to GHL (do not block UX if it fails)
  const r = await fetch("/api/ghl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "Request",               // <— optional; API now also auto-detects
      email,
      request_id: requestId,
      notes,
      properties: items,
      page: location.href,
    }),
  });
  const j = await r.json().catch(() => ({}));
  console.log("GHL proxy resp:", r.status, j);
  if (!r.ok) throw new Error("Webhook failed: " + (j?.error || r.status));
  
  setStatus("Request sent! Redirecting…");
  setTimeout(() => router.push("/dashboard"), 1000);
} catch (err:any) {
  console.error("Submit error:", err);
  setStatus("Error: " + (err.message ?? String(err)));
} finally {
  setSubmitting(false);
}

  }
  
  return (
    <main className="container mx-auto p-6" style={{ maxWidth: 820 }}>
      <h1 className="text-3xl font-extrabold">Request Verification</h1>
      <p className="mt-2" style={{ color: "#9aa5b1" }}>
        Add one or more properties you’d like us to verify.
      </p>

      <form onSubmit={submit} className="grid gap-4 mt-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Your email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 bg-transparent"
            required
          />
        </div>

        <div className="grid gap-4">
          {propsList.map((p, idx) => (
            <div key={idx} className="rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <strong>Property #{idx + 1}</strong>
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeProperty(idx)}
                  disabled={propsList.length === 1}
                >
                  Remove
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  placeholder="Property address"
                  value={p.address}
                  onChange={(e) => updateProp(idx, "address", e.target.value)}
                  className="rounded-lg border px-3 py-2 bg-transparent"
                />
                <input
                  placeholder="Property URL"
                  value={p.url}
                  onChange={(e) => updateProp(idx, "url", e.target.value)}
                  className="rounded-lg border px-3 py-2 bg-transparent"
                />
                <input
                  placeholder="City"
                  value={p.city}
                  onChange={(e) => updateProp(idx, "city", e.target.value)}
                  className="rounded-lg border px-3 py-2 bg-transparent"
                />
                <input
                  placeholder="State"
                  value={p.state}
                  onChange={(e) => updateProp(idx, "state", e.target.value)}
                  className="rounded-lg border px-3 py-2 bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Notes</label>
          <textarea
            placeholder="Anything we should know…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 bg-transparent"
            rows={3}
          />
        </div>

        <div className="flex gap-8 items-center">
          <button type="button" className="btn" onClick={addProperty}>
            + Add another property
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </div>

        <p className="text-sm" style={{ color: "#9aa5b1" }}>
          {status}
        </p>
      </form>
    </main>
  );
}

// (Removed duplicate code block after the component. All logic is already handled inside the submit() function.)

