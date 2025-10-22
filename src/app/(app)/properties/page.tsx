"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import SearchBar from "@/components/ui/SearchBar";
import PropertyCard from "@/components/ui/PropertyCard";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

const MapPane = nextDynamic(() => import("@/components/ui/MapPane"), { ssr: false });
const MapPaneAny = MapPane as unknown as any;

// City centroids for mapping
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
};

type Bounds = { north:number; south:number; east:number; west:number; };
type Result = typeof DEMO_PROPERTIES[number];

function PropertiesContent() {
  const params = useSearchParams();
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [results, setResults] = useState<Result[]>(DEMO_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5, lng: -96 });

  // Extract search parameters
  const s = useMemo(() => {
    const q = params?.get("q") || undefined;
    const min = params?.get("min") ? parseInt(params.get("min")!) : undefined;
    const max = params?.get("max") ? parseInt(params.get("max")!) : undefined;
    const type = params?.get("type") || undefined;
    const approval = params?.get("approval") || undefined;
    
    return { q, min, max, type, approval };
  }, [params]);

  // Apply text/filter-based filtering first
  const base = useMemo(() => {
    return DEMO_PROPERTIES.filter((p) => {
      // Text search
      if (s.q && !(`${p.address} ${p.city} ${p.state}`.toLowerCase().includes(s.q.toLowerCase()))) {
        return false;
      }
      
      // Property type filter
      if (s.type && s.type !== "All" && p.type !== s.type) {
        return false;
      }
      
      // Approval filter
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) {
        return false;
      }
      
      // Min rent
      if (s.min !== undefined && p.rent < s.min) {
        return false;
      }
      
      // Max rent
      if (s.max !== undefined && p.rent > s.max) {
        return false;
      }
      
      return true;
    });
  }, [s]);

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

  // Handle location search from SearchBar
  const handleLocationSearch = (center: { lat: number; lng: number }) => {
    setMapCenter(center);
  };

  return (
    <main className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Browse Properties</h2>
      
      {/* SearchBar with location search callback */}
      <SearchBar onLocationSearch={handleLocationSearch} />

      <section className="rounded-2xl overflow-hidden border border-[#1e2733] bg-[#0b121a] mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 min-h-[540px]">
          {/* Map Container */}
          <div className="lg:col-span-3">
            <div className="map-wrap">
              <MapPaneAny
                initialCenter={mapCenter}
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
          </div>

          {/* Properties List */}
          <aside className="lg:col-span-2 border-l border-[#1e2733] max-h-[520px] overflow-auto p-3">
            {results.length === 0 && (
              <div className="text-sm text-gray-400 p-4">No results in view.</div>
            )}
            <div className="space-y-3">
              {results.map((p) => (
                <div 
                  key={p.id} 
                  onMouseEnter={() => setSelectedId(p.id)} 
                  onMouseLeave={() => setSelectedId(null)}
                  className="cursor-pointer"
                >
                  <PropertyCard p={p} />
                </div>
              ))}
            </div>
          </aside>
        </div>
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