"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ChevronDown, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Professional search bar with Quick + Advanced (gated) modes.
 * - Reads `profiles.tier` (beta | pro | premium) to gate Advanced controls.
 * - Writes filters to URL (/properties?...) so the list/map page can read them.
 */

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
  /* --------- Tier (gate Advanced) --------- */
  const [tier, setTier] = useState<Tier>("beta");
  const proPlus = tier === "pro" || tier === "premium";

  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          // If supabase isn't available, default to beta tier
          setTier("beta");
          return;
        }

        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;

        const { data: prof } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", uid)
          .maybeSingle();

        setTier((prof?.tier as Tier) || "beta");
      } catch {
        setTier("beta");
      }
    })();
  }, []);

  /* --------- Tabs --------- */
  const [tab, setTab] = useState<TabKey>("quick");
  useEffect(() => {
    if (!proPlus && tab === "advanced") setTab("quick");
  }, [proPlus, tab]);

  /* --------- Forms --------- */
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

  /* --------- Helpers --------- */
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

  function setCityChip(label: string) {
    setQuick((f) => ({ ...f, q: label }));
    setAdv((f) => ({ ...f, q: label }));
  }

  /* --------- UI --------- */
  return (
    <div className="ab-search">
      {/* Tabs */}
      <div className="ab-tabs" role="tablist" aria-label="Search Mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "quick"}
          onClick={() => setTab("quick")}
          className={`ab-tab ${tab === "quick" ? "active" : ""}`}
        >
          <span className="emoji">🔎</span> Quick Search
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === "advanced"}
          onClick={() => setTab(proPlus ? "advanced" : "quick")}
          className={`ab-tab ${tab === "advanced" ? "active" : ""}`}
        >
          <span className="emoji">🧭</span> Advanced Filters
          {!proPlus && (
            <span className="pill pro"><Lock className="h-3 w-3" /> Pro</span>
          )}
        </button>
      </div>

      {/* QUICK */}
      {tab === "quick" && (
        <form onSubmit={submitQuick} className="ab-grid">
          <div className="ab-input with-icon">
            <Search className="icon" />
            <input
              placeholder="Address, city, state, or ZIP…"
              value={quick.q}
              onChange={(e) => setQuick((f) => ({ ...f, q: e.target.value }))}
              aria-label="Location"
            />
          </div>
          <input
            className="ab-input"
            inputMode="numeric"
            placeholder="Min Rent"
            value={quick.min}
            onChange={(e) => setQuick((f) => ({ ...f, min: e.target.value }))}
            aria-label="Min rent"
          />
          <div className="ab-row">
            <input
              className="ab-input"
              inputMode="numeric"
              placeholder="Max Rent"
              value={quick.max}
              onChange={(e) => setQuick((f) => ({ ...f, max: e.target.value }))}
              aria-label="Max rent"
            />
            <button className="btn primary">{searchBtnLabel}</button>
          </div>
        </form>
      )}

      {/* ADVANCED (gated) */}
      {tab === "advanced" && (
        <form onSubmit={submitAdvanced} className="ab-grid ab-grid-adv">
          {/* row 1 */}
          <div className="ab-input with-icon ab-col-span-2">
            <Search className="icon" />
            <input
              placeholder="Address, city, state, or ZIP…"
              value={adv.q}
              onChange={(e) => setAdv((f) => ({ ...f, q: e.target.value }))}
              aria-label="Location"
              disabled={!proPlus}
            />
          </div>
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
            className="ab-input"
            inputMode="numeric"
            placeholder="Min Rent"
            value={adv.min}
            onChange={(e) => setAdv((f) => ({ ...f, min: e.target.value }))}
            aria-label="Min rent"
            disabled={!proPlus}
          />
          <input
            className="ab-input"
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

          <div className="ab-actions">
            <button className="btn primary" disabled={!proPlus}>
              {searchBtnLabel}
            </button>
            {!proPlus && (
              <button type="button" className="btn" onClick={() => router.push("/pricing")}>
                Unlock Advanced Filters — Go Pro
              </button>
            )}
          </div>
        </form>
      )}

      {/* helper text */}
      <p className="ab-help">Advanced filters are available on Pro and higher.</p>

      {/* City quick chips */}
      <div className="ab-chips">
        {["Miami, FL", "Austin, TX", "Nashville, TN", "Denver, CO"].map((c) => (
          <button key={c} type="button" onClick={() => setCityChip(c)} className="chip">
            {c}
          </button>
        ))}
      </div>

      {/* Local styles (dark glass + pill tabs) */}
      <style jsx>{`
        .ab-search{
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--surfaceA);
          box-shadow:var(--shadow-1);
          padding:16px;
        }
        .ab-tabs{display:flex;gap:10px;margin-bottom:12px}
        .ab-tab{
          flex:1;min-width:180px;cursor:pointer;
          border:1px solid var(--line);border-radius:14px;
          background:#0f141c;color:#ddecff;font-weight:800;
          padding:12px 14px;display:flex;align-items:center;justify-content:center;gap:8px;
          transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }
        .ab-tab.active{
          border-color:#0a6a85;
          background:linear-gradient(135deg,var(--brand),var(--brand-2));
          color:#041018; box-shadow:0 10px 26px rgba(0,225,255,.22);
        }
        .emoji{filter:saturate(110%)}
        .pill.pro{
          margin-left:8px;display:inline-flex;align-items:center;gap:6px;
          border:1px solid #203142;background:#0f1824;color:#bdeaff;
          padding:3px 8px;border-radius:999px;font-size:.78rem;font-weight:800;
        }

        .ab-grid{display:grid;gap:12px}
        @media(min-width:900px){.ab-grid{grid-template-columns:2fr 1fr 1fr}}
        .ab-grid-adv{grid-template-columns:repeat(3,1fr)}
        .ab-col-span-2{grid-column:span 2 / span 2}
        .ab-row{display:flex;gap:12px;align-items:center}

        .ab-input{width:100%;border:1px solid #253141;background:#0c121a;color:#fff;border-radius:12px;padding:12px 12px}
        .ab-input input{all:unset;color:#fff;font:inherit;width:100%}
        .ab-input.with-icon{position:relative;padding-left:36px}
        .ab-input.with-icon .icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;opacity:.75}

        .ab-select{position:relative}
        .ab-select select{
          width:100%;appearance:none;border:1px solid #253141;background:#0c121a;color:#fff;
          border-radius:12px;padding:12px 34px 12px 12px
        }
        .ab-select .chev{position:absolute;right:10px;top:50%;transform:translateY(-50%);opacity:.75}

        .ab-actions{
          grid-column:1/-1;display:flex;justify-content:center;gap:12px;margin-top:4px
        }

        .ab-help{text-align:center;margin-top:8px;font-size:.92rem;opacity:.85}
        .ab-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:12px}
        .chip{
          display:inline-flex;align-items:center;gap:6px;background:#0f1824;border:1px solid #203346;
          color:#bdeaff;padding:6px 10px;border-radius:999px;font-size:.86rem;font-weight:800
        }
      `}</style>
    </div>
  );
}

/* ---------- Polished internal Select ---------- */
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
    <label className="ab-select">
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="chev" size={16} />
    </label>
  );
}
