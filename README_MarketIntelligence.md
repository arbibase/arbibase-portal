0) What it delivers

Radar (Geo dashboards): ADR, Occupancy, RevPAR, Seasonality, Supply growth, Booking window, Length of stay, Weekend premium, Risk, Regulation overlay.

Insights (Trends): YoY/MoM trends by market & bedroom type, heatmaps, anomaly flags.

Property Benchmarking: Compare any property against zip/city/county/state peer groups (percentiles & gaps).

Tier gates:

Beta: City snapshot + last 30d trends (ADR/Occ/RevPAR)

Pro: Adds bedroom splits, seasonality, booking window & LOS, supply trend, percentile benchmarking

Premium: Adds predictive forecasts (simple), anomaly detection, export & saved watchlists

1) Data model (Supabase SQL)
-- 90_market_geo.sql: normalization
create table if not exists public.market_geo (
  geo_key text primary key,    -- "US:TX:Travis:Austin:78701" or "US:TX:Austin"
  country text not null default 'US',
  state text not null,         -- "TX"
  county text,                 -- "Travis"
  city text,                   -- "Austin"
  zip text,                    -- "78701"
  lat numeric, lng numeric
);

-- 91_market_snapshots.sql: daily aggregates per geo/bedtype
create table if not exists public.market_snapshots (
  id bigserial primary key,
  as_of date not null,
  geo_key text not null references public.market_geo(geo_key) on delete cascade,
  bed_type text not null default 'all',       -- 'all'|'studio'|'1br'|'2br'|...
  supply int,                                 -- active listings (STR/MTR eligible)
  adr numeric,                                 -- average daily rate (USD)
  occ numeric,                                 -- occupancy 0..1
  revpar numeric,                              -- adr*occ
  booking_window_days numeric,                 -- avg days between booking & check-in
  los_days numeric,                            -- avg length of stay
  weekend_premium numeric,                     -- (ADR weekend / ADR weekday - 1)
  cancel_rate numeric,                         -- % of canceled bookings
  demand_index numeric,                        -- normalized demand (0..100)
  seasonality_index numeric,                   -- rolling 365 index 0..1
  risk_score numeric default 5,                -- 0..10
  source text,                                 -- 'etl:partnerX'
  unique(as_of, geo_key, bed_type)
);
create index if not exists idx_snap_geo_date on public.market_snapshots(geo_key, as_of);

-- 92_market_forecasts.sql (Premium simple forecasts)
create table if not exists public.market_forecasts (
  id bigserial primary key,
  geo_key text not null references public.market_geo(geo_key),
  bed_type text not null default 'all',
  as_of date not null,
  horizon text not null,            -- '30d'|'60d'|'90d'
  adr numeric,
  occ numeric,
  revpar numeric,
  seasonality_index numeric,
  model text default 'sma*seasonality', -- doc-friendly
  created_at timestamptz default now(),
  unique(geo_key, bed_type, as_of, horizon)
);

-- 93_property_benchmarks.sql: cached percentiles for a specific property context
create table if not exists public.property_benchmarks (
  property_id uuid not null references public.properties(id) on delete cascade,
  geo_key text not null references public.market_geo(geo_key),
  bed_type text not null default 'all',
  window text not null default '30d',         -- 30d|60d|90d
  p_ad r numeric, p_occ numeric, p_revpar numeric,   -- percentile (0..100)
  adr_gap numeric, occ_gap numeric, revpar_gap numeric, -- property - market avg
  computed_at timestamptz default now(),
  primary key (property_id, geo_key, bed_type, window)
);

-- 94_materialized views for speed
create materialized view if not exists public.mv_market_latest as
select distinct on (geo_key, bed_type)
  geo_key, bed_type, as_of, supply, adr, occ, revpar, seasonality_index, demand_index, risk_score
from public.market_snapshots
order by geo_key, bed_type, as_of desc;

create index if not exists idx_mv_latest_geo on public.mv_market_latest(geo_key);

-- Optional: refresh policy via cron/Edge Function

2) ETL (ingestion + transforms)

You can feed from partners/CSV; below is a safe shape your ETL writes:

// /scripts/etl/ingestMarket.ts (Node script or Edge Function)
type Row = {
  as_of: string; state: string; county?: string; city?: string; zip?: string; lat?: number; lng?: number;
  bed_type?: string; supply?: number; adr?: number; occ?: number; revpar?: number;
  booking_window_days?: number; los_days?: number; weekend_premium?: number; demand_index?: number; seasonality_index?: number; cancel_rate?: number; risk_score?: number;
};

