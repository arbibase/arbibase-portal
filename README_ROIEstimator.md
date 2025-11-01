1) Database (Supabase SQL)

Create these tables first.

-- 01_properties.sql
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  address text,
  city text,
  state text,
  zip text,
  type text,             -- apartment|sfh|duplex|townhome...
  beds int,
  baths int,
  sqft int,
  status text default 'prospect', -- prospect|negotiation|live|archived
  created_at timestamptz default now()
);

-- 02_market_snapshots.sql  (zip-level snapshot; extend as needed)
create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  geo_key text not null,                 -- e.g. "75204"
  adr numeric,                           -- avg daily rate
  occ numeric,                           -- 0..1
  lt_rent numeric,                       -- avg long-term rent
  seasonality_index numeric default 1.0, -- 0.8..1.2
  risk_score numeric default 5.0,        -- 0..10 from Library
  as_of date not null default current_date
);
create index if not exists idx_market_geo on public.market_snapshots(geo_key);

-- 03_revenue_estimates.sql
create table if not exists public.revenue_estimates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,

  mode text not null default 'STR',  -- STR|MTR|HYBRID
  inputs jsonb not null,             -- raw request
  assumptions jsonb,                 -- derived defaults (market pull)
  gross_rev numeric not null,
  expenses numeric not null,
  net_profit numeric not null,
  break_even_occ numeric not null,   -- 0..1
  viability_score int not null,      -- 0..100

  created_at timestamptz default now()
);
create index if not exists idx_estimates_user on public.revenue_estimates(user_id);

-- 04_portfolio_properties.sql (used when user clicks "Save to Portfolio")
create table if not exists public.portfolio_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  stage text default 'saved', -- saved|verified|live
  created_at timestamptz default now()
);
create index if not exists idx_portfolio_user on public.portfolio_properties(user_id);

-- Row Level Security (RLS)
alter table public.properties enable row level security;
alter table public.revenue_estimates enable row level security;
alter table public.portfolio_properties enable row level security;

create policy "properties owner can read/write"
  on public.properties for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "estimates owner can read/write"
  on public.revenue_estimates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "portfolio owner can read/write"
  on public.portfolio_properties for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

2) Types & Validation

/src/types/estimator.ts

export type EstimatorMode = 'STR' | 'MTR' | 'HYBRID';

export interface EstimatorInput {
  propertyId?: string | null;
  location: { city: string; state: string; zip: string };
  home: { type: string; beds: number; baths: number; sqft?: number | null };
  lease: { monthlyRent: number; termMonths?: number | null };
  ops: { cleaningPerTurn?: number; utilitiesMonthly?: number; mgmtPct?: number; platformPct?: number };
  assumptions?: { adr?: number; occ?: number; seasonalityIndex?: number; mode?: EstimatorMode };
}

export interface EstimatorResult {
  estimateId: string;
  propertyId?: string | null;
  grossMonthlyRevenue: number;
  operatingExpenses: number;
  netMonthlyProfit: number;
  breakEvenOccPct: number; // 0..1
  viabilityScore: number;  // 0..100
  warnings: string[];
}


/src/lib/validation/estimator.ts

import { z } from "zod";

export const estimatorSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  location: z.object({ city: z.string(), state: z.string().length(2), zip: z.string().min(3).max(10) }),
  home: z.object({
    type: z.string(),
    beds: z.number().int().min(0),
    baths: z.number().min(0),
    sqft: z.number().int().positive().optional().nullable()
  }),
  lease: z.object({ monthlyRent: z.number().nonnegative(), termMonths: z.number().int().positive().optional().nullable() }),
  ops: z.object({
    cleaningPerTurn: z.number().nonnegative().optional(),
    utilitiesMonthly: z.number().nonnegative().optional(),
    mgmtPct: z.number().min(0).max(1).optional(),
    platformPct: z.number().min(0).max(1).optional()
  }),
  assumptions: z.object({
    adr: z.number().positive().optional(),
    occ: z.number().min(0).max(1).optional(),
    seasonalityIndex: z.number().min(0.5).max(1.5).optional(),
    mode: z.enum(['STR','MTR','HYBRID']).optional()
  }).optional()
});
export type EstimatorPayload = z.infer<typeof estimatorSchema>;

3) Tier Gating Helper

/src/lib/tier.ts

export type Tier = 'beta' | 'pro' | 'premium';

export function canUseAdvancedInputs(tier: Tier) {
  return tier === 'pro' || tier === 'premium';
}
export function canUseBatchEstimator(tier: Tier) {
  return tier === 'premium';
}

4) Supabase Client (Server-side)

