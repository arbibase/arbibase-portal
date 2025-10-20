"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";

/** ----------------------------------------------------------------
 * DEMO seed until API is wired.
 * When you connect Supabase, replace DEMO + client-side filter with a server query using `s`.
 * --------------------------------------------------------------- */
const DEMO: Property[] = [
  { id: "1", city: "Miami",     state: "FL", rent: 3800, beds: 2, baths: 2, approval: "STR" },
  { id: "2", city: "Austin",    state: "TX", rent: 2200, beds: 1, baths: 1, approval: "Either" },
  { id: "3", city: "Nashville", state: "TN", rent: 1900, beds: 3, baths: 2, approval: "MTR" },
];

/** Public page wrapper with Suspense so useSearchParams() is safe */
export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="container p-4 fine">Loading properties…</div>}>
      <PropertiesView />
    </Suspense>
  );
}

/** Helper to parse “1+ / 2+ / 3+ / 4+” into a minimum number */
function parsePlus(val?: string | null): number | undefined {
  if (!val) return undefined;
  if (val === "Studio") return 0;
  if (/^\d\+$/.test(val)) return Number(val.replace("+", ""));
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/** Inner view: reads URL params and filters results */
function PropertiesView() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"gallery" | "map">("gallery");

  // ----- Parse URL params coming from SearchBar (Quick + Advanced) -----
  const s = useMemo(() => {
    const get = (key: string) => (params?.get(key) || "").trim();

    // Quick
    const q = get("q");
    const min = Number(get("min"));
    const max = Number(get("max"));

    // Advanced (Pro+)
    const approval = get("approval") || undefined;        // "STR" | "MTR" | "Either"
    const type = get("type") || undefined;                // "Apartment" | "House" | ...
    const lease = get("lease") || undefined;              // "12" | "24" | "36"
    const bedsStr = get("beds") || undefined;             // "Studio" | "1+" | "2+" | "3+" | "4+"
    const bathsStr = get("baths") || undefined;           // "1+" | "2+" | "3+"
    const furnishing = get("furnishing") || undefined;    // "Furnished" | "Unfurnished"
    const parking = get("parking") || undefined;          // "On-site" | "Street" | "Garage" | "None"
    const utilities = get("utilities") || undefined;      // "Included" | "Not Included"
    const hoa = get("hoa") || undefined;                  // "Allows STR" | "Allows MTR" | "Restrictions present"

    // Convert to numeric mins where appropriate
    const bedsMin = parsePlus(bedsStr);
    const bathsMin = parsePlus(bathsStr);

    return {
      // Quick
      q,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,

      // Advanced
      approval,
      type,
      lease,
      bedsStr,
      bathsStr,
      bedsMin,
      bathsMin,
      furnishing,
      parking,
      utilities,
      hoa,
    };
  }, [params]);

  // ----- Client-side filter over DEMO data (replace with Supabase later) -----
  const list = useMemo(() => {
    return DEMO.filter((p) => {
      // text match on "City State" (basic — expand to address or zip with live data)
      const q = s.q?.toLowerCase();
      if (q && !`${p.city} ${p.state}`.toLowerCase().includes(q)) return false;

      // approval
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) return false;

      // rent range
      if (s.min !== undefined && p.rent < s.min) return false;
      if (s.max !== undefined && p.rent > s.max) return false;

      // beds / baths minimums (DEMO has numeric beds/baths)
      if (s.bedsMin !== undefined && p.beds < s.bedsMin) return false;
      if (s.bathsMin !== undefined && p.baths < s.bathsMin) return false;

      // type / furnishing / parking / utilities / hoa:
      // not applied to DEMO since DEMO lacks these fields.
      // Keep these checks commented until your data model includes them.
      // if (s.type && p.type !== s.type) return false;
      // if (s.furnishing && p.furnishing !== s.furnishing) return false;
      // if (s.parking && p.parking !== s.parking) return false;
      // if (s.utilities && p.utilities !== s.utilities) return false;
      // if (s.hoa && p.hoa !== s.hoa) return false;

      return true;
    });
  }, [s]);

  // TODO (live data):
  // const { data } = await supabase
  //   .from("properties")
  //   .select("*")
  //   .ilike("city", `%${s.q ?? ""}%`)
  //   .gte("rent", s.min ?? 0)
  //   .lte("rent", s.max ?? 999999)
  //   .or(s.approval && s.approval !== "Either" ? `approval.eq.${s.approval}` : undefined)
  //   // optional:
  //   // .eq("type", s.type ?? undefined)
  //   // .gte("beds", s.bedsMin ?? 0)
  //   // .gte("baths", s.bathsMin ?? 0)
  //   // .eq("furnishing", s.furnishing ?? undefined)
  //   // .eq("parking", s.parking ?? undefined)
  //   // .eq("utilities", s.utilities ?? undefined)
  //   // .eq("hoa", s.hoa ?? undefined);

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Browse Properties</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setMode("gallery")} aria-pressed={mode === "gallery"}>
            Gallery
          </button>
          <button className="btn" onClick={() => setMode("map")} aria-pressed={mode === "map"}>
            Map / Gallery
          </button>
        </div>
      </div>

      {/* URL-driven search bar (gates advanced filters by tier) */}
      <SearchBar />

      {mode === "gallery" ? (
        <section className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {list.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
          {list.length === 0 && <div className="fine">No results.</div>}
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {list.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
            {list.length === 0 && <div className="fine">No results.</div>}
          </div>
          <MapPane />
        </section>
      )}
    </main>
  );
}

// If this page should always be dynamic (recommended for param-driven lists), keep one of these on if needed:
// export const dynamic = "force-dynamic";
// export const revalidate = 0;