function toGeoKey(r: Row){
  const parts = ['US', r.state, r.county, r.city, r.zip].filter(Boolean);
  return parts.join(':');
}

// Pseudocode:
// 1) upsert market_geo rows for unseen geo_key
// 2) upsert market_snapshots per (date, geo, bed_type='all' unless provided)
// 3) refresh materialized view mv_market_latest nightly


Scheduling:

Use Supabase Scheduled Functions or an external cron (GitHub Actions) to run every night.

After load: refresh materialized view concurrently public.mv_market_latest;

3) API (Next.js App Router)
3.1 Latest snapshot (Radar header)
// src/app/api/market/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const sp = new URL(req.url).searchParams;
  const geo = sp.get("geo")!;          // required
  const bed = sp.get("bed") || "all";

  const { data, error } = await sb
    .from("mv_market_latest")
    .select("*").eq("geo_key", geo).eq("bed_type", bed).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

3.2 Trends (Insights charts)
// src/app/api/market/trend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const sp = new URL(req.url).searchParams;
  const geo = sp.get("geo")!;
  const bed = sp.get("bed") || "all";
  const days = Number(sp.get("days") || 365);

  const since = new Date(); since.setDate(since.getDate() - days);
  const { data, error } = await sb
    .from("market_snapshots")
    .select("as_of, adr, occ, revpar, seasonality_index, supply, booking_window_days, los_days, weekend_premium")
    .eq("geo_key", geo).eq("bed_type", bed).gte("as_of", since.toISOString().slice(0,10))
    .order("as_of", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

3.3 Benchmark a property (Pro+)
// src/app/api/market/benchmark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const sp = new URL(req.url).searchParams;
  const propertyId = sp.get("propertyId")!;
  const window = sp.get("window") || "30d";

  // resolve property's geo_key & bed_type
  const { data: prop } = await sb.from("properties")
    .select("id, beds, zip, city, state").eq("id", propertyId).single();
  const bed = prop.beds ? (prop.beds <= 0 ? 'studio' : `${prop.beds}br`) : 'all';
  const geo = ['US', prop.state, prop.city, prop.zip].filter(Boolean).join(':');

  // latest market mean (window)
  const since = new Date(); since.setDate(since.getDate() - (window === '90d' ? 90 : window === '60d' ? 60 : 30));
  const { data: series } = await sb.from("market_snapshots")
    .select("adr, occ, revpar").eq("geo_key", geo).eq("bed_type", bed)
    .gte("as_of", since.toISOString().slice(0,10));

  const avg = (k:'adr'|'occ'|'revpar') => (series||[]).reduce((a,r)=>a+(r[k]??0),0)/Math.max(1,(series||[]).length);

  // property metrics (assume you store realized ADR/occ)
  const { data: pm } = await sb.rpc("property_perf_window", { p_property_id: propertyId, p_days: (window==='90d'?90:window==='60d'?60:30) });
  const pAdr = pm?.adr ?? 0, pOcc = pm?.occ ?? 0, pRev = pm?.revpar ?? (pAdr * pOcc);

  // simple percentiles (can precompute & cache in property_benchmarks)
  const marketAdr = avg('adr'), marketOcc = avg('occ'), marketRev = avg('revpar');

  const out = {
    bedType: bed, geoKey: geo, window,
    market: { adr: marketAdr, occ: marketOcc, revpar: marketRev },
    property: { adr: pAdr, occ: pOcc, revpar: pRev },
    gaps: { adr_gap: pAdr - marketAdr, occ_gap: pOcc - marketOcc, revpar_gap: pRev - marketRev }
  };
  return NextResponse.json(out);
}


Add a Postgres function property_perf_window to compute realized performance from your booking table (or mock for now).

4) Materialized insights (helper views)
-- 95_mv_market_mom_yoy.sql
create materialized view if not exists public.mv_market_change as
with base as (
  select geo_key, bed_type, as_of, adr, occ, revpar,
         lag(adr, 30) over (partition by geo_key, bed_type order by as_of) as adr_30,
         lag(revpar, 30) over (partition by geo_key, bed_type order by as_of) as revpar_30,
         lag(occ, 30) over (partition by geo_key, bed_type order by as_of) as occ_30,
         lag(adr, 365) over (partition by geo_key, bed_type order by as_of) as adr_365,
         lag(revpar, 365) over (partition by geo_key, bed_type order by as_of) as revpar_365,
         lag(occ, 365) over (partition by geo_key, bed_type order by as_of) as occ_365
  from public.market_snapshots
)
select *,
  case when adr_30 is null or adr_30=0 then null else (adr-adr_30)/adr_30 end as adr_mom,
  case when revpar_30 is null or revpar_30=0 then null else (revpar-revpar_30)/revpar_30 end as revpar_mom,
  case when occ_30 is null or occ_30=0 then null else (occ-occ_30)/occ_30 end as occ_mom,
  case when adr_365 is null or adr_365=0 then null else (adr-adr_365)/adr_365 end as adr_yoy,
  case when revpar_365 is null or revpar_365=0 then null else (revpar-revpar_365)/revpar_365 end as revpar_yoy,
  case when occ_365 is null or occ_365=0 then null else (occ-occ_365)/occ_365 end as occ_yoy
