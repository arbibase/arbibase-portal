1) DB: KPIs + Summary View (Supabase SQL)
-- 30_portfolio_kpis_monthly.sql
create table if not exists public.portfolio_kpis_monthly (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,                             -- use 1st of month
  gross_rev numeric not null default 0,
  expenses numeric not null default 0,
  net_profit numeric not null default 0,
  occ_rate numeric not null default 0,            -- 0..1
  created_at timestamptz default now(),
  unique (property_id, month)
);
create index if not exists idx_kpis_user_month on public.portfolio_kpis_monthly(user_id, month desc);

alter table public.portfolio_kpis_monthly enable row level security;
create policy "kpis owner r/w" on public.portfolio_kpis_monthly
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: quick view to summarize a time window (last N days)
drop view if exists public.v_portfolio_summary;
create view public.v_portfolio_summary as
select
  p.user_id,
  count(distinct p.id)::int as total_doors,
  coalesce(sum(k.net_profit) filter (where k.month >= (current_date - interval '30 day')),0) as profit_30d,
  coalesce(sum(k.gross_rev) filter (where k.month >= (current_date - interval '30 day')),0) as revenue_30d,
  coalesce(avg(k.occ_rate) filter (where k.month >= (current_date - interval '90 day')),0) as avg_occ_90d
from public.properties p
left join public.portfolio_kpis_monthly k on k.property_id = p.id
group by p.user_id;


You can compute “change vs last period” in API (compare last window vs previous window), not in SQL, to keep flexibility.

2) API Routes
/api/portfolio/summary?days=30

Aggregates totals + change deltas vs previous period.

// src/app/api/portfolio/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(7, Math.min(180, parseInt(searchParams.get("days") ?? "30")));
  const end = new Date(); end.setUTCHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);

  // current window
  const { data: curr, error: e1 } = await supabase
    .from("portfolio_kpis_monthly")
    .select("gross_rev, expenses, net_profit, occ_rate")
    .eq("user_id", user.id)
    .gte("month", start.toISOString().slice(0,10));
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // previous window
  const { data: prev, error: e2 } = await supabase
    .from("portfolio_kpis_monthly")
    .select("gross_rev, expenses, net_profit, occ_rate")
    .eq("user_id", user.id)
    .gte("month", prevStart.toISOString().slice(0,10))
    .lt("month", start.toISOString().slice(0,10));
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const agg = (rows:any[]) => rows.reduce((a,r)=>({
    rev:a.rev+(r.gross_rev||0),
    prof:a.prof+(r.net_profit||0),
    occs:[...a.occs,(r.occ_rate||0)],
  }), {rev:0, prof:0, occs:[] as number[]});
  const C = agg(curr||[]);
  const P = agg(prev||[]);
  const avgOcc = C.occs.length ? (C.occs.reduce((x,y)=>x+y,0)/C.occs.length)*100 : 0;
  const pct = (now:number, before:number)=> before>0 ? ((now-before)/before)*100 : (now>0?100:0);

  // doors count (fast)
  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    totalDoors: count || 0,
    totalRevenue: C.rev,
    totalProfit: C.prof,
    avgOccupancy: Math.round(avgOcc),
    revenueChange: +pct(C.rev, P.rev).toFixed(1),
    profitChange: +pct(C.prof, P.prof).toFixed(1)
  });
}

/api/portfolio/properties?days=30&order=profit:desc&search=&stage=live

Returns each property’s performance + trend marker + optional alert.

