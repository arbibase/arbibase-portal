"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";

/** Demo seed until API is wired */
const DEMO: Property[] = [
  { id: "1", city: "Miami",     state: "FL", rent: 3800, beds: 2, baths: 2, approval: "STR"    },
  { id: "2", city: "Austin",    state: "TX", rent: 2200, beds: 1, baths: 1, approval: "Either" },
  { id: "3", city: "Nashville", state: "TN", rent: 1900, beds: 3, baths: 2, approval: "MTR"    },
  { id: "4", city: "Denver",    state: "CO", rent: 2450, beds: 2, baths: 1, approval: "MTR"    },
  { id: "5", city: "Tampa",     state: "FL", rent: 2100, beds: 1, baths: 1, approval: "STR"    },
];

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="container p-4 fine">Loading properties…</div>}>
      <PropertiesView />
    </Suspense>
  );
}

function toNumber(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function PropertiesView() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"gallery" | "map">("gallery");

  /** Parse URL params coming from SearchBar */
  const s = useMemo(() => {
    const q = (params?.get("q") || "").trim().toLowerCase();
    const min = toNumber(params?.get("min") || null);
    const max = toNumber(params?.get("max") || null);
    const approval = params?.get("approval") as Property["approval"] | null;

    return {
      q,
      min,
      max,
      approval: approval || undefined,
    };
  }, [params]);

  /** Filter demo data (will be swapped for API fetch later) */
  const filtered = useMemo(() => {
    const out = DEMO.filter((p) => {
      if (s.q && !(`${p.city} ${p.state}`.toLowerCase().includes(s.q))) return false;
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) return false;
      if (s.min !== undefined && p.rent < s.min) return false;
      if (s.max !== undefined && p.rent > s.max) return false;
      return true;
    });
    // Always show something: if filters exclude all, keep the seed list
    return out.length ? out : DEMO;
  }, [s]);

  // TODO: When API is ready, fetch real results here with `s` as query

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Browse Properties</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => setMode("gallery")}
            aria-pressed={mode === "gallery"}
          >
            Gallery
          </button>
          <button
            className="btn"
            onClick={() => setMode("map")}
            aria-pressed={mode === "map"}
          >
            Map / Gallery
          </button>
        </div>
      </div>

      {/* URL-driven search bar */}
      <SearchBar />

      {mode === "gallery" ? (
        <section className="card-grid-5">
          {filtered.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
          <div className="card-grid-5 !grid-cols-2 lg:!grid-cols-3 xl:!grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
          <MapPane />
        </section>
      )}
    </main>
  );
}
