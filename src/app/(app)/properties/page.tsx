"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard from "@/components/ui/PropertyCard";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {};

const MapPane = nextDynamic(() => import("@/components/ui/MapPane"), { ssr: false });
const MapPaneAny = MapPane as unknown as any;

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

  // Apply text/filter-based filtering first
  const base = useMemo(() => {
    let filtered = DEMO_PROPERTIES;
    
    if (q) {
      filtered = filtered.filter(p => 
        p.address.toLowerCase().includes(q.toLowerCase()) ||
        p.city.toLowerCase().includes(q.toLowerCase()) ||
        p.state.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    if (min) {
      const minRent = parseInt(min);
      filtered = filtered.filter(p => p.rent >= minRent);
    }
    
    if (max) {
      const maxRent = parseInt(max);
      filtered = filtered.filter(p => p.rent <= maxRent);
    }
    
    if (type) {
      filtered = filtered.filter(p => 
        p.unit_type.toLowerCase().includes(type.toLowerCase())
      );
    }
    
    if (beds) {
      filtered = filtered.filter(p => p.beds >= parseInt(beds));
    }
    
    if (baths) {
      filtered = filtered.filter(p => p.baths >= parseInt(baths));
    }
    
    if (approval) {
      filtered = filtered.filter(p => 
        p.approval.toLowerCase().includes(approval.toLowerCase())
      );
    }
    
    return filtered;
  }, [q, min, max, type, beds, baths, approval]);

  // Apply bounds filtering only after we have bounds
  const visible = useMemo(() => {
    // If we don't have bounds yet, show the base list (keeps demo properties visible)
    if (!bounds) return base;
    
    return base.filter((p) => {
      const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
      if (!c) return true;
      return c.lat <= bounds.north && 
             c.lat >= bounds.south && 
             c.lng <= bounds.east && 
             c.lng >= bounds.west;
    });
  }, [base, bounds]);

  // Update results when visible properties change
  useEffect(() => {
    setResults(visible);
  }, [visible]);

  return (
    <main className="container" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Browse Properties</h2>
      <SearchBar />

      <section
        className="rounded-2xl overflow-hidden border border-[#1e2733] bg-[#0b121a]"
        style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", minHeight: 540 }}
      >
        <div style={{ minHeight: 540 }}>
          <MapPaneAny
            initialCenter={{ lat: 37.5, lng: -96 }}
            initialZoom={4}
            markers={visible.map(p => {
              const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
              return c ? { 
                id: p.id, 
                title: `${p.address} — $${p.rent}/mo`, 
                position: c 
              } : null;
            }).filter(Boolean) as any}
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