/src/lib/supabaseServer.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); }
      }
    }
  );
}

5) Estimator Service (pure logic + market defaults)

/src/lib/estimator.ts

import type { EstimatorPayload } from "@/lib/validation/estimator";

type MarketDefaults = { adr: number; occ: number; seasonalityIndex: number; riskScore?: number; };

export function deriveDefaults(zip: string, snapshot?: MarketDefaults): MarketDefaults {
  // Fallbacks if no market data exists yet
  return {
    adr: snapshot?.adr ?? 140,
    occ: snapshot?.occ ?? 0.68,
    seasonalityIndex: snapshot?.seasonalityIndex ?? 1.0,
    riskScore: snapshot?.riskScore ?? 5
  };
}

export function computeEstimate(p: EstimatorPayload, market: MarketDefaults) {
  const adr = p.assumptions?.adr ?? market.adr;
  const occ = p.assumptions?.occ ?? market.occ;
  const seasonality = p.assumptions?.seasonalityIndex ?? market.seasonalityIndex;
  const mode = p.assumptions?.mode ?? 'STR';

  const days = 30;
  const gross = adr * occ * days * seasonality;

  const cleaningTurns = mode === 'MTR' ? 1 : Math.max(4, Math.round(occ * days / 7)); // rough turns/month
  const cleaningPerTurn = p.ops.cleaningPerTurn ?? 70;
  const cleaning = cleaningTurns * cleaningPerTurn;

  const utilities = p.ops.utilitiesMonthly ?? 250;
  const platform = (p.ops.platformPct ?? (mode === 'MTR' ? 0.06 : 0.14)) * gross;
  const mgmt = (p.ops.mgmtPct ?? 0) * gross;

  const rent = p.lease.monthlyRent;
  const ops = cleaning + utilities + platform + mgmt;
  const net = gross - rent - ops;

  const breakEvenOcc = Math.min(1, Math.max(0, (rent + (utilities + cleaning)) / (adr * days))); // fixed-ish
  // Viability score: weight net, margin, and break-even (lower is better)
  const margin = gross > 0 ? net / gross : -1;
  const viability = Math.round(
    clamp( ( (normalize(net, -1000, 4000) * 0.45)
           + (normalize(1 - breakEvenOcc, 0, 1) * 0.35)
           + (normalize(margin, -0.2, 0.4) * 0.20) ) * 100, 0, 100)
  );

  const warnings: string[] = [];
  if (breakEvenOcc > 0.75) warnings.push("High break-even occupancy.");
  if (margin < 0.1) warnings.push("Low profit margin.");
  return { gross, ops, net, breakEvenOcc, viability, warnings };
}

function clamp(v:number,min:number,max:number){ return Math.max(min, Math.min(max, v)); }
function normalize(v:number, min:number, max:number){ const n=(v-min)/(max-min); return clamp(n,0,1); }

6) API Routes (App Router)

/src/app/api/estimates/route.ts (POST create)

import { NextRequest, NextResponse } from "next/server";
import { estimatorSchema } from "@/lib/validation/estimator";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { computeEstimate, deriveDefaults } from "@/lib/estimator";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = estimatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const payload = parsed.data;

  // Fetch market defaults by ZIP
  const { data: snap } = await supabase
    .from("market_snapshots")
    .select("adr, occ, seasonality_index, risk_score")
    .eq("geo_key", payload.location.zip)
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = computeEstimate(payload, deriveDefaults(payload.location.zip, {
    adr: snap?.adr ?? undefined,
    occ: snap?.occ ?? undefined,
    seasonalityIndex: snap?.seasonality_index ?? undefined,
    riskScore: snap?.risk_score ?? undefined
  }));

  // persist estimate row
  const insert = {
    property_id: payload.propertyId ?? null,
    user_id: user.id,
    mode: payload.assumptions?.mode ?? 'STR',
    inputs: payload,
    assumptions: { adr: snap?.adr, occ: snap?.occ, seasonalityIndex: snap?.seasonality_index },
    gross_rev: result.gross,
    expenses: result.ops,
    net_profit: result.net,
    break_even_occ: result.breakEvenOcc,
    viability_score: result.viability
  };

  const { data, error } = await supabase.from("revenue_estimates").insert(insert).select("id, property_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    estimateId: data.id,
    propertyId: data.property_id,
    grossMonthlyRevenue: result.gross,
    operatingExpenses: result.ops,
    netMonthlyProfit: result.net,
    breakEvenOccPct: result.breakEvenOcc,
    viabilityScore: result.viability,
    warnings: result.warnings
  });
}


