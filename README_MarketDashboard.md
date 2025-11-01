1️⃣ Database (Supabase SQL)
-- 20_market_snapshots.sql
create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  geo_key text not null,                -- e.g., ZIP code or FIPS
  city text,
  state text,
  adr numeric,                          -- average daily rate
  occ numeric,                          -- occupancy rate (0..1)
  lt_rent numeric,                      -- long-term rent per month
  spread numeric generated always as ((adr * occ * 30) - lt_rent) stored,
  risk_score numeric default 5,         -- 0..10, from Library/AI
  seasonality_index numeric default 1,  -- 0.8..1.2
  avg_coc numeric,                      -- optional derived
  as_of date not null default current_date
);
create index if not exists idx_market_geo on public.market_snapshots(geo_key);
create index if not exists idx_market_city_state on public.market_snapshots(city, state);

-- Optional: store historical snapshots for trend analytics
create table if not exists public.market_history (
  id uuid primary key default gen_random_uuid(),
  geo_key text not null,
  metric text not null,
  value numeric not null,
  as_of date not null default current_date
);
create index if not exists idx_market_history_geo on public.market_history(geo_key);


Security

alter table public.market_snapshots enable row level security;
create policy "public readable markets" on public.market_snapshots
  for select using (true);

2️⃣ Types

/src/types/market.ts

export interface MarketSnapshot {
  id: string;
  geo_key: string;
  city: string;
  state: string;
  adr: number;
  occ: number;
  lt_rent: number;
  spread: number;
  risk_score: number;
  seasonality_index: number;
  as_of: string;
}

export interface MarketSummary {
  city: string;
  state: string;
  avg_adr: number;
  avg_occ: number;
  avg_lt_rent: number;
  avg_spread: number;
  avg_risk: number;
  sample_size: number;
}

3️⃣ API Routes (Next.js → later FastAPI)
/api/markets — get city/zip snapshot(s)

/src/app/api/markets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geo = searchParams.get("geo");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  const supabase = getSupabaseServer();
  let query = supabase.from("market_snapshots").select("*").order("as_of", { ascending: false }).limit(25);

  if (geo) query = query.eq("geo_key", geo);
  if (city) query = query.ilike("city", city);
  if (state) query = query.eq("state", state);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/api/markets/top — get top markets by metric (spread or ROI)

