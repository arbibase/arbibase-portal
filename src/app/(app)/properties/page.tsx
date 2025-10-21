"use client";

import React, { Suspense, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

/** Demo seed — five example listings with exact coordinates */
const DEMO: (Property & {
  address: string;
  lat: number;
  lng: number;
  photos?: string[];
})[] = [
  {
    id: "1",
    city: "Miami",
    state: "FL",
    address: "1100 West Ave, Miami Beach, FL",
    rent: 3800,
    beds: 2,
    baths: 2,
    approval: "STR",
    lat: 25.7847,
    lng: -80.1417,
    photos: [],
  },
  {
    id: "2",
    city: "Austin",
    state: "TX",
    address: "301 W 2nd St, Austin, TX",
    rent: 2200,
    beds: 1,
    baths: 1,
    approval: "Either",
    lat: 30.2640,
    lng: -97.7455,
    photos: [],
  },
  {
    id: "3",
    city: "Nashville",
    state: "TN",
    address: "515 Church St, Nashville, TN",
    rent: 1900,
    beds: 3,
    baths: 2,
    approval: "MTR",
    lat: 36.1649,
    lng: -86.7817,
    photos: [],
  },
  {
    id: "4",
    city: "Denver",
    state: "CO",
    address: "1701 Wynkoop St, Denver, CO",
    rent: 2450,
    beds: 2,
    baths: 1,
    approval: "MTR",
    lat: 39.7527,
    lng: -105.0006,
    photos: [],
  },
  {
    id: "5",
    city: "Tampa",
    state: "FL",
    address: "401 Channelside Walk Way, Tampa, FL",
    rent: 2100,
    beds: 1,
    baths: 1,
    approval: "STR",
    lat: 27.9411,
    lng: -82.4476,
    photos: [],
  },
];

// crude city → lat/lng for demo pins
type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type MapPin = {
  id: string;
  position: { lat: number; lng: number };
  title: string;
};

export default function Page() {
  return (
    <Suspense fallback={<div className="container p-4 fine">Loading properties…</div>}>
      <View />
    </Suspense>
  );
}

function View() {
  const params = useSearchParams();
  const router = useRouter();

  // read URL params from SearchBar
  const filters = useMemo(() => {
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

  // base filter
  const filtered = useMemo(() => {
    return DEMO.filter((p) => {
      if (filters.q && !`${p.city} ${p.state}`.toLowerCase().includes(filters.q)) return false;
      if (filters.approval && filters.approval !== "Either" && p.approval !== filters.approval) return false;
      if (typeof filters.min === "number" && p.rent < filters.min) return false;
      if (typeof filters.max === "number" && p.rent > filters.max) return false;
      return true;
    });
  }, [filters]);

const [bounds, setBounds] = useState<Bounds | null>(null);

const visible = useMemo(() => {
  if (!bounds) return filtered;
  return filtered.filter((p) => {
    const lat = (p as any).lat;
    const lng = (p as any).lng;
    if (lat == null || lng == null) return false;
    return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
  });
}, [filtered, bounds]);

const pins = useMemo(() => {
  return filtered
    .map((p) => {
      const lat = (p as any).lat;
      const lng = (p as any).lng;
      if (lat == null || lng == null) return null;
      const price = `$${p.rent.toLocaleString()}`;
      return {
        id: p.id,
        position: { lat, lng },
        title: `${p.city}, ${p.state} — ${price}`,
      } as MapPin;
    })
    .filter(Boolean) as MapPin[];
}, [filtered]);


  const handleMarkerClick = useCallback(
    (id: string) => router.push(`/properties/${id}`),
    [router]
  );

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Browse Properties</h2>
      </div>

      {/* SearchBar (URL-driven; Pro gates are inside the component) */}
      <SearchBar />

      {/* Zillow-style two-pane layout */}
      <section
        className="grid rounded-2xl border border-[#1e2733] bg-[#0b121a]"
        style={{
          gridTemplateColumns: "minmax(420px, 1.1fr) 1fr",
          gap: 0,
          overflow: "hidden",
        }}
      >
        {/* Map on the left */}
        <div style={{ height: 560, minWidth: 420 }}>
          {React.createElement((MapPane as any), {
            initialCenter: { lat: 37.5, lng: -96 }, // USA
            initialZoom: 4,
            pins,
            onIdleBounds: setBounds,
            onMarkerClick: handleMarkerClick,
          })}
        </div>

        {/* List on the right */}
        <div className="p-4">
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
          >
            {visible.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
          {visible.length === 0 && (
            <div className="fine mt-4">No results in view.</div>
          )}
        </div>
      </section>
    </main>
  );
}
