1) Database (Supabase SQL)
-- 10_roi_analyses.sql
create table if not exists public.roi_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  estimate_id uuid references public.revenue_estimates(id) on delete set null,

  inputs jsonb not null,               -- raw form payload
  scenarios jsonb,                     -- list of scenario overrides
  coc numeric not null,                -- cash-on-cash %
  payback_months numeric not null,
  annual_roi numeric not null,
  five_year_profit numeric not null,
  sensitivity jsonb,                   -- table of +/- ADR/OCC/RENT variants
  created_at timestamptz default now()
);
create index if not exists idx_roi_user on public.roi_analyses(user_id);
create index if not exists idx_roi_estimate on public.roi_analyses(estimate_id);

alter table public.roi_analyses enable row level security;

create policy "roi owner can read/write"
  on public.roi_analyses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

2) Types & Validation

/src/types/roi.ts

export interface RoiFormInput {
  estimateId?: string | null;
  propertyId?: string | null;

  initialCosts: {
    furniture: number;
    deposit: number;
    setupMisc?: number;
  };

  lease: {
    monthlyRent: number;
    termMonths: number; // 6-36 typical
  };

  ops: {
    utilitiesMonthly?: number;   // if not inherited
    mgmtPct?: number;            // 0..1
    platformPct?: number;        // 0..1
    cleaningPerTurn?: number;    // $
    turnsPerMonth?: number;      // override
  };

  revenueAssumptions: {
    adr: number;
    occ: number;                 // 0..1
    seasonalityIndex?: number;   // 0.8..1.2
    mode?: 'STR' | 'MTR' | 'HYBRID';
  };

  scenarios?: Array<Partial<{
    name: string;
    adr: number;
    occ: number;
    monthlyRent: number;
  }>>;
}

export interface RoiResult {
  roiId: string;
  cocPct: number;
  paybackMonths: number;
  annualRoiPct: number;
  fiveYearProfit: number;
  scenarioTable: Array<{ name: string; cocPct: number; annualRoiPct: number }>;
}


/src/lib/validation/roi.ts

import { z } from "zod";

export const roiSchema = z.object({
  estimateId: z.string().uuid().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
  initialCosts: z.object({
    furniture: z.number().nonnegative(),
    deposit: z.number().nonnegative(),
    setupMisc: z.number().nonnegative().optional()
  }),
  lease: z.object({
    monthlyRent: z.number().nonnegative(),
    termMonths: z.number().int().min(1)
  }),
  ops: z.object({
    utilitiesMonthly: z.number().nonnegative().optional(),
    mgmtPct: z.number().min(0).max(1).optional(),
    platformPct: z.number().min(0).max(1).optional(),
    cleaningPerTurn: z.number().nonnegative().optional(),
    turnsPerMonth: z.number().nonnegative().optional()
  }),
  revenueAssumptions: z.object({
    adr: z.number().positive(),
    occ: z.number().min(0).max(1),
    seasonalityIndex: z.number().min(0.5).max(1.5).optional(),
    mode: z.enum(['STR','MTR','HYBRID']).optional()
  }),
  scenarios: z.array(z.object({
    name: z.string().default("Scenario"),
    adr: z.number().positive().optional(),
    occ: z.number().min(0).max(1).optional(),
    monthlyRent: z.number().nonnegative().optional()
  })).optional()
});
export type RoiPayload = z.infer<typeof roiSchema>;

3) Prefill from Estimator (server helper)

/src/lib/prefillFromEstimate.ts

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function getEstimatorPrefill(estimateId?: string | null) {
  if (!estimateId) return null;
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("revenue_estimates")
    .select("id, property_id, inputs, assumptions, gross_rev, expenses, net_profit")
    .eq("id", estimateId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  const p = data.inputs as any;
  const a = data.assumptions as any;

  // sensible fallbacks
  const adr = p?.assumptions?.adr ?? a?.adr ?? 140;
  const occ = p?.assumptions?.occ ?? a?.occ ?? 0.7;
  const seasonalityIndex = p?.assumptions?.seasonalityIndex ?? a?.seasonalityIndex ?? 1.0;
  const monthlyRent = p?.lease?.monthlyRent ?? 2000;

  const ops = {
    utilitiesMonthly: p?.ops?.utilitiesMonthly ?? 250,
    mgmtPct: p?.ops?.mgmtPct ?? 0,
    platformPct: p?.ops?.platformPct ?? 0.14,
    cleaningPerTurn: p?.ops?.cleaningPerTurn ?? 70
  };

  return {
    propertyId: data.property_id,
    revenueAssumptions: { adr, occ, seasonalityIndex, mode: p?.assumptions?.mode ?? 'STR' },
    lease: { monthlyRent, termMonths: 12 },
    ops
  };
}

4) ROI Service (math, scenarios, sensitivity)

/src/lib/roi.ts

import type { RoiPayload } from "@/lib/validation/roi";

