"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PropItem = { address: string; city: string; state: string; url: string };

type TierInfo = {
  name: "beta" | "Pro" | "Premium" | string;
  limit: number;
};

function getDefaultTier(): TierInfo {
  // Safe defaults if we can’t read a profile
  return { name: "beta", limit: 25 };
}

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

  // usage / tier
  const [tier, setTier] = useState<TierInfo>(getDefaultTier());
  const [usedThisMonth, setUsedThisMonth] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    (async () => {
      if (!supabase) return router.replace("/login");
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.replace("/login");

      const { id, email } = data.user;
      setUserId(id);
      setEmail(email ?? "");

      // --- optional: read profile/tier if you store it
      // Expecting table "profiles": { id, plan_tier }
      // Fallback to defaults if not found.
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_tier")
          .eq("id", id)
          .single();

        if (profile?.plan_tier) {
          const t = String(profile.plan_tier);
          const resolved: TierInfo =
            t === "Premium"
              ? { name: "Premium", limit: 100 }
              : t === "Pro"
              ? { name: "Pro", limit: 50 }
              : { name: "beta", limit: 25 };
          setTier(resolved);
        }
      } catch (_) {
        // ignore; we’ll keep defaults
      }

      // --- figure out how many requests this user has made this calendar month
      try {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        // Count parent rows for this user in current month
        const { count } = await supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString());

        setUsedThisMonth(count ?? 0);
      } catch (_) {
        // keep 0 if count fails; submission will still work
      }
    })();
  }, [router]);

  const remaining = useMemo(
    () => Math.max(0, (tier?.limit ?? 25) - (usedThisMonth ?? 0)),
    [tier, usedThisMonth]
  );

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

    if (remaining <= 0) {
      return setStatus(
        `You’ve reached your ${tier.limit} request limit for ${tier.name}. Upgrade to increase your allowance.`
      );
    }

    if (!supabase) return setStatus("Supabase client unavailable. Please log in again.");

    setSubmitting(true);
    setStatus("Submitting…");

    try {
      // 1) create parent request (include user_id for quotas)
      const { data: reqRow, error: reqErr } = await supabase
        .from("requests")
        .insert({ user_id: userId, email, notes })
        .select("id")
        .single();
      if (reqErr) throw reqErr;
      const requestId = reqRow.id as string;

      // 2) create child items
      const items = propsList
        .map((p) => ({
          request_id: requestId,
          property_address: p.address || null,
          city: p.city || null,
          state: p.state || null,
          property_url: p.url || null,
        }))
        // store rows only when at least one field present
        .filter((row) => row.property_address || row.city || row.state || row.property_url);

      if (items.length) {
        const { error: itemsErr } = await supabase.from("request_items").insert(items);
        if (itemsErr) throw itemsErr;
      }

      // 3) fire GHL webhook through your API route (non-blocking)
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
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err: any) {
      console.error("Submit error:", err);
      setStatus("Error: " + (err?.message ?? String(err)));
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
          <p className="text-sm" style={{ color: "#9aa5b1", marginTop: 6 }}>
            Plan: <b>{tier.name}</b> • Used this month: <b>{usedThisMonth}</b> • Remaining:{" "}
            <b>{remaining}</b>
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
