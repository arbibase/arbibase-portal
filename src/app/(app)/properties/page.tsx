"use client";

import { Suspense, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";
import { LatLngBounds } from "leaflet";

/** Demo seed with coordinates */
const DEMO: (Property & { lat?: number; lng?: number })[] = [
  { id: "1", city: "Miami",     state: "FL", rent: 3800, beds: 2, baths: 2, approval: "STR",    lat: 25.7617, lng: -80.1918 },
  { id: "2", city: "Austin",    state: "TX", rent: 2200, beds: 1, baths: 1, approval: "Either", lat: 30.2672, lng: -97.7431 },
  { id: "3", city: "Nashville", state: "TN", rent: 1900, beds: 3, baths: 2, approval: "MTR",    lat: 36.1627, lng: -86.7816 },
  { id: "4", city: "Denver",    state: "CO", rent: 2450, beds: 2, baths: 1, approval: "MTR",    lat: 39.7392, lng: -104.9903 },
  { id: "5", city: "Tampa",     state: "FL", rent: 2100, beds: 1, baths: 1, approval: "STR",    lat: 27.9506, lng: -82.4572 },
];

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="container p-4 fine">Loading properties…</div>}>
      <PropertiesView />
    </Suspense>
  );
}

function PropertiesView() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"gallery" | "map">("gallery");
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null); // 🧭 store map bounds

  const s = useMemo(() => {
    const q = (params?.get("q") || "").trim().toLowerCase();
    const min = Number(params?.get("min") || "");
    const max = Number(params?.get("max") || "");
    const approval = params?.get("approval") || undefined;
    return {
      q,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      approval,
    };
  }, [params]);

  const list = useMemo(() => {
    return DEMO.filter((p) => {
      if (s.q && !`${p.city} ${p.state}`.toLowerCase().includes(s.q)) return false;
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) return false;
      if (s.min !== undefined && p.rent < s.min) return false;
      if (s.max !== undefined && p.rent > s.max) return false;
      return true;
    });
  }, [s]);

  // 🧭 Filter based on map bounds
  const visibleList = useMemo(() => {
    if (!mapBounds) return list;
    return list.filter((p) =>
      p.lat && p.lng ? mapBounds.contains([p.lat, p.lng]) : true
    );
  }, [list, mapBounds]);

  const handleBoundsChange = useCallback((b: LatLngBounds) => {
    setMapBounds(b);
  }, []);

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Browse Properties</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setMode("gallery")} aria-pressed={mode === "gallery"}>Gallery</button>
          <button className="btn" onClick={() => setMode("map")} aria-pressed={mode === "map"}>Map / Gallery</button>
        </div>
      </div>

      <SearchBar />

      {mode === "gallery" ? (
        <section className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 16 }}>
          {list.map((p) => <PropertyCard key={p.id} p={p} />)}
          {list.length === 0 && <div className="fine col-span-5">No results.</div>}
        </section>
      ) : (
        <>
          <MapPane properties={list} onBoundsChange={handleBoundsChange} height={420} />
          <section className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 16 }}>
            {visibleList.map((p) => <PropertyCard key={p.id} p={p} />)}
            {visibleList.length === 0 && <div className="fine col-span-5">No results in view.</div>}
          </section>
        </>
      )}
    </main>
  );
}