type BaseResult = {
  netMonthly: number;
  cocPct: number;
  paybackMonths: number;
  annualRoiPct: number;
  fiveYearProfit: number;
};

export function computeRoi(p: RoiPayload): BaseResult {
  const days = 30;
  const adr = p.revenueAssumptions.adr;
  const occ = p.revenueAssumptions.occ;
  const seasonality = p.revenueAssumptions.seasonalityIndex ?? 1.0;
  const gross = adr * occ * days * seasonality;

  const turns = p.ops.turnsPerMonth ?? Math.max(4, Math.round(occ * days / 7));
  const cleaning = (p.ops.cleaningPerTurn ?? 70) * turns;
  const utilities = p.ops.utilitiesMonthly ?? 250;
  const platform = (p.ops.platformPct ?? 0.14) * gross;
  const mgmt = (p.ops.mgmtPct ?? 0) * gross;

  const rent = p.lease.monthlyRent;
  const ops = cleaning + utilities + platform + mgmt;
  const net = gross - rent - ops;

  const cap = (p.initialCosts.furniture || 0) + (p.initialCosts.deposit || 0) + (p.initialCosts.setupMisc || 0);
  const annualNet = net * 12;
  const coc = cap > 0 ? (annualNet / cap) : 0;
  const payback = net > 0 ? (cap / net) : Infinity;
  const annualRoi = cap > 0 ? (annualNet / cap) : 0;
  // naive 5-year (no discount): consider churn/upgrades later
  const fiveYearProfit = annualNet * 5;

  return {
    netMonthly: net,
    cocPct: coc * 100,
    paybackMonths: payback,
    annualRoiPct: annualRoi * 100,
    fiveYearProfit
  };
}

export function runScenarios(p: RoiPayload) {
  const base = computeRoi(p);
  const table = [{ name: "Base", cocPct: base.cocPct, annualRoiPct: base.annualRoiPct }];

  (p.scenarios ?? []).forEach(s => {
    const variant: RoiPayload = {
      ...p,
      lease: { ...p.lease, monthlyRent: s.monthlyRent ?? p.lease.monthlyRent },
      revenueAssumptions: {
        ...p.revenueAssumptions,
        adr: s.adr ?? p.revenueAssumptions.adr,
        occ: s.occ ?? p.revenueAssumptions.occ
      }
    };
    const r = computeRoi(variant);
    table.push({ name: s.name ?? "Scenario", cocPct: r.cocPct, annualRoiPct: r.annualRoiPct });
  });

  return { base, table };
}

// quick sensitivity grid for UI (+/- % on ADR & OCC)
export function sensitivityGrid(p: RoiPayload, steps = [-0.1, -0.05, 0, 0.05, 0.1]) {
  return steps.map(dAdr => {
    return steps.map(dOcc => {
      const v: RoiPayload = {
        ...p,
        revenueAssumptions: {
          ...p.revenueAssumptions,
          adr: p.revenueAssumptions.adr * (1 + dAdr),
          occ: Math.min(1, Math.max(0, p.revenueAssumptions.occ * (1 + dOcc)))
        }
      };
      const r = computeRoi(v);
      return { dAdr, dOcc, cocPct: r.cocPct, annualRoiPct: r.annualRoiPct };
    });
  });
}

5) API Routes
POST /api/roi — Create ROI analysis (prefill supported)

/src/app/api/roi/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { roiSchema } from "@/lib/validation/roi";
import { runScenarios, sensitivityGrid } from "@/lib/roi";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = roiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const payload = parsed.data;

  const { base, table } = runScenarios(payload);
  const sensitivity = sensitivityGrid(payload);

  const insert = {
    user_id: user.id,
    property_id: payload.propertyId ?? null,
    estimate_id: payload.estimateId ?? null,
    inputs: payload,
    scenarios: payload.scenarios ?? null,
    coc: base.cocPct,
    payback_months: base.paybackMonths,
    annual_roi: base.annualRoiPct,
    five_year_profit: base.fiveYearProfit,
    sensitivity
  };

  const { data, error } = await supabase.from("roi_analyses").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    roiId: data.id,
    cocPct: base.cocPct,
    paybackMonths: base.paybackMonths,
    annualRoiPct: base.annualRoiPct,
    fiveYearProfit: base.fiveYearProfit,
    scenarioTable: table
  });
}

GET /api/roi/:id — Fetch ROI analysis

/src/app/api/roi/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("roi_analyses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

6) Minimal UI
Page: /roi/new?estimateId={uuid}

/src/app/(app)/roi/new/page.tsx (server component + client child)

import RoiClient from "./RoiClient";
import { getEstimatorPrefill } from "@/lib/prefillFromEstimate";

export default async function RoiNewPage({ searchParams }: { searchParams: { estimateId?: string } }) {
  const prefill = await getEstimatorPrefill(searchParams.estimateId ?? null);
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">ROI Calculator</h1>
      <RoiClient prefill={prefill} estimateId={searchParams.estimateId ?? null} />
    </div>
  );
}