// src/app/api/portfolio/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(7, Math.min(180, parseInt(searchParams.get("days") ?? "30")));
  const stage = searchParams.get("stage");  // saved|verified|live (optional)
  const search = searchParams.get("search")?.trim();
  const order = searchParams.get("order") ?? "profit:desc";

  const end = new Date(); end.setUTCHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);

  // join properties + this window KPIs
  let q = supabase
    .from("properties")
    .select(`
      id, address, city, state, zip,
      type, beds, baths,
      portfolio_kpis_monthly!inner(net_profit, gross_rev, occ_rate, month)
    `)
    .eq("user_id", user.id)
    .gte("portfolio_kpis_monthly.month", start.toISOString().slice(0,10));

  if (stage) q = q.eq("status", stage);
  if (search) q = q.or(`address.ilike.%${search}%,city.ilike.%${search}%`);

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // aggregate by property
  const map = new Map<string, any>();
  (rows||[]).forEach((r:any)=>{
    const k = r.id;
    const kpi = r.portfolio_kpis_monthly;
    const currNet = (Array.isArray(kpi)?kpi: [kpi]).reduce((a:any,x:any)=>a + (x.net_profit||0),0);
    const currRev = (Array.isArray(kpi)?kpi: [kpi]).reduce((a:any,x:any)=>a + (x.gross_rev||0),0);
    const occs = (Array.isArray(kpi)?kpi: [kpi]).map((x:any)=>x.occ_rate||0);
    map.set(k, {
      id: r.id,
      name: r.address?.split(",")[0] ?? "Property",
      address: r.address,
      city: r.city, state: r.state, zipCode: r.zip,
      monthlyRevenue: currRev,
      monthlyProfit: currNet,
      occupancy: Math.round((occs.reduce((x:number,y:number)=>x+y,0)/(occs.length||1))*100),
    });
  });

  // previous window profit per property (for trend)
  const { data: prevRows } = await supabase
    .from("portfolio_kpis_monthly")
    .select("property_id, net_profit, month")
    .eq("user_id", user.id)
    .gte("month", prevStart.toISOString().slice(0,10))
    .lt("month", start.toISOString().slice(0,10));

  const prevMap = new Map<string, number>();
  (prevRows||[]).forEach((r:any)=>{
    prevMap.set(r.property_id, (prevMap.get(r.property_id)||0) + (r.net_profit||0));
  });

  const properties = Array.from(map.values()).map((p:any)=>{
    const prev = prevMap.get(p.id) || 0;
    const change = p.monthlyProfit - prev;
    const trend = change > 0 ? "up" : change < 0 ? "down" : "stable";
    const alert = (p.occupancy < 70) ? "Occupancy below 70%" : undefined;
    return { ...p, trend, alert };
  });

  // ordering
  const [field, dir] = order.split(":");
  properties.sort((a:any,b:any)=>{
    const vA = (field==="revenue")?a.monthlyRevenue : (field==="occupancy")?a.occupancy : a.monthlyProfit;
    const vB = (field==="revenue")?b.monthlyRevenue : (field==="occupancy")?b.occupancy : b.monthlyProfit;
    return dir==="asc" ? vA-vB : vB-vA;
  });

  return NextResponse.json({ data: properties });
}

/api/portfolio/export?days=90

Returns CSV (UTF-8) for Premium.

// src/app/api/portfolio/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: check user tier (only premium)
  const { searchParams } = new URL(req.url);
  const days = Math.max(7, Math.min(365, parseInt(searchParams.get("days") ?? "90")));
  const start = new Date(); start.setDate(start.getDate() - days);
  const { data, error } = await supabase
    .from("portfolio_kpis_monthly")
    .select("property_id, month, gross_rev, expenses, net_profit, occ_rate")
    .eq("user_id", user.id)
    .gte("month", start.toISOString().slice(0,10));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = "property_id,month,gross_rev,expenses,net_profit,occ_rate\n";
  const csv = header + (data||[]).map((r:any)=>[
    r.property_id, r.month, r.gross_rev, r.expenses, r.net_profit, r.occ_rate
  ].join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="portfolio_${days}d.csv"`
    }
  });
}

3) React Page (Server + Client)
Server wrapper (auth + initial fetch)
// src/app/(app)/portfolio/page.tsx
import PortfolioClient from "./PortfolioClient";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // redirect to login on server
    return (
      <div className="p-10 text-center text-white/70">You must be logged in.</div>
    );
  }
  // prime with 30 days
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/portfolio/summary?days=30`, { cache: "no-store", headers: { cookie: "" } });
  const metrics = await res.json();
  return <PortfolioClient initialMetrics={metrics} />;
}

