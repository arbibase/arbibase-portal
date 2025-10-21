"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";

type Bounds = { north: number; south: number; east: number; west: number };

type MapPropertyPin = {
  id: string;
  title?: string;
  position: { lat: number; lng: number };
};

/** Demo seed (added Tampa to keep 5 cards) */
const DEMO: Property[] = [
  { id: "1", city: "Miami",     state: "FL", rent: 3800, beds: 2, baths: 2, approval: "STR" },
  { id: "2", city: "Austin",    state: "TX", rent: 2200, beds: 1, baths: 1, approval: "Either" },
  { id: "3", city: "Nashville", state: "TN", rent: 1900, beds: 3, baths: 2, approval: "MTR" },
  { id: "4", city: "Denver",    state: "CO", rent: 2450, beds: 2, baths: 1, approval: "MTR" },
  { id: "5", city: "Tampa",     state: "FL", rent: 2100, beds: 1, baths: 1, approval: "STR" },
];

/** crude city → lat/lng (replace with real geocode later) */
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="container p-4 fine">Loading properties…</div>}>
      <PropertiesView />
    </Suspense>
  );
}

function PropertiesView() {
  const params = useSearchParams();
  const [bounds, setBounds] = useState<Bounds | null>(null);

  // URL params from SearchBar
  const s = useMemo(() => {
    const q = (params?.get("q") || "").trim().toLowerCase();
    const min = Number(params?.get("min") || "");
    const max = Number(params?.get("max") || "");
    const approval = (params?.get("approval") as Property["approval"]) || undefined;
    return {
      q,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      approval,
    };
  }, [params]);

  // Base filter (query/rent/approval)
  const base = useMemo(() => {
    return DEMO.filter((p) => {
      if (s.q && !`${p.city} ${p.state}`.toLowerCase().includes(s.q)) return false;
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) return false;
      if (s.min !== undefined && p.rent < s.min) return false;
      if (s.max !== undefined && p.rent > s.max) return false;
      return true;
    });
  }, [s]);

  // Filter by current map bounds
  const visible = useMemo(() => {
    if (!bounds) return base;
    return base.filter((p) => {
      const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
      if (!c) return true;
      return c.lat <= bounds.north && c.lat >= bounds.south && c.lng <= bounds.east && c.lng >= bounds.west;
    });
  }, [base, bounds]);

  // Map pins for the current list
  const pins: MapPropertyPin[] = useMemo(
    () =>
      base
        .map((p) => {
          const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
          if (!c) return null;
          return { id: p.id, title: `${p.city}, ${p.state} — $${p.rent}`, position: c };
        })
        .filter(Boolean) as MapPropertyPin[],
    [base]
  );

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Browse Properties</h2>
      </div>

      {/* URL-driven search bar */}
      <SearchBar />

      {/* Map first, full width */}
      <section className="rounded-2xl overflow-hidden border border-[#1e2733] bg-[#0b121a]">
        <div style={{ height: 420 }}>
          <MapPane
            initialCenter={{ lat: 37.5, lng: -96 }}
            initialZoom={4}
            markers={pins}
            onBoundsChange={setBounds}
            height={420}
          />
        </div>
      </section>

      {/* 5-column gallery below the map */}
      <section
        className="grid"
        style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }}
      >
        {visible.map((p) => (
          <PropertyCard key={p.id} p={p} />
        ))}
        {visible.length === 0 && <div className="fine col-span-5">No results in view.</div>}
      </section>
    </main>
  );
}