/src/app/(app)/roi/new/RoiClient.tsx

"use client";
import { useState } from "react";

export default function RoiClient({ prefill, estimateId }:{ prefill:any; estimateId?: string|null }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    estimateId: estimateId ?? null,
    propertyId: prefill?.propertyId ?? null,
    initialCosts: { furniture: 7000, deposit: 2000, setupMisc: 800 },
    lease: { monthlyRent: prefill?.lease?.monthlyRent ?? 2000, termMonths: 12 },
    ops: {
      utilitiesMonthly: prefill?.ops?.utilitiesMonthly ?? 250,
      mgmtPct: prefill?.ops?.mgmtPct ?? 0,
      platformPct: prefill?.ops?.platformPct ?? 0.14,
      cleaningPerTurn: prefill?.ops?.cleaningPerTurn ?? 70
    },
    revenueAssumptions: {
      adr: prefill?.revenueAssumptions?.adr ?? 150,
      occ: prefill?.revenueAssumptions?.occ ?? 0.7,
      seasonalityIndex: prefill?.revenueAssumptions?.seasonalityIndex ?? 1.0,
      mode: prefill?.revenueAssumptions?.mode ?? "STR"
    },
    scenarios: [
      { name: "Conservative", adr: undefined, occ: 0.65, monthlyRent: undefined },
      { name: "Aggressive", adr: undefined, occ: 0.8, monthlyRent: undefined }
    ]
  });

  const [result, setResult] = useState<any>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/roi", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    setResult(data);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly Rent" value={form.lease.monthlyRent}
                 onChange={(v)=>setForm(f=>({...f, lease:{...f.lease, monthlyRent: +v}}))}/>
          <Field label="Furniture" value={form.initialCosts.furniture}
                 onChange={(v)=>setForm(f=>({...f, initialCosts:{...f.initialCosts, furniture:+v}}))}/>
          <Field label="Deposit" value={form.initialCosts.deposit}
                 onChange={(v)=>setForm(f=>({...f, initialCosts:{...f.initialCosts, deposit:+v}}))}/>
          <Field label="Setup Misc" value={form.initialCosts.setupMisc}
                 onChange={(v)=>setForm(f=>({...f, initialCosts:{...f.initialCosts, setupMisc:+v}}))}/>
          <Field label="ADR" value={form.revenueAssumptions.adr}
                 onChange={(v)=>setForm(f=>({...f, revenueAssumptions:{...f.revenueAssumptions, adr:+v}}))}/>
          <Field label="Occupancy (0-1)" value={form.revenueAssumptions.occ}
                 onChange={(v)=>setForm(f=>({...f, revenueAssumptions:{...f.revenueAssumptions, occ:+v}}))}/>
        </div>
        <button disabled={loading} className="w-full rounded-lg bg-teal-500/90 hover:bg-teal-400 py-2 font-semibold">
          {loading ? "Calculating..." : "Run ROI"}
        </button>
      </form>

      {result && <RoiResultCard data={result} />}
    </div>
  );
}

function Field({ label, value, onChange }:{ label:string; value:any; onChange:(v:string)=>void }) {
  return (
    <label className="flex flex-col text-sm">
      {label}
      <input value={value} onChange={e=>onChange(e.target.value)}
             className="mt-1 rounded bg-slate-800 px-3 py-2" />
    </label>
  );
}

function RoiResultCard({ data }:{ data:any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="text-lg font-semibold">ROI Summary</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Metric label="CoC Return" value={`${data.cocPct?.toFixed(1)}%`} />
        <Metric label="Payback" value={`${data.paybackMonths?.toFixed(1)} mo`} />
        <Metric label="Annual ROI" value={`${data.annualRoiPct?.toFixed(1)}%`} />
        <Metric label="5-Year Profit" value={`$${data.fiveYearProfit?.toFixed(0)}`} />
      </div>
      {Array.isArray(data.scenarioTable) && (
        <div className="text-sm">
          <div className="font-medium mb-1">Scenarios</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {data.scenarioTable.map((s:any, i:number)=>(
              <div key={i} className="rounded bg-slate-800/70 p-3">
                <div className="text-slate-400 text-xs">{s.name}</div>
                <div>CoC: {s.cocPct.toFixed(1)}%</div>
                <div>Annual ROI: {s.annualRoiPct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
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

7) Notes & Wiring

Prefill path: from Estimator result, your CTA already links to /roi/new?estimateId=.... The page fetches defaults via getEstimatorPrefill.

Tier gates:

Beta: render ROI page with read-only demo (hide submit).

Pro: enable submit + 2 scenarios.

Premium: show “Export CSV” + more scenarios (UI toggle).

Validation: ROI API uses Zod schema; adjust ranges as you finalize formulas.

Portfolio integration: after ROI creation, add a CTA to “Save to Portfolio” (POST to /api/portfolio/properties) and/or auto-write a KPI baseline row.
