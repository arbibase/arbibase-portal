"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import PropertyCard from "@/components/ui/PropertyCard";
import PropertyModal from "@/components/ui/PropertyModal";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

const MapPane = nextDynamic(() => import("@/components/ui/MapPane"), { ssr: false }) as any;

type Bounds = { north: number; south: number; east: number; west: number };
type P = typeof DEMO_PROPERTIES[number] & { createdAt?: number };

const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
};

function BasicBar({
  initial,
  onSubmit,
}: {
  initial: { q?: string; min?: string; max?: string; type?: string; sort?: string };
  onSubmit: (next: URLSearchParams) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const next = new URLSearchParams();
        for (const k of ["q", "min", "max", "type", "sort"]) {
          const v = (data.get(k) as string)?.trim();
          if (v) next.set(k, v);
        }
        onSubmit(next);
      }}
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: "1.6fr 110px 110px 160px 140px auto", columnGap: 8 }}
    >
      <input name="q" defaultValue={initial.q ?? ""} placeholder="City, neighborhood, ZIP, address…" className="p-2 border rounded-md bg-[#0b121a] border-[#1e2733]" />
      <input name="min" defaultValue={initial.min ?? ""} placeholder="Min" className="p-2 border rounded-md bg-[#0b121a] border-[#1e2733]" type="number" min={0} />
      <input name="max" defaultValue={initial.max ?? ""} placeholder="Max" className="p-2 border rounded-md bg-[#0b121a] border-[#1e2733]" type="number" min={0} />
      <select name="type" defaultValue={initial.type ?? "All"} className="p-2 border rounded-md bg-[#0b121a] border-[#1e2733]">
        <option>All</option><option>Apartment</option><option>House</option><option>Townhome</option><option>Condo</option><option>Duplex</option>
      </select>
      <select name="sort" defaultValue={initial.sort ?? "relevance"} className="p-2 border rounded-md bg-[#0b121a] border-[#1e2733]">
        <option value="relevance">Sort: Relevance</option>
        <option value="priceAsc">Price (low → high)</option>
        <option value="priceDesc">Price (high → low)</option>
        <option value="newest">Newest</option>
      </select>
      <button className="px-4 py-2 rounded-md bg-linear-to-r from-sky-500 to-blue-600 text-white">Search</button>
    </form>
  );
}

function PropertiesContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5, lng: -96 });
  const [modal, setModal] = useState<P | null>(null);

  // URL -> filter state
  const s = useMemo(() => {
    const q = params?.get("q") || undefined;
    const min = params?.get("min") ? Number(params.get("min")) : undefined;
    const max = params?.get("max") ? Number(params.get("max")) : undefined;
    const type = params?.get("type") || undefined;   // "Apartment" | "House" | ...
    const sort = params?.get("sort") || "relevance";
    return { q, min, max, type, sort };
  }, [params]);

  // 1) Text/price/type filter
  const base = useMemo(() => {
    let out = DEMO_PROPERTIES.filter((p) => {
      if (s.q && !(`${p.address} ${p.city} ${p.state}`.toLowerCase().includes(s.q.toLowerCase()))) return false;
      if (s.type && s.type !== "All" && p.type !== s.type) return false;
      if (s.min !== undefined && p.rent < s.min) return false;
      if (s.max !== undefined && p.rent > s.max) return false;
      return true;
    });

    if (s.sort === "priceAsc") out = [...out].sort((a, b) => a.rent - b.rent);
    else if (s.sort === "priceDesc") out = [...out].sort((a, b) => b.rent - a.rent);
    else if (s.sort === "newest") out = [...out].sort((a, b) => (((b as any).createdAt ?? 0) - ((a as any).createdAt ?? 0)));

    return out;
  }, [s]);

  // 2) Bounds filter (only after we have them)
  const visible = useMemo(() => {
    if (!bounds) return base;
    return base.filter((p) => {
      const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
      if (!c) return true;
      return c.lat <= bounds.north && c.lat >= bounds.south && c.lng <= bounds.east && c.lng >= bounds.west;
    });
  }, [base, bounds]);

  // markers from visible
  const markers = useMemo(() => {
    return visible
      .map((p) => {
        const c = CITY_CENTROIDS[`${p.city}, ${p.state}`];
        return c ? { id: p.id, title: `${p.address} — $${p.rent}/mo`, position: c } : null;
      })
      .filter(Boolean);
  }, [visible]);

  // router helper for BasicBar
  const updateParams = (next: URLSearchParams) => {
    router.push(`${pathname}?${next.toString()}`);
    // optional: re-center by rough city centroid if q matches a known city
    const q = next.get("q");
    if (q && CITY_CENTROIDS[q as keyof typeof CITY_CENTROIDS]) {
      setMapCenter(CITY_CENTROIDS[q as keyof typeof CITY_CENTROIDS]);
    }
  };

  // map <-> list: clicking a marker/card opens modal, hover highlights
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${selectedId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <main className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Browse Properties</h2>

      <BasicBar
        initial={{
          q: s.q, min: s.min?.toString(), max: s.max?.toString(), type: s.type, sort: s.sort,
        }}
        onSubmit={updateParams}
      />

      <section className="rounded-2xl overflow-hidden border border-[#1e2733] bg-[#0b121a] mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 min-h-[540px]">
          {/* Map */}
          <div className="lg:col-span-3">
            <div className="h-[540px]">
              <MapPane
                initialCenter={mapCenter}
                initialZoom={4}
                markers={markers}
                selectedId={selectedId}
                onSelect={(id: string) => {
                  setSelectedId(id);
                  const p = visible.find(x => x.id === id);
                  if (p) setModal(p);
                }}
                onBoundsChange={setBounds}
              />
            </div>
          </div>

          {/* Right list */}
          <aside ref={listRef} className="lg:col-span-2 border-l border-[#1e2733] max-h-[540px] overflow-auto p-3">
            {visible.length === 0 && <div className="text-sm text-gray-400 p-4">No results in view.</div>}

            <div className="space-y-3">
              {visible.map((p) => (
                <div
                  key={p.id}
                  data-id={p.id}
                  onMouseEnter={() => setSelectedId(p.id)}
                  onMouseLeave={() => setSelectedId(null)}
                  onClick={() => setModal(p)}
                  className="cursor-pointer"
                >
                  <PropertyCard p={p} />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {modal && <PropertyModal property={modal} onClose={() => setModal(null)} />}
    </main>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="container p-4">Loading…</div>}>
      <PropertiesContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
