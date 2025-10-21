"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard from "@/components/ui/PropertyCard";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

const MapPane = nextDynamic(() => import("@/components/ui/MapPane"), { ssr: false });

type Bounds = { north:number; south:number; east:number; west:number; };
type Result = typeof DEMO_PROPERTIES[number];

function PropertiesContent() {
  const params = useSearchParams() ?? new URLSearchParams();
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [results, setResults] = useState<Result[]>(DEMO_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = params.get("q") ?? "";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const type = params.get("type") ?? "";
  const beds = params.get("beds") ?? "";
  const baths = params.get("baths") ?? "";
  const approval = params.get("approval") ?? "";

  // kick off a search when bounds or filters change
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (min) sp.set("min", min);
    if (max) sp.set("max", max);
    if (type) sp.set("type", type);
    if (beds) sp.set("beds", beds);
    if (baths) sp.set("baths", baths);
    if (approval) sp.set("approval", approval);
    if (bounds) {
      sp.set("north", String(bounds.north));
      sp.set("south", String(bounds.south));
      sp.set("east",  String(bounds.east));
      sp.set("west",  String(bounds.west));
    }
    fetch(`/api/search?${sp.toString()}`)
      .then(r => r.json())
      .then(d => setResults(d.results))
      .catch(()=> setResults([]));
  }, [q, min, max, type, beds, baths, approval, bounds]);

  const pins = useMemo(() => results.map(r => ({
    id: r.id,
    title: `$${r.rent.toLocaleString()} • ${r.beds} bd • ${r.baths} ba`,
    address: r.address,
    position: { lat: r.lat, lng: r.lng }
  })), [results]);

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Browse Properties</h2>
      <SearchBar /* isPro={userIsPro} */ />

      <section
        className="rounded-2xl overflow-hidden border border-[#1e2733] bg-[#0b121a]"
        style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", minHeight: 540 }}
      >
        <div style={{ minHeight: 540 }}>
          <MapPane
            initialCenter={{ lat: 37.5, lng: -96 }}
            initialZoom={4}
            pins={pins}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBoundsChange={setBounds}
          />
        </div>

        <aside style={{ borderLeft: "1px solid #1e2733", maxHeight: 540, overflow: "auto", padding: 12 }}>
          {results.length === 0 && <div className="fine">No results in view.</div>}
          <div style={{ display: "grid", gap: 12 }}>
            {results.map((p) => (
              <div key={p.id} onMouseEnter={()=>setSelectedId(p.id)} onMouseLeave={()=>setSelectedId(null)}>
                <PropertyCard p={p} />
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PropertiesContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";