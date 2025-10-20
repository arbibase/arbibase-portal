"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ChevronDown } from "lucide-react";

type Tier = "beta" | "pro" | "premium";
type TabKey = "quick" | "advanced";

type QuickForm = {
  q: string;
  min?: string;
  max?: string;
};

type AdvancedForm = QuickForm & {
  type?: "Apartment" | "House" | "Townhome" | "Condo" | "Duplex";
  approval?: "STR" | "MTR" | "Either";
  lease?: "12" | "24" | "36";
  beds?: "Studio" | "1+" | "2+" | "3+" | "4+";
  baths?: "1+" | "2+" | "3+";
  furnished?: "Furnished" | "Unfurnished";
  parking?: "On-site" | "Street" | "Garage" | "None";
  utilities?: "Included" | "Not Included";
  hoa?: "Allows STR" | "Allows MTR" | "Restrictions present";
};

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();

  /* ---------------- Tier (gate Advanced) ---------------- */
  const [tier, setTier] = useState<Tier>("beta");
  const proPlus = tier === "pro" || tier === "premium";

  useEffect(() => {
    (async () => {
      try {
        // URL test override: ?forceTier=premium | pro | beta
        const forced = (params?.get("forceTier") || "").toLowerCase();
        if (forced === "pro" || forced === "premium" || forced === "beta") {
          setTier(forced as Tier);
          return;
        }

        if (!supabase) return;

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;

        // fallback to user metadata if profiles row missing / not joined yet
        const metaTier = (auth?.user?.user_metadata as any)?.tier;

        let t = "beta";
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("tier")
            .eq("id", uid)
            .maybeSingle();

          const raw = (prof?.tier ?? metaTier ?? "").toString().trim().toLowerCase();
          if (raw === "pro" || raw === "premium" || raw === "beta") t = raw;
        } else if (metaTier) {
          const raw = metaTier.toString().trim().toLowerCase();
          if (raw === "pro" || raw === "premium" || raw === "beta") t = raw;
        }

        setTier(t as Tier);
      } catch {
        setTier("beta");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Tabs ---------------- */
  const [tab, setTab] = useState<TabKey>("quick");
  useEffect(() => {
    if (!proPlus && tab === "advanced") setTab("quick");
  }, [proPlus, tab]);

  /* ---------------- Forms ---------------- */
  const [quick, setQuick] = useState<QuickForm>({
    q: params?.get("q") ?? "",
    min: params?.get("min") ?? "",
    max: params?.get("max") ?? "",
  });

  const [adv, setAdv] = useState<AdvancedForm>({
    q: params?.get("q") ?? "",
    min: params?.get("min") ?? "",
    max: params?.get("max") ?? "",
    type: (params?.get("type") as AdvancedForm["type"]) || undefined,
    approval: (params?.get("approval") as AdvancedForm["approval"]) || undefined,
    lease: (params?.get("lease") as AdvancedForm["lease"]) || undefined,
    beds: (params?.get("beds") as AdvancedForm["beds"]) || undefined,
    baths: (params?.get("baths") as AdvancedForm["baths"]) || undefined,
    furnished: (params?.get("furnished") as AdvancedForm["furnished"]) || undefined,
    parking: (params?.get("parking") as AdvancedForm["parking"]) || undefined,
    utilities: (params?.get("utilities") as AdvancedForm["utilities"]) || undefined,
    hoa: (params?.get("hoa") as AdvancedForm["hoa"]) || undefined,
  });

  const searchBtnLabel = useMemo(
    () => (tab === "quick" ? "Search Properties →" : "Apply Filters →"),
    [tab]
  );

  /* ---------------- Helpers ---------------- */
  function toParams(data: Record<string, any>) {
    const u = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const val = String(v).trim();
      if (val !== "") u.set(k, val);
    });
    return u.toString();
  }

  /* ---------------- Submit ---------------- */
  function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    const q = toParams({ q: quick.q, min: quick.min, max: quick.max, scope: "quick" });
    router.push(`/properties?${q}`);
  }

  function submitAdvanced(e: React.FormEvent) {
    e.preventDefault();
    if (!proPlus) return router.push("/pricing");
    const q = toParams({ ...adv, scope: "advanced" });
    router.push(`/properties?${q}`);
  }

  function setCityChip(label: string) {
    setQuick((f) => ({ ...f, q: label }));
    setAdv((f) => ({ ...f, q: label }));
  }

  /* ---------------- UI ---------------- */
  return (
    <div
      className="
        reveal glow rounded-[18px] border border-[#1e2733]
        bg-[rgba(14,20,28,.92)] p-4 shadow-[0_10px_26px_rgba(0,0,0,.40)]
      "
    >
      {/* Tabs */}
      <div className="mb-3 flex items-center gap-2" role="tablist" aria-label="Search Mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "quick"}
          onClick={() => setTab("quick")}
          className={`
            flex-1 min-w-[180px] rounded-[14px] border px-4 py-3 font-extrabold transition
            ${tab === "quick"
              ? "border-[#0a6a85] text-[#041018] shadow-[0_10px_26px_rgba(0,225,255,.22)]"
              : "border-[#1e2733] bg-[#0f141c] text-[#ddecff] hover:-translate-y-[1px]"
            }
          `}
          style={
            tab === "quick"
              ? { background: "linear-gradient(135deg,var(--brand-primary),var(--brand-accent))" }
              : undefined
          }
        >
          🔎 Quick Search
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === "advanced"}
          onClick={() => setTab(proPlus ? "advanced" : "quick")}
          className={`
            relative flex-1 min-w-[180px] rounded-[14px] border px-4 py-3 font-extrabold transition
            ${tab === "advanced"
              ? "border-[#0a6a85] text-[#041018] shadow-[0_10px_26px_rgba(0,225,255,.22)]"
              : "border-[#1e2733] bg-[#0f141c] text-[#ddecff] hover:-translate-y-[1px]"
            }
          `}
          style={
            tab === "advanced"
              ? { background: "linear-gradient(135deg,var(--brand-primary),var(--brand-accent))" }
              : undefined
          }
        >
          🧭 Advanced Filters
          {!proPlus && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#203142] bg-[#0f1824] px-2 py-0.5 text-xs font-extrabold text-[#bdeaff]">
              <Lock className="h-3 w-3" /> Pro
            </span>
          )}
        </button>
      </div>

      {/* QUICK */}
      {tab === "quick" && (
        <form onSubmit={submitQuick} className="grid gap-3 md:grid-cols-3">
          <input
            className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
            placeholder="Address, city, state, or ZIP…"
            value={quick.q}
            onChange={(e) => setQuick((f) => ({ ...f, q: e.target.value }))}
            aria-label="Location"
          />
          <input
            className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
            inputMode="numeric"
            placeholder="Min Rent"
            value={quick.min}
            onChange={(e) => setQuick((f) => ({ ...f, min: e.target.value }))}
            aria-label="Min rent"
          />
          <div className="flex gap-2">
            <input
              className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
              inputMode="numeric"
              placeholder="Max Rent"
              value={quick.max}
              onChange={(e) => setQuick((f) => ({ ...f, max: e.target.value }))}
              aria-label="Max rent"
            />
            <button className="btn primary ml-auto" type="submit">
              {searchBtnLabel}
            </button>
          </div>
        </form>
      )}

      {/* ADVANCED (gated) */}
      {tab === "advanced" && (
        <form onSubmit={submitAdvanced} className="grid gap-3 md:grid-cols-3">
          {/* row 1 */}
          <input
            className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
            placeholder="Address, city, state, or ZIP…"
            value={adv.q}
            onChange={(e) => setAdv((f) => ({ ...f, q: e.target.value }))}
            aria-label="Location"
            disabled={!proPlus}
          />
          <Select
            label="Property Type"
            value={adv.type}
            onChange={(v) => setAdv((f) => ({ ...f, type: v as any }))}
            options={["Apartment", "House", "Townhome", "Condo", "Duplex"]}
            disabled={!proPlus}
          />
          <Select
            label="Approval Type"
            value={adv.approval}
            onChange={(v) => setAdv((f) => ({ ...f, approval: v as any }))}
            options={["STR", "MTR", "Either"]}
            disabled={!proPlus}
          />

          {/* row 2 */}
          <input
            className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
            inputMode="numeric"
            placeholder="Min Rent"
            value={adv.min}
            onChange={(e) => setAdv((f) => ({ ...f, min: e.target.value }))}
            aria-label="Min rent"
            disabled={!proPlus}
          />
          <input
            className="w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 text-white"
            inputMode="numeric"
            placeholder="Max Rent"
            value={adv.max}
            onChange={(e) => setAdv((f) => ({ ...f, max: e.target.value }))}
            aria-label="Max rent"
            disabled={!proPlus}
          />
          <Select
            label="Lease Term"
            value={adv.lease}
            onChange={(v) => setAdv((f) => ({ ...f, lease: v as any }))}
            options={["12", "24", "36"]}
            disabled={!proPlus}
          />

          {/* row 3 */}
          <Select
            label="Beds"
            value={adv.beds}
            onChange={(v) => setAdv((f) => ({ ...f, beds: v as any }))}
            options={["Studio", "1+", "2+", "3+", "4+"]}
            disabled={!proPlus}
          />
          <Select
            label="Baths"
            value={adv.baths}
            onChange={(v) => setAdv((f) => ({ ...f, baths: v as any }))}
            options={["1+", "2+", "3+"]}
            disabled={!proPlus}
          />
          <Select
            label="Furnishing"
            value={adv.furnished}
            onChange={(v) => setAdv((f) => ({ ...f, furnished: v as any }))}
            options={["Furnished", "Unfurnished"]}
            disabled={!proPlus}
          />

          {/* row 4 */}
          <Select
            label="Parking"
            value={adv.parking}
            onChange={(v) => setAdv((f) => ({ ...f, parking: v as any }))}
            options={["On-site", "Street", "Garage", "None"]}
            disabled={!proPlus}
          />
          <Select
            label="Utilities"
            value={adv.utilities}
            onChange={(v) => setAdv((f) => ({ ...f, utilities: v as any }))}
            options={["Included", "Not Included"]}
            disabled={!proPlus}
          />
          <Select
            label="HOA / Building Rules"
            value={adv.hoa}
            onChange={(v) => setAdv((f) => ({ ...f, hoa: v as any }))}
            options={["Allows STR", "Allows MTR", "Restrictions present"]}
            disabled={!proPlus}
          />

          <div className="col-span-3 mt-1 flex flex-wrap items-center justify-center gap-3">
            <button className="btn primary" type="submit" disabled={!proPlus}>
              {searchBtnLabel}
            </button>
            {!proPlus && (
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="btn"
                title="Unlock with Pro"
              >
                Unlock Advanced Filters — Go Pro
              </button>
            )}
          </div>
        </form>
      )}

      {/* helper text */}
      <p className="mt-2 text-center text-sm opacity-80">
        Advanced filters are available on Pro and higher.
      </p>

      {/* City chips */}
      <div className="mt-3 grid place-items-center">
        <div className="flex flex-wrap justify-center gap-2">
          {["Miami, FL", "Austin, TX", "Nashville, TN", "Denver, CO"].map((c) => (
            <Chip key={c} label={c} onClick={(label) => setCityChip(label)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small internal Select ---------- */
function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="relative">
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full appearance-none rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-3 pr-8 text-white disabled:opacity-60"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
    </label>
  );
}

/* ---------- City Chip ---------- */
function Chip({
  label,
  onClick,
}: {
  label: string;
  onClick: (label: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className="inline-flex items-center gap-2 rounded-full border border-[#203142] bg-[#0f1824] px-3 py-1 text-sm font-extrabold text-[#bdeaff] hover:opacity-90"
    >
      {label}
    </button>
  );
}