/src/app/api/estimates/[id]/route.ts (GET by id)

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("revenue_estimates")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

7) Minimal UI (React / Tailwind)

/src/components/estimator/EstimatorForm.tsx

"use client";
import { useState } from "react";

const number = (v:string)=> Number.isNaN(parseFloat(v)) ? 0 : parseFloat(v);

export default function EstimatorForm({ onComplete }:{ onComplete:(res:any)=>void }) {
  const [loading, setLoading] = useState(false);
  const [zip, setZip] = useState("");
  const [rent, setRent] = useState("");
  const [adr, setAdr] = useState("");
  const [occ, setOcc] = useState("0.70");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      location: { city: "", state: "TX", zip },
      home: { type: "apartment", beds: 2, baths: 2 },
      lease: { monthlyRent: number(rent) },
      ops: { utilitiesMonthly: 250, mgmtPct: 0, platformPct: 0.14, cleaningPerTurn: 70 },
      assumptions: { adr: number(adr) || undefined, occ: Number(occ) }
    };
    const res = await fetch("/api/estimates", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    onComplete(data);
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">ZIP
          <input value={zip} onChange={e=>setZip(e.target.value)} className="mt-1 rounded bg-slate-800 px-3 py-2" required />
        </label>
        <label className="flex flex-col text-sm">Monthly Rent
          <input value={rent} onChange={e=>setRent(e.target.value)} className="mt-1 rounded bg-slate-800 px-3 py-2" required />
        </label>
        <label className="flex flex-col text-sm">ADR (optional)
          <input value={adr} onChange={e=>setAdr(e.target.value)} className="mt-1 rounded bg-slate-800 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">Occupancy (0-1)
          <input value={occ} onChange={e=>setOcc(e.target.value)} className="mt-1 rounded bg-slate-800 px-3 py-2" />
        </label>
      </div>
      <button disabled={loading} className="w-full rounded-lg bg-teal-500/90 hover:bg-teal-400 py-2 font-semibold">
        {loading ? "Calculating..." : "Estimate"}
      </button>
    </form>
  );
}


/src/components/estimator/EstimatorResult.tsx

export default function EstimatorResult({ data }:{ data: any }) {
  if (!data) return null;
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-lg font-semibold">Estimate Summary</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Metric label="Gross Revenue"  value={`$${data.grossMonthlyRevenue?.toFixed(0)}`} />
        <Metric label="Operating Expenses" value={`$${data.operatingExpenses?.toFixed(0)}`} />
        <Metric label="Net Profit" value={`$${data.netMonthlyProfit?.toFixed(0)}`} />
        <Metric label="Break-even Occ." value={`${(data.breakEvenOccPct*100).toFixed(1)}%`} />
      </div>
      <div className="text-sm">
        <span className="font-medium">Viability Score:</span> {data.viabilityScore}/100
      </div>
      {Array.isArray(data.warnings) && data.warnings.length > 0 && (
        <ul className="text-amber-300 text-sm list-disc ml-5">
          {data.warnings.map((w:string)=> <li key={w}>{w}</li>)}
        </ul>
      )}
      <div className="flex gap-2">
        <a href={`/roi/new?estimateId=${data.estimateId}`} className="rounded bg-sky-600 px-3 py-2 text-sm">Deep ROI</a>
        <form action="/api/portfolio/properties" method="post">
          {/* implement save-to-portfolio later; pass propertyId or estimateId */}
          <button className="rounded bg-teal-600 px-3 py-2 text-sm">Save to Portfolio</button>
        </form>
      </div>
    </div>
  );
}

function Metric({label, value}:{label:string; value:string}) {
  return (
    <div className="rounded-lg bg-slate-800/70 p-3">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}


/src/app/(app)/estimator/page.tsx

"use client";
import { useState } from "react";
import EstimatorForm from "@/components/estimator/EstimatorForm";
import EstimatorResult from "@/components/estimator/EstimatorResult";

export default function EstimatorPage() {
  const [result, setResult] = useState<any>(null);
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Revenue Estimator</h1>
      <EstimatorForm onComplete={setResult} />
      <EstimatorResult data={result} />
    </div>
  );
}

8) ENV & Notes

.env.local (example)

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...


Notes

Tier gating: you likely store user tier in profiles or users metadata; add middleware or server check to limit advanced inputs (already scaffolded with tier.ts).

Caching: introduce Redis later; cache by zip|beds|type|rent|assumptions_hash.

Validation: use the Zod schema; the API already rejects invalid payloads.

Tests: add unit tests for computeEstimate() with fixed inputs to ensure deterministic math.
