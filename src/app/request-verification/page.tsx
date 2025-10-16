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
const [pageUrl, setPageUrl] = useState<string | null>(null);

  // sample tiers data (was incorrectly destructured from an array)
  const tiers = [
    {
      idx: 0,
      id: "0599de3c-33f0-4759-aa88-d40f57f23d15",
      full_name: "Standard",
      role: "operator",
      created_at: "2025-10-16 04:13:45.025495+00",
      tier: "beta",
      property_requests_limit: 25,
    },
    {
      idx: 1,
      id: "248b4dee-09e4-4f90-bdc7-55884813a004",
      full_name: "Pro",
      role: "operator",
      created_at: "2025-10-16 04:23:48.002079+00",
      tier: "Pro",
      property_requests_limit: 50,
    },
    {
      idx: 2,
      id: "272f97e1-3473-4540-9815-a64495b68362",
      full_name: "Premium",
      role: "operator",
      created_at: "2025-10-06 22:51:48.934172+00",
      tier: "Premium",
      property_requests_limit: 100,
    },
  ];

  // derive defaults from sample data; propertyRequests is a runtime value (requests used) so default to 0
  const tier = tiers[0].tier;
  const propertyRequests = 0;

if (tier === "beta" && propertyRequests > 25)
  return alert("You’ve reached your 25 requests this month. Upgrade to Pro.");

useEffect(() => {
    (async () => {
      if (!supabase) return router.replace("/login");
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.replace("/login");
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
    })();
    if (typeof window !== "undefined") setPageUrl(window.location.href);
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
    if (!propsList.some((p) => p.address || p.url))
      return setStatus("Please add at least one property (address or URL).");
    if (!supabase) return setStatus("Supabase client unavailable. Please log in again.");

    setSubmitting(true);
    setStatus("Submitting…");

    try {
      // 1) parent request
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

      // 3) webhook (non-blocking)
      try {
        const r = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "request",
            email,
            request_id: requestId,
            notes,
            properties: items,
            page: pageUrl,
          }),
        });
        if (!r.ok) console.warn("Webhook failed", await r.text());
      } catch (err) {
        console.warn("Webhook error:", err);
      }

      setStatus("Request sent! Redirecting…");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err: any) {
      console.error("Submit error:", err);
      setStatus("Error: " + (err.message ?? String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="container" style={{ maxWidth: 820, paddingTop: 24 }}>
        <header style={{ marginBottom: 10 }}>
          <h1 className="text-2xl font-extrabold">Request Verification</h1>
          <p className="lead" style={{ marginTop: 6 }}>
            Add one or more properties you’d like us to verify. We’ll confirm licensing, HOA rules,
            and local compliance.
          </p>
        </header>

        <div className="card">
          <div className="card-body">
            <form onSubmit={submit} className="grid gap-4" aria-label="Verification request form">
              <div>
                <label className="block text-sm font-semibold mb-1">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
                  required
                />
              </div>

              <div className="grid gap-4">
                {propsList.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-[#2a3441] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <strong>Property #{idx + 1}</strong>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => removeProperty(idx)}
                        disabled={propsList.length === 1}
                        aria-disabled={propsList.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        placeholder="Property address"
                        value={p.address}
                        onChange={(e) => updateProp(idx, "address", e.target.value)}
                        className="rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
                      />
                      <input
                        placeholder="Property URL"
                        value={p.url}
                        onChange={(e) => updateProp(idx, "url", e.target.value)}
                        className="rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
                      />
                      <input
                        placeholder="City"
                        value={p.city}
                        onChange={(e) => updateProp(idx, "city", e.target.value)}
                        className="rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
                      />
                      <input
                        placeholder="State"
                        value={p.state}
                        onChange={(e) => updateProp(idx, "state", e.target.value)}
                        className="rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
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
                  className="w-full rounded-lg border px-3 py-2 bg-[#0f141c] border-[#2a3441]"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 items-center">
                <button type="button" className="btn ghost" onClick={addProperty}>
                  + Add another property
                </button>
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? "Sending…" : "Send Request"}
                </button>
              </div>

              <p className="text-sm" style={{ color: "#9aa5b1" }}>
                {status}
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