Client component (filters, table, export)
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PieChart, TrendingUp, TrendingDown, DollarSign, Home, BarChart3, Download, AlertCircle, Search } from "lucide-react";

type Metrics = {
  totalDoors:number; totalRevenue:number; totalProfit:number; avgOccupancy:number;
  revenueChange:number; profitChange:number;
};

type Row = {
  id:string; name:string; address:string; city:string; state:string; zipCode:string;
  monthlyRevenue:number; monthlyProfit:number; occupancy:number; trend:"up"|"down"|"stable"; alert?:string;
};

export default function PortfolioClient({ initialMetrics }:{ initialMetrics: Metrics }) {
  const [timeframe, setTimeframe] = useState<"30"|"60"|"90">("30");
  const [metrics, setMetrics]   = useState<Metrics>(initialMetrics);
  const [rows, setRows]         = useState<Row[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [order, setOrder]       = useState<"profit:desc"|"revenue:desc"|"occupancy:desc">("profit:desc");
  const [stage, setStage]       = useState<""|"saved"|"verified"|"live">("");

  useEffect(() => { loadAll(); }, [timeframe, order, stage]);
  async function loadAll() {
    setLoading(true);
    const [m, p] = await Promise.all([
      fetch(`/api/portfolio/summary?days=${timeframe}`).then(r=>r.json()),
      fetch(`/api/portfolio/properties?days=${timeframe}&order=${order}&stage=${stage}&search=${encodeURIComponent(search)}`).then(r=>r.json())
    ]);
    setMetrics(m);
    setRows(p.data || []);
    setLoading(false);
  }

  async function onExport() {
    const a = document.createElement("a");
    a.href = `/api/portfolio/export?days=${timeframe}`;
    a.download = `portfolio_${timeframe}d.csv`;
    a.click();
  }

  const filtered = useMemo(()=> rows, [rows]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Portfolio</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl flex items-center gap-3">
              <PieChart className="text-emerald-400" size={32} />
              Portfolio Analytics
            </h1>
            <p className="mt-1 text-white/60">Track performance across {metrics.totalDoors} active properties</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/40" />
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' && loadAll()}
                placeholder="Search address or city"
                className="pl-8 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white w-56" />
            </div>
            <select value={stage} onChange={(e)=>setStage(e.target.value as any)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <option value="">All stages</option>
              <option value="saved">Saved</option>
              <option value="verified">Verified</option>
              <option value="live">Live</option>
            </select>
            <select value={order} onChange={(e)=>setOrder(e.target.value as any)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <option value="profit:desc">Sort: Profit</option>
              <option value="revenue:desc">Sort: Revenue</option>
              <option value="occupancy:desc">Sort: Occupancy</option>
            </select>
            <select value={timeframe} onChange={(e)=>setTimeframe(e.target.value as any)}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white">
              <option value="30" className="bg-[#0b141d]">Last 30 Days</option>
              <option value="60" className="bg-[#0b141d]">Last 60 Days</option>
              <option value="90" className="bg-[#0b141d]">Last 90 Days</option>
            </select>
            <button onClick={onExport}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              <Download size={16} className="inline mr-2" />
              Export
            </button>
          </div>
        </div>
      </header>
      {/* Metrics */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Home size={20}/>}     label="Total Doors"   value={String(metrics.totalDoors)} />
        <MetricCard icon={<DollarSign size={20}/>} label="Total Revenue" value={`$${Math.round(metrics.totalRevenue).toLocaleString()}`} change={metrics.revenueChange}/>
        <MetricCard icon={<TrendingUp size={20}/>} label="Total Profit"  value={`$${Math.round(metrics.totalProfit).toLocaleString()}`} change={metrics.profitChange}/>
        <MetricCard icon={<BarChart3 size={20}/>}  label="Avg Occupancy" value={`${metrics.avgOccupancy}%`} />
      </div>
      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Property Performance</h2>
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <TH text="Property" />
                  <TH text="Location" />
                  <TH text="Revenue" right />
                  <TH text="Profit" right />
                  <TH text="Occupancy" right />
                  <TH text="Trend" center />
                  <TH text="Status" center />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p)=>(
                  <tr key={p.id} className="border-b border-white/10 last:border-0">
                    <td className="py-3 text-sm font-semibold text-white">{p.name}</td>
                    <td className="py-3 text-sm text-white/70">{p.address}<br/>
                      <span className="text-xs text-white/50">{p.city}, {p.state} {p.zipCode}</span>
                    </td>
                    <td className="py-3 text-right text-sm text-white">${p.monthlyRevenue.toLocaleString()}</td>
                    <td className="py-3 text-right text-sm text-emerald-400">${p.monthlyProfit.toLocaleString()}</td>
                    <td className="py-3 text-right text-sm text-white">{p.occupancy}%</td>
                    <td className="py-3 text-center">
                      {p.trend === "up" && <TrendingUp size={16} className="inline text-emerald-400" />}
                      {p.trend === "down" && <TrendingDown size={16} className="inline text-red-400" />}
                      {p.trend === "stable" && <span className="text-white/40">—</span>}
                    </td>
                    <td className="py-3 text-center">
                      {p.alert ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                          <AlertCircle size={14} /> {p.alert}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400">On Track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TH({ text, right, center }:{ text:string; right?:boolean; center?:boolean }) {
  return <th className={`pb-3 text-xs font-medium text-white/60 ${right?'text-right':''} ${center?'text-center':'text-left'}`}>{text}</th>;
}
function MetricCard({ icon, label, value, change }:{
  icon:React.ReactNode; label:string; value:string; change?:number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-emerald-400">{icon}</div>
        <span className="text-xs font-medium text-white/60">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {typeof change === "number" && (
        <div className={`text-xs flex items-center gap-1 ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

4) Optional Enhancements

Realtime: subscribe to portfolio_kpis_monthly via Supabase Realtime and refresh the table/metrics when inserts land.

Benchmarks: join market_snapshots by property ZIP to display “± vs market” badges.

Stages: wire stages from properties.status (prospect/negotiation/live) or your portfolio_properties.stage table.

Alerts: enrich logic (e.g., “Net < $X”, “Occ drop > 10% vs last 2 months”).

Tier gates: hide “Export” for non-Premium and cap properties in Beta/Pro.

🧩 Next Build Steps (seamless with your system)
1. Backend integration

 Create Supabase tables:

properties

portfolio_kpis_monthly

(optional) portfolio_properties for stage management

 Deploy SQL migrations and enable RLS policies (copy directly from my schema above).

 Add rpc.upsert_portfolio_kpi(property_id, month, gross_rev, expenses, net_profit, occ_rate) to update metrics from the Revenue Estimator → ROI → Portfolio flow.

 Seed mock KPI data to confirm dashboard rendering.

2. API layer

 Drop the 3 new API routes (summary, properties, export) under /src/app/api/portfolio/…

 Validate they return proper metrics and compare values with your mock dataset.

 Connect these APIs with the frontend hooks (fetch('/api/portfolio/...')) you already have in the new page.

3. Frontend integration

 Replace mock data with live API data (already set via loadAll() in PortfolioClient).

 Wire "Save to Portfolio" buttons from the ROI or Estimator results to call:

await fetch('/api/portfolio/properties', { method: 'POST', body: JSON.stringify({ propertyId, stage:'saved' }) })


 (Optional) Implement chart component (Recharts) for sparkline profit trends.

4. Tier logic
Tier	Access	Data Cap	Extra
Beta	Read-only demo	3 properties max	No export
Pro	Full dashboard	25 properties	Manual refresh
Premium	Full + Realtime	Unlimited	Export CSV + Alerts

You’ll add a quick helper in /src/lib/tier.ts:

export function canExportCSV(tier:'beta'|'pro'|'premium'){ return tier==='premium'; }

5. Optional extensions

Integrate Realtime KPIs from Supabase for live updates.

Add Benchmarks (join by zip against market_snapshots → show “↑ vs market ADR/Occ” badges).

Add Geospatial View (map markers sized by profit).

Add Weekly digest email (“Your portfolio netted +8.3% last 30 days 🚀”).
