"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ChevronDown, Search } from "lucide-react";

/** tiers */
type Tier = "beta" | "pro" | "premium";
type TabKey = "quick" | "advanced";

type QuickForm = { q: string; min?: string; max?: string };
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

/* ---------- Tier (gate Advanced) ---------- */
const [tier, setTier] = useState<Tier>("beta");
  const proPlus =
    tier === "pro" ||
    tier === "premium" ||
    (process.env.NEXT_PUBLIC_TIER_OVERRIDE as Tier | undefined) === "pro" ||
    (process.env.NEXT_PUBLIC_TIER_OVERRIDE as Tier | undefined) === "premium";

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const auth = supabase.auth;
        if (!auth) return;
        const { data } = await auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", uid)
          .maybeSingle();
        const t = (prof?.tier as Tier) || "beta";
        setTier(t);
      } catch {
        // keep default
      }
    })();
  }, []);

  /* ---------- Tabs ---------- */
  const [tab, setTab] = useState<TabKey>("quick");
  useEffect(() => {
    if (!proPlus && tab === "advanced") setTab("quick");
  }, [proPlus, tab]);

  /* ---------- Form state (prefill from URL) ---------- */
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

  const label = useMemo(
    () => (tab === "quick" ? "Search Properties →" : "Apply Filters →"),
    [tab]
  );

  /* ---------- helpers ---------- */
  const toParams = (data: Record<string, any>) => {
    const u = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const val = String(v).trim();
      if (val !== "") u.set(k, val);
    });
    return u.toString();
  };

  const submitQuick = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/properties?${toParams({ q: quick.q, min: quick.min, max: quick.max, scope: "quick" })}`);
  };

  const submitAdvanced = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proPlus) return router.push("/pricing");
    router.push(`/properties?${toParams({ ...adv, scope: "advanced" })}`);
  };

  const setCityChip = (label: string) => {
    setQuick((f) => ({ ...f, q: label }));
    setAdv((f) => ({ ...f, q: label }));
  };

  /* ---------- UI ---------- */
  return (
    <div className="rounded-[18px] border border-[#1e2733] bg-[rgba(14,20,28,.92)] p-4 shadow-[0_10px_26px_rgba(0,0,0,.4)]">
      {/* Tabs */}
      <div className="mb-3 grid grid-cols-2 gap-3" role="tablist" aria-label="Search Mode">
        <TabButton active={tab === "quick"} onClick={() => setTab("quick")} icon={<span>🔎</span>} label="Quick Search" />
        <TabButton
          active={tab === "advanced"}
          onClick={() => setTab(proPlus ? "advanced" : "quick")}
          icon={<span>🧭</span>}
          label={
            <>
              Advanced Filters {!proPlus && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#203142] bg-[#0f1824] px-2 py-0.5 text-xs font-extrabold text-[#bdeaff]">
                  <Lock className="h-3 w-3" /> Pro
                </span>
              )}
            </>
          }
        />
      </div>

      {/* QUICK (compact) */}
      {tab === "quick" && (
        <form onSubmit={submitQuick} className="grid grid-cols-[1.2fr_.6fr_auto] gap-3 md:grid-cols-[1fr_.5fr_.5fr_auto]">
          <Input
            icon={<Search className="h-4 w-4 opacity-70" />}
            placeholder="Address, city, state, or ZIP…"
            value={quick.q}
            onChange={(v) => setQuick((f) => ({ ...f, q: v }))}
          />
          <Input placeholder="Min Rent" value={quick.min ?? ""} onChange={(v) => setQuick((f) => ({ ...f, min: v }))} />
          <Input placeholder="Max Rent" value={quick.max ?? ""} onChange={(v) => setQuick((f) => ({ ...f, max: v }))} />
          <button className="btn primary whitespace-nowrap">{label}</button>
        </form>
      )}

      {/* ADVANCED (accordion style, space-aware) */}
      {tab === "advanced" && (
        <form onSubmit={submitAdvanced} className="grid gap-3">
          <div className="grid grid-cols-[1.2fr_.6fr_.6fr] gap-3 md:grid-cols-3">
            <Input
              icon={<Search className="h-4 w-4 opacity-70" />}
              placeholder="Address, city, state, or ZIP…"
              value={adv.q}
              onChange={(v) => setAdv((f) => ({ ...f, q: v }))}
              disabled={!proPlus}
            />
            <Select label="Property Type" value={adv.type} onChange={(v) => setAdv((f) => ({ ...f, type: v as any }))} options={["Apartment", "House", "Townhome", "Condo", "Duplex"]} disabled={!proPlus} />
            <Select label="Approval Type" value={adv.approval} onChange={(v) => setAdv((f) => ({ ...f, approval: v as any }))} options={["STR", "MTR", "Either"]} disabled={!proPlus} />
          </div>

          <div className="grid grid-cols-[.6fr_.6fr_.6fr] gap-3 md:grid-cols-3">
            <Input placeholder="Min Rent" value={adv.min ?? ""} onChange={(v) => setAdv((f) => ({ ...f, min: v }))} disabled={!proPlus} />
            <Input placeholder="Max Rent" value={adv.max ?? ""} onChange={(v) => setAdv((f) => ({ ...f, max: v }))} disabled={!proPlus} />
            <Select label="Lease Term" value={adv.lease} onChange={(v) => setAdv((f) => ({ ...f, lease: v as any }))} options={["12", "24", "36"]} disabled={!proPlus} />
          </div>

          <div className="grid grid-cols-[.6fr_.6fr_.6fr] gap-3 md:grid-cols-3">
            <Select label="Beds" value={adv.beds} onChange={(v) => setAdv((f) => ({ ...f, beds: v as any }))} options={["Studio", "1+", "2+", "3+", "4+"]} disabled={!proPlus} />
            <Select label="Baths" value={adv.baths} onChange={(v) => setAdv((f) => ({ ...f, baths: v as any }))} options={["1+", "2+", "3+"]} disabled={!proPlus} />
            <Select label="Furnishing" value={adv.furnished} onChange={(v) => setAdv((f) => ({ ...f, furnished: v as any }))} options={["Furnished", "Unfurnished"]} disabled={!proPlus} />
          </div>

          <div className="grid grid-cols-[.6fr_.6fr_.6fr] gap-3 md:grid-cols-3">
            <Select label="Parking" value={adv.parking} onChange={(v) => setAdv((f) => ({ ...f, parking: v as any }))} options={["On-site", "Street", "Garage", "None"]} disabled={!proPlus} />
            <Select label="Utilities" value={adv.utilities} onChange={(v) => setAdv((f) => ({ ...f, utilities: v as any }))} options={["Included", "Not Included"]} disabled={!proPlus} />
            <Select label="HOA / Building Rules" value={adv.hoa} onChange={(v) => setAdv((f) => ({ ...f, hoa: v as any }))} options={["Allows STR", "Allows MTR", "Restrictions present"]} disabled={!proPlus} />
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <button className="btn primary" disabled={!proPlus}>{label}</button>
            {!proPlus && (
              <button type="button" onClick={() => router.push("/pricing")} className="btn" title="Unlock with Pro">
                Unlock Advanced Filters — Go Pro
              </button>
            )}
          </div>
        </form>
      )}

      {/* helper text + city chips */}
      <p className="mt-3 text-center text-sm opacity-80">Advanced filters are available on Pro and higher.</p>
      <div className="mt-3 grid place-items-center">
        <div className="flex flex-wrap justify-center gap-2">
          {["Miami, FL", "Austin, TX", "Nashville, TN", "Denver, CO"].map((c) => (
            <Chip key={c} label={c} onClick={setCityChip} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- small bits ---------- */
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: React.ReactNode; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[14px] border px-4 py-3 text-left font-extrabold transition ${
        active
          ? "border-[#0a6a85] bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] text-[#041018] shadow-[0_10px_26px_rgba(0,225,255,.22)]"
          : "border-[#1e2733] bg-[#0f141c] text-[#ddecff]"
      }`}
    >
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
    </button>
  );
}

function Input({
  icon,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="relative block">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
      <input
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-2.5 text-white placeholder:opacity-60 ${icon ? "pl-9" : ""}`}
        placeholder={placeholder}
      />
    </label>
  );
}

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
    <label className="relative block">
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full appearance-none rounded-[12px] border border-[#253141] bg-[#0c121a] px-3 py-2.5 pr-8 text-white placeholder:opacity-60 disabled:opacity-60"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
    </label>
  );
}

function Chip({ label, onClick }: { label: string; onClick: (label: string) => void }) {
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