/src/app/api/markets/top/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("by") ?? "spread";
  const limit = parseInt(searchParams.get("limit") ?? "10");

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("market_snapshots")
    .select("city, state, adr, occ, lt_rent, spread, risk_score, seasonality_index")
    .order(metric, { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

4️⃣ Market Logic (shared utilities)

/src/lib/market.ts

import type { MarketSnapshot } from "@/types/market";

export function summarizeMarkets(markets: MarketSnapshot[]) {
  if (markets.length === 0) return null;
  const n = markets.length;
  const sums = markets.reduce(
    (a, m) => ({
      adr: a.adr + m.adr,
      occ: a.occ + m.occ,
      lt_rent: a.lt_rent + m.lt_rent,
      spread: a.spread + m.spread,
      risk: a.risk_score + m.risk_score
    }),
    { adr: 0, occ: 0, lt_rent: 0, spread: 0, risk: 0 }
  );
  return {
    avg_adr: sums.adr / n,
    avg_occ: sums.occ / n,
    avg_lt_rent: sums.lt_rent / n,
    avg_spread: sums.spread / n,
    avg_risk: sums.risk / n,
    sample_size: n
  };
}

5️⃣ React Components
/src/components/market/MarketSearchBar.tsx
"use client";
import { useState } from "react";

export default function MarketSearchBar({ onSearch }:{ onSearch:(params:any)=>void }) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  return (
    <form onSubmit={e=>{e.preventDefault(); onSearch({ city, state });}} className="flex flex-wrap gap-2">
      <input
        placeholder="City"
        value={city}
        onChange={e=>setCity(e.target.value)}
        className="rounded bg-slate-800 px-3 py-2"
      />
      <input
        placeholder="State (e.g. TX)"
        value={state}
        onChange={e=>setState(e.target.value)}
        className="rounded bg-slate-800 px-3 py-2"
      />
      <button className="rounded bg-teal-500 px-4 py-2">Search</button>
    </form>
  );
}

/src/components/market/MarketList.tsx
export default function MarketList({ markets, onUse }:{ markets:any[]; onUse:(m:any)=>void }) {
  if (!markets || markets.length === 0) return <div className="text-slate-400">No markets found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="p-2 text-left">City</th>
            <th className="p-2">ADR</th>
            <th className="p-2">Occ</th>
            <th className="p-2">LT Rent</th>
            <th className="p-2">Spread</th>
            <th className="p-2">Risk</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m)=>(
            <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/50">
              <td className="p-2">{m.city}, {m.state}</td>
              <td className="p-2">${m.adr.toFixed(0)}</td>
              <td className="p-2">{(m.occ*100).toFixed(1)}%</td>
              <td className="p-2">${m.lt_rent.toFixed(0)}</td>
              <td className="p-2">${m.spread.toFixed(0)}</td>
              <td className="p-2">{m.risk_score.toFixed(1)}</td>
              <td className="p-2">
                <button
                  onClick={()=>onUse(m)}
                  className="rounded bg-sky-600 px-2 py-1 text-xs hover:bg-sky-500">
                  Use in Estimator
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/src/app/(app)/markets/page.tsx
"use client";
import { useState } from "react";
import MarketSearchBar from "@/components/market/MarketSearchBar";
import MarketList from "@/components/market/MarketList";

export default function MarketDashboardPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(params:any) {
    setLoading(true);
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/markets?${query}`);
    const data = await res.json();
    setMarkets(data.data ?? []);
    setLoading(false);
  }

  function handleUse(m:any) {
    const query = new URLSearchParams({
      adr: m.adr,
      occ: m.occ,
      state: m.state,
      zip: m.geo_key
    }).toString();
    window.location.href = `/estimator?${query}`;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Market Dashboard</h1>
      <MarketSearchBar onSearch={handleSearch} />
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <MarketList markets={markets} onUse={handleUse} />
      )}
    </div>
  );
}

6️⃣ Optional: Add Map Visualization (Mapbox Shell)

Later, you can extend this with Mapbox or Leaflet.
Create /src/components/market/MarketMap.tsx:

"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function MarketMap({ markets }:{ markets:any[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5, 39.5],
      zoom: 3
    });

    markets.forEach(m => {
      if (!m.geo_lat || !m.geo_lng) return;
      const popup = new mapboxgl.Popup().setHTML(
        `<div><b>${m.city}, ${m.state}</b><br>ADR: $${m.adr.toFixed(0)}<br>Occ: ${(m.occ*100).toFixed(1)}%</div>`
      );
      new mapboxgl.Marker({ color: "#0ea5e9" })
        .setLngLat([m.geo_lng, m.geo_lat])
        .setPopup(popup)
        .addTo(map);
    });

    return () => map.remove();
  }, [markets]);

  return <div ref={mapContainer} className="h-[500px] w-full rounded-xl border border-slate-800" />;
}


Use in /markets/page.tsx:

{markets.length > 0 && <MarketMap markets={markets} />}

7️⃣ Tier Gates
Tier	Market Scope	Features
Beta	1 city search only	Read-only table
Pro	National search	Compare up to 3 cities, “Use in Estimator”
Premium	Global	Map view + export CSV + predictive AI overlay

Implement tier gate with your existing tier.ts helper:

if (tier === 'beta' && results.length > 1) results = results.slice(0,1);

8️⃣ QA & Performance

✅ Targets

Response time < 400ms for cached market queries

ADR/OCC consistency across estimator prefill

Table columns align visually on mobile

“Use in Estimator” opens /estimator with query params applied

✅ Future Enhancements

Predictive ADR/OCC forecast (Premium)

Market scoring: combine spread, risk, and avg_coc

Region filters (state → city → ZIP cascade)

Export CSV / API (Premium)

This Market Dashboard now:

Feeds Estimator defaults

Syncs with ROI

Connects to Library (risk_score) later

Serves as the foundation for your Market Radar AI layer
