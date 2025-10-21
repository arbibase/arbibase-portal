"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ChevronDown, Search } from "lucide-react";

type Tier = "beta" | "pro" | "premium";
type TabKey = "quick" | "advanced";

type QuickForm = { q: string; min?: string; max?: string };
type AdvancedForm = QuickForm & {
  approval?: "STR" | "MTR" | "Either";
  beds?: "Studio" | "1+" | "2+" | "3+" | "4+";
  baths?: "1+" | "2+" | "3+";
};

export default function SearchBar() {
  const params = useSearchParams();
  const router = useRouter();

  const [tier, setTier] = useState<Tier>("beta");
  const forcePro = params?.get("pro") === "1";
  const proPlus = forcePro || tier === "pro" || tier === "premium";

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;
        const { data: prof } = await supabase.from("profiles").select("tier").eq("id", uid).maybeSingle();
        if (prof?.tier === "pro" || prof?.tier === "premium") setTier(prof.tier);
      } catch {
        // keep "beta"; pro can still be forced with ?pro=1
      }
    })();
  }, []);

  const [tab, setTab] = useState<TabKey>("quick");
  useEffect(() => {
    if (!proPlus && tab === "advanced") setTab("quick");
  }, [proPlus, tab]);

  const [quick, setQuick] = useState<QuickForm>({
    q: params?.get("q") ?? "",
    min: params?.get("min") ?? "",
    max: params?.get("max") ?? "",
  });
  const [adv, setAdv] = useState<AdvancedForm>({
    q: params?.get("q") ?? "",
    min: params?.get("min") ?? "",
    max: params?.get("max") ?? "",
    approval: (params?.get("approval") as AdvancedForm["approval"]) || undefined,
    beds: (params?.get("beds") as AdvancedForm["beds"]) || undefined,
    baths: (params?.get("baths") as AdvancedForm["baths"]) || undefined,
  });

  function toParams(data: Record<string, any>) {
    const u = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const val = String(v).trim();
      if (val !== "") u.set(k, val);
    });
    return u.toString();
  }

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

  return (
    <div className="rounded-[18px] border border-[#1e2733] bg-[rgba(14,20,28,.92)] p-3">
      {/* Tabs */}
      <div className="mb-2 grid grid-cols-2 gap-2" role="tablist">
        <button
          type="button"
          aria-selected={tab === "quick"}
          onClick={() => setTab("quick")}
          className={`rounded-[12px] px-3 py-2 text-left text-sm font-semibold ${
            tab === "quick"
              ? "bg-[linear-gradient(135deg,#19c1ff,#19f2b8)] text-[#041018]"
              : "bg-[#0f141c] text-[#ddecff] border border-[#1e2733]"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" /> Quick Search
          </span>
        </button>

        <button
          type="button"
          aria-selected={tab === "advanced"}
          onClick={() => setTab(proPlus ? "advanced" : "quick")}
          className={`rounded-[12px] px-3 py-2 text-left text-sm font-semibold ${
            tab === "advanced"
              ? "bg-[linear-gradient(135deg,#19c1ff,#19f2b8)] text-[#041018]"
              : "bg-[#0f141c] text-[#ddecff] border border-[#1e2733]"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            🧭 Advanced Filters {!proPlus && <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[#203142] bg-[#0f1824] px-2 py-0.5 text-xs font-extrabold text-[#bdeaff]"><Lock className="h-3 w-3" />Pro</span>}
          </span>
        </button>
      </div>

      {/* QUICK */}
      {tab === "quick" && (
        <form onSubmit={submitQuick} className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
          <input
            className="rounded-[10px] border border-[#253141] bg-[#0c121a] px-3 py-2 text-sm text-white"
            placeholder="Address, city, state, or ZIP…"
            value={quick.q}
            onChange={(e) => setQuick((f) => ({ ...f, q: e.target.value }))}
          />
          <input
            className="w-[140px] rounded-[10px] border border-[#253141] bg-[#0c121a] px-3 py-2 text-sm text-white"
            inputMode="numeric"
            placeholder="Min Rent"
            value={quick.min}
            onChange={(e) => setQuick((f) => ({ ...f, min: e.target.value }))}
          />
          <input
            className="w-[140px] rounded-[10px] border border-[#253141] bg-[#0c121a] px-3 py-2 text-sm text-white"
            inputMode="numeric"
            placeholder="Max Rent"
            value={quick.max}
            onChange={(e) => setQuick((f) => ({ ...f, max: e.target.value }))}
          />
          <button className="btn primary" type="submit">Search Properties →</button>
        </form>
      )}

      {/* ADVANCED */}
      {tab === "advanced" && (
        <form onSubmit={submitAdvanced} className="mt-1 grid grid-cols-3 gap-2">
          <Input
            placeholder="Address, city, state, or ZIP…"
            value={adv.q}
            onChange={(v) => setAdv((f) => ({ ...f, q: v }))}
            disabled={!proPlus}
          />
          <Input
            placeholder="Min Rent"
            value={adv.min ?? ""}
            onChange={(v) => setAdv((f) => ({ ...f, min: v }))}
            disabled={!proPlus}
          />
          <Input
            placeholder="Max Rent"
            value={adv.max ?? ""}
            onChange={(v) => setAdv((f) => ({ ...f, max: v }))}
            disabled={!proPlus}
          />
          <Select
            label="Approval"
            value={adv.approval}
            onChange={(v) => setAdv((f) => ({ ...f, approval: v as any }))}
            options={["STR", "MTR", "Either"]}
            disabled={!proPlus}
          />
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
          <div className="col-span-3 mt-1 flex justify-end">
            <button className="btn primary" type="submit" disabled={!proPlus}>Apply Filters →</button>
          </div>
        </form>
      )}

      <p className="mt-2 text-center text-xs opacity-80">Advanced filters are available on Pro and higher.</p>

      {/* Quick city chips */}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {["Miami, FL", "Austin, TX", "Nashville, TN", "Denver, CO"].map((c) => (
          <button
            key={c}
            className="inline-flex items-center rounded-full border border-[#203142] bg-[#0f1824] px-3 py-1 text-xs font-semibold text-[#bdeaff]"
            onClick={() => {
              setQuick((f) => ({ ...f, q: c }));
              setAdv((f) => ({ ...f, q: c }));
            }}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <input
      className="rounded-[10px] border border-[#253141] bg-[#0c121a] px-3 py-2 text-sm text-white disabled:opacity-60"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function Select({
  label,
  value,
  options,
  onChange,
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
        className="peer w-full appearance-none rounded-[10px] border border-[#253141] bg-[#0c121a] px-3 py-2 pr-8 text-sm text-white disabled:opacity-60"
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