from base;

create index if not exists idx_mv_change_geo on public.mv_market_change(geo_key, bed_type, as_of);

5) React UI (Radar & Insights)
5.1 Radar header (KPIs + map placeholder)
// src/app/(app)/market/page.tsx
"use client";
import { useEffect, useState } from "react";
import { MapPin, TrendingUp, CalendarClock } from "lucide-react";
import dynamic from "next/dynamic";

const GeoMap = dynamic(() => import("@/components/market/GeoMap"), { ssr: false }); // plug any map lib later

export default function MarketPage(){
  const [geo, setGeo] = useState("US:TX:Austin");
  const [bed, setBed] = useState("all");
  const [latest, setLatest] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(()=>{ load(); }, [geo, bed]);
  async function load(){
    const a = await fetch(`/api/market/latest?geo=${encodeURIComponent(geo)}&bed=${bed}`); 
    setLatest((await a.json()).data);
    const t = await fetch(`/api/market/trend?geo=${encodeURIComponent(geo)}&bed=${bed}&days=180`);
    setTrend((await t.json()).data || []);
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xl font-bold">Market Radar</div>
        <div className="ml-auto flex gap-2">
          <select value={geo} onChange={e=>setGeo(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
            <option value="US:TX:Austin">Austin, TX</option>
            <option value="US:TN:Nashville">Nashville, TN</option>
            <option value="US:FL:Tampa">Tampa, FL</option>
          </select>
          <select value={bed} onChange={e=>setBed(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
            <option value="all">All</option><option value="studio">Studio</option><option value="1br">1BR</option><option value="2br">2BR</option>
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="ADR" value={`$${latest?.adr?.toFixed?.(0) ?? '—'}`} />
        <Kpi label="Occupancy" value={`${Math.round((latest?.occ??0)*100)}%`} />
        <Kpi label="RevPAR" value={`$${latest?.revpar?.toFixed?.(0) ?? '—'}`} />
        <Kpi label="Seasonality" value={`${Math.round((latest?.seasonality_index??0)*100)}%`} />
      </div>

      {/* Map + trend row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-white/70 mb-2 flex items-center gap-2"><MapPin size={16}/> Geo Overview</div>
          <GeoMap geo={geo} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-white/70 mb-2 flex items-center gap-2"><TrendingUp size={16}/> ADR / RevPAR (180d)</div>
          <LineChart data={trend} series={[
            { key: "adr", label: "ADR" },
            { key: "revpar", label: "RevPAR" }
          ]}/>
        </div>
      </div>

      {/* Insights tiles */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Supply Growth (180d)">
          <BarChart data={trend} keyField="as_of" valKey="supply"/>
        </Card>
        <Card title="Booking Window / LOS">
          <DualLine data={trend} leftKey="booking_window_days" rightKey="los_days" leftLabel="Booking Window" rightLabel="LOS"/>
        </Card>
        <Card title="Weekend Premium">
          <LineChart data={trend} series={[{ key:"weekend_premium", label:"Weekend Premium" }]}/>
        </Card>
      </div>

      {/* Property Benchmark (Pro+) */}
      <BenchmarkPanel />
    </div>
  );
}

function Kpi({label, value}:{label:string; value:string}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
function Card({title, children}:{title:string; children:any}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm text-white/70 mb-2 flex items-center gap-2"><CalendarClock size={16}/>{title}</div>
      {children}
    </div>
  );
}


Implement LineChart, BarChart, DualLine with Recharts (keep styling minimal; you already use Tailwind).

5.2 Benchmark Panel (Pro+)
// src/components/market/BenchmarkPanel.tsx
"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function BenchmarkPanel(){
  const [propertyId, setPropertyId] = useState<string>("");
  const [res, setRes] = useState<any>(null);
  const [tier, setTier] = useState<'beta'|'pro'|'premium'>('beta');

  useEffect(()=>{ fetch("/api/ai/usage").then(r=>r.json()).then(d=>setTier(d.tier)); }, []);

  async function run(){
    if(!propertyId) return;
    const r = await fetch(`/api/market/benchmark?propertyId=${propertyId}&window=30d`);
    setRes(await r.json());
  }
  if(tier==='beta') return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-semibold mb-1">Property Benchmark (Pro)</div>
      <div className="text-white/60">Upgrade to Pro to compare any property against its peer group.</div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Property Benchmark</div>
        <div className="text-xs text-white/50">Window: 30d • Bed type auto</div>
      </div>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder="Property ID" value={propertyId} onChange={e=>setPropertyId(e.target.value)}/>
        <button onClick={run} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">Benchmark</button>
      </div>
      {res && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Metric name="ADR" val={res.property.adr} mkt={res.market.adr}/>
          <Metric name="Occupancy" val={res.property.occ*100} mkt={res.market.occ*100} suffix="%" digits={0}/>
          <Metric name="RevPAR" val={res.property.revpar} mkt={res.market.revpar}/>
        </div>
      )}
    </div>
  );
}

function Metric({name, val, mkt, suffix='$', digits=0}:{name:string; val:number; mkt:number; suffix?:string; digits?:number}){
  const gap = val - mkt; const up = gap >= 0;
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-white/60 text-xs">{name}</div>
      <div className="text-white font-bold text-lg">{suffix!== '$' ? '' : '$'}{val?.toFixed?.(digits)}{suffix!== '$' ? suffix : ''}</div>
      <div className={`text-xs flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        {up ? '+' : ''}{(gap).toFixed( digits === 0 ? 0 : 2)} {name==='Occupancy' ? 'pts' : (suffix === '$' ? 'USD' : '')}
        <span className="text-white/40 ml-1">vs market</span>
      </div>
    </div>
  );
}

6) Formulas (for consistency)

RevPAR = ADR * OCC

Weekend premium = ADR_weekend / ADR_weekday - 1

Seasonality index (0–1) = ADR_rolling(7) / ADR_rolling(365) (cap 0–1.5 and normalize)

Demand index (0–100) = scaled composite of searches, bookings, occupancy (normalize to your partner metrics)

Risk score (0–10) = composite (regulation level, cancel_rate, volatility of occ & ADR, supply surge)

7) Tier gating rules (server + UI)

Beta:

Allowed endpoints: /api/market/latest, /api/market/trend?days<=60

Block bed_type != 'all' and hide Benchmark panel

Pro:

Unlock trends up to 365d, all bed_types, /api/market/benchmark

Show bedroom split selector, Booking Window/LOS/Weekend Premium tiles

Premium:

Unlock forecasts /api/market/forecast (from market_forecasts)

Enable Export CSV, Watch geos, Anomaly flags (see §8)

Gate by reading profiles.tier in the API routes and short-circuiting with 403 + helpful message.

8) Premium extras (optional, quick)
8.1 Forecast filler (simple model)

Compute forecast = SMA(28) * seasonality_multiplier(next 30/60/90) nightly and store in market_forecasts. Display a dashed line overlay on charts.

8.2 Anomaly flags

Materialized view detecting spikes:

create materialized view if not exists public.mv_market_anomalies as
select s.geo_key, s.bed_type, s.as_of,
  case when s.adr > avg(s.adr) over w + 2*stddev(s.adr) over w then 'adr_spike' end as flag_adr,
  case when s.occ > avg(s.occ) over w + 2*stddev(s.occ) over w then 'occ_spike' end as flag_occ
from public.market_snapshots s
window w as (partition by s.geo_key, s.bed_type order by s.as_of rows between 28 preceding and current row);


Show a small ⚠️ next to chart points with anomalies.

8.3 Watchlists
create table if not exists public.market_watchlist (
  user_id uuid references auth.users(id) on delete cascade,
  geo_key text not null references public.market_geo(geo_key),
  created_at timestamptz default now(),
  primary key(user_id, geo_key)
);


Add a ⭐ “Watch this market” toggle; daily job pings if MoM drop > X% or anomaly seen.

9) Integrations

Revenue Estimator / ROI: pull latest adr/occ/revpar for the property’s geo+bed_type as defaults; store source='market' on inputs.

Portfolio: show market vs. property delta chips; click → deep link to Benchmark panel.

Messaging: “Attach Market Snapshot” → export a mini PNG/CSV (Premium) to send owners.

Library: surface regulation badge in the Radar header (join on jurisdiction_key).

10) Quick QA checklist

 mv_market_latest refreshes after ETL and returns correct last day

 Trend charts render for 60/180/365d with monotonic dates

 Beta cannot change bed type / see benchmark

 Benchmark panel recomputes with property’s bed & geo, and gaps match math

 Forecasts don’t show for geos without sufficient history
