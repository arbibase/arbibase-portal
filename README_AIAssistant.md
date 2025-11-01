0) What it does (at a glance)

Drafts owner-ready messages/offers inside the chat.

Pulls context from thread, property, ROI, and Library (clauses).

Supports playbooks (offer types) with structured inputs.

Respects tiers:

Beta: 3 basic drafts/day, 1 playbook (Straight Rent).

Pro: 20 drafts/day, 5 playbooks, tone control.

Premium: Unlimited, all playbooks, attach addendum clauses + counters, auto-summaries.

1) DB: job log (reuseable across AI tools)
-- 60_ai_jobs.sql
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,              -- 'negotiation'
  input jsonb not null,
  output jsonb,
  status text default 'succeeded', -- 'succeeded' | 'failed'
  latency_ms int,
  created_at timestamptz default now()
);

alter table public.ai_jobs enable row level security;
create policy "ai jobs owner r" on public.ai_jobs for select using (auth.uid() = user_id);
create policy "ai jobs owner w" on public.ai_jobs for insert with check (auth.uid() = user_id);

2) Types & validation
// src/types/negotiation.ts
export type PlaybookType =
  | 'straight_rent'         // fixed rent, concessions optional
  | 'rent_discount'         // lower base rent + longer term
  | 'revenue_share'         // base + % of STR/MTR revenue
  | 'master_lease'          // fully managed; operator pays
  | 'trial_period'          // 60–90 day pilot
  | 'repairs_for_concession'// capex swap for rent credit
  | 'corporate_rental'      // mid-term furnished B2B
  ;

export interface NegotiationInput {
  threadId: string;
  playbook: PlaybookType;
  tone?: 'professional' | 'friendly' | 'data_driven' | 'concise';
  constraints?: { maxRent?: number; termMonths?: number; minDiscountPct?: number; revSharePct?: number };
  includeClauses?: string[];  // clause IDs from Library
  attachRoi?: boolean;        // include ROI summary table
  attachSummary?: boolean;    // TL;DR at top
}

export interface NegotiationOutput {
  draft: string;              // owner-facing message text
  bullets?: string[];         // key terms
  counters?: string[];        // if owner asks X → say Y
  includedClauses?: Array<{id:string; title:string}>;
}

// src/lib/validation/negotiation.ts
import { z } from "zod";

export const negotiationSchema = z.object({
  threadId: z.string().uuid(),
  playbook: z.enum([
    'straight_rent','rent_discount','revenue_share','master_lease',
    'trial_period','repairs_for_concession','corporate_rental'
  ]),
  tone: z.enum(['professional','friendly','data_driven','concise']).optional(),
  constraints: z.object({
    maxRent: z.number().positive().optional(),
    termMonths: z.number().int().positive().optional(),
    minDiscountPct: z.number().min(0).max(0.5).optional(),
    revSharePct: z.number().min(0.05).max(0.6).optional()
  }).optional(),
  includeClauses: z.array(z.string().uuid()).optional(),
  attachRoi: z.boolean().optional(),
  attachSummary: z.boolean().optional()
});
export type NegotiationPayload = z.infer<typeof negotiationSchema>;

3) Tier gating helper
// src/lib/tier.ts
export type Tier = 'beta'|'pro'|'premium';

export function negotiationLimits(tier: Tier) {
  if (tier === 'beta')   return { draftsPerDay: 3, playbooks: ['straight_rent'] as const, tone: false, clauses: false, attachRoi: false };
  if (tier === 'pro')    return { draftsPerDay: 20, playbooks: ['straight_rent','rent_discount','trial_period','corporate_rental','repairs_for_concession'] as const, tone: true, clauses: true, attachRoi: true };
  return                  { draftsPerDay: Infinity, playbooks: ['straight_rent','rent_discount','revenue_share','master_lease','trial_period','repairs_for_concession','corporate_rental'] as const, tone: true, clauses: true, attachRoi: true };
}


(Store user tier in profiles.tier or JWT claims.)

4) Context loaders (thread, property, ROI, clauses)
// src/lib/negotiation/context.ts
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function loadThreadContext(threadId: string) {
  const sb = getSupabaseServer();
  const { data: thread } = await sb.from("messaging_threads")
    .select("id, subject, property_id, operator_id, owner_id")
    .eq("id", threadId).single();
  if (!thread) return null;

  const { data: property } = await sb.from("properties")
    .select("id, address, city, state, zip, type, beds, baths, sqft, status")
    .eq("id", thread.property_id!).maybeSingle();

  const { data: roi } = await sb.from("roi_analyses")
    .select("id, coc, annual_roi, payback_months, inputs")
    .eq("property_id", thread.property_id!)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  return { thread, property, roi };
}

export async function loadClauses(ids: string[]) {
  if (!ids?.length) return [];
  const sb = getSupabaseServer();
  const { data } = await sb.from("library_clauses")
    .select("id, title, body_md")
    .in("id", ids);
  return data || [];
}

5) Prompt builder & model call (server-side)

You can wire to your preferred model provider; below keeps it abstracted.

// src/lib/negotiation/prompt.ts
import type { NegotiationPayload } from "@/lib/validation/negotiation";

export function makeSystemPrompt(tier: 'beta'|'pro'|'premium') {
  return [
    "You are ArbiBase’s Negotiation Assistant.",
    "Goal: draft owner-facing messages that are compliant, concise, and persuasive.",
    "NEVER promise illegal STR/MTR activity. Respect local restrictions.",
    "If outlook is negative, recommend an alternative (e.g., corporate rental, longer term, revenue-share).",
    `Tier: ${tier}. Keep drafts <= 220 words unless Premium.`
  ].join("\n");
}

export function makeUserPrompt(
  payload: NegotiationPayload,
  ctx: { thread?: any; property?: any; roi?: any; clauses?: Array<{id:string,title:string,body_md:string}> }
) {
  const p = ctx.property;
  const r = ctx.roi;
  const lines: string[] = [];

  lines.push(`Playbook: ${payload.playbook}`);
  lines.push(`Tone: ${payload.tone ?? 'professional'}`);
  if (payload.constraints) lines.push(`Constraints: ${JSON.stringify(payload.constraints)}`);

  if (p) lines.push(`Property: ${p.address}, ${p.city}, ${p.state} ${p.zip} • ${p.type} ${p.beds}bd/${p.baths}ba`);
  if (r) lines.push(`ROI Summary: CoC ${r.coc?.toFixed?.(1)}%, Annual ROI ${r.annual_roi?.toFixed?.(1)}%, Payback ${r.payback_months?.toFixed?.(1)} mo`);

  if (payload.includeClauses && ctx.clauses?.length) {
    lines.push(`Clauses to mention (high-level, not full text): ${ctx.clauses.map(c=>c.title).join("; ")}`);
  }

  lines.push("Write a concise message the OPERATOR can send to the OWNER:");
  lines.push("- Open with value, not demands.");
  lines.push("- Clearly list key terms (rent, term, guarantees, concessions).");
  lines.push("- Close with a simple CTA to confirm or counter.");
  lines.push("- If 'attachRoi' true, reference 'attached financial summary'.");
  lines.push("- If 'attachSummary' true, include a 2–3 bullet TL;DR at top.");

  return lines.join("\n");
}

// src/lib/negotiation/model.ts
export async function runModel(system: string, user: string) {
  // Replace with your LLM call (OpenAI, Azure, etc.)
  // Return plain text for the draft.
  // Here, just a placeholder:
  const draft = `[DRAFT MESSAGE]\n${user}\n\n— end —`;
  return draft;
}

6) API Route
// src/app/api/ai/negotiation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { negotiationSchema } from "@/lib/validation/negotiation";
import { negotiationLimits } from "@/lib/tier";
import { loadThreadContext, loadClauses } from "@/lib/negotiation/context";
import { makeSystemPrompt, makeUserPrompt } from "@/lib/negotiation/prompt";
import { runModel } from "@/lib/negotiation/model";

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // resolve user tier
  const { data: profile } = await sb.from("profiles").select("tier").eq("id", user.id).maybeSingle();
  const tier = (profile?.tier ?? 'beta') as 'beta'|'pro'|'premium';

  const body = await req.json();
  const parsed = negotiationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  const payload = parsed.data;

  // limits
  const limits = negotiationLimits(tier);
  if (!limits.playbooks.includes(payload.playbook as any)) {
    return NextResponse.json({ error: "Playbook not available on your plan." }, { status: 403 });
  }

  // rate limit (simple daily count)
  const { count } = await sb.from("ai_jobs").select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(new Date().toDateString()).toISOString());
  if (count && limits.draftsPerDay !== Infinity && count >= limits.draftsPerDay) {
    return NextResponse.json({ error: "Daily draft limit reached." }, { status: 429 });
  }

  // context
  const ctx = await loadThreadContext(payload.threadId);
  if (!ctx) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  const clauses = payload.includeClauses && limits.clauses ? await loadClauses(payload.includeClauses) : [];

  const system = makeSystemPrompt(tier);
  const userPrompt = makeUserPrompt(payload, { ...ctx, clauses });

  const t0 = Date.now();
  const draft = await runModel(system, userPrompt);
  const latency = Date.now() - t0;

  await sb.from("ai_jobs").insert({
    user_id: user.id, type: 'negotiation',
    input: payload, output: { draft }, latency_ms: latency, status: 'succeeded'
  });

  return NextResponse.json({
    draft,
    bullets: extractBullets(draft),
    counters: suggestCounters(payload.playbook),
    includedClauses: clauses.map(c=>({ id: c.id, title: c.title }))
  });
}

function extractBullets(text:string){
  // naive: pull first bullet list if exists
  const m = text.match(/(^- .+$)/gmi);
  return m?.slice(0,6) ?? [];
}
function suggestCounters(playbook:string){
  switch(playbook){
    case 'rent_discount': return [
      "If owner rejects discount → offer longer term or earlier rent start.",
      "If owner demands higher rent → request 30–60 day free rent for setup."
    ];
    case 'revenue_share': return [
      "Owner asks for higher % → add base rent floor and quarterly true-up.",
      "Owner worries about volatility → add minimum guarantee clause."
    ];
    case 'trial_period': return [
      "Owner wants shorter pilot → offer 45 days with automatic extension on success.",
    ];
    default: return [
      "Owner pushes back → invite a 15-min call to review projected NOI vs LT rent.",
    ];
  }
}

7) Chat UI: add “AI Assist” button
// src/components/chat/AiAssist.tsx
"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

const PLAYBOOKS = [
  { id:'straight_rent', label:'Straight Rent' },
  { id:'rent_discount', label:'Rent Discount' },
  { id:'revenue_share', label:'Revenue Share' },
  { id:'master_lease', label:'Master Lease' },
  { id:'trial_period', label:'Trial Period' },
  { id:'repairs_for_concession', label:'Repairs ⇄ Concession' },
  { id:'corporate_rental', label:'Corporate Rental (MTR)' },
];

export default function AiAssist({ threadId, tier }:{ threadId:string; tier:'beta'|'pro'|'premium' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playbook, setPlaybook] = useState('straight_rent');
  const [tone, setTone] = useState<'professional'|'friendly'|'data_driven'|'concise'>('professional');
  const [attachRoi, setAttachRoi] = useState(tier!=='beta');
  const [attachSummary, setAttachSummary] = useState(tier==='premium');
  const [draft, setDraft] = useState<string>("");

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/ai/negotiation', {
      method: 'POST',
      body: JSON.stringify({ threadId, playbook, tone: tier==='beta'? undefined : tone, attachRoi, attachSummary })
    });
    const json = await res.json();
    setDraft(json.draft || "");
    setLoading(false);
  }

  return (
    <div className="relative">
      <button onClick={()=>setOpen(!open)} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold flex items-center gap-2">
        <Sparkles size={16}/> AI Assist
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[380px] rounded-xl border border-white/10 bg-[#0f172a] p-4 shadow-lg">
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-white/60">Playbook</label>
              <select value={playbook} onChange={e=>setPlaybook(e.target.value)} className="w-full rounded bg-slate-800 px-3 py-2 text-sm">
                {PLAYBOOKS.map(pb => <option key={pb.id} value={pb.id}>{pb.label}</option>)}
              </select>
            </div>
            {tier !== 'beta' && (
              <div>
                <label className="text-xs text-white/60">Tone</label>
                <select value={tone} onChange={e=>setTone(e.target.value as any)} className="w-full rounded bg-slate-800 px-3 py-2 text-sm">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="data_driven">Data-driven</option>
                  <option value="concise">Concise</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={attachRoi} onChange={e=>setAttachRoi(e.target.checked)} /> Attach ROI</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={tier!=='premium'} checked={attachSummary} onChange={e=>setAttachSummary(e.target.checked)} /> TL;DR (Premium)</label>
            </div>
            <button onClick={generate} disabled={loading} className="rounded bg-teal-600 hover:bg-teal-500 py-2 text-sm font-semibold">
              {loading? "Generating…" : "Generate Draft"}
            </button>
            {!!draft && (
              <textarea className="w-full h-40 rounded bg-slate-800 p-3 text-sm" value={draft} readOnly />
            )}
          </div>
        </div>
      )}
    </div>
  );
}


Then place it in your chat header:

// inside ChatPanel header area:
import AiAssist from "@/components/chat/AiAssist";
// ...
<AiAssist threadId={threadId} tier={userTier}/>


(On “Send”, you can paste the draft into the composer or auto-insert.)

8) How it handles the different types & tiers

Playbooks (types)

straight_rent (Beta+): Base rent + term, soft guarantees, simple CTA.

rent_discount (Pro+): % discount for term, early start, 1–2 months concession.

revenue_share (Premium): Base + revenue %. Adds minimum guarantee option.

master_lease (Premium): Full control; add maintenance responsibility split.

trial_period (Pro+): 45–90 day pilot → auto-extend on KPI success.

repairs_for_concession (Pro+): You handle repairs/upgrades in exchange for credit.

corporate_rental (Pro+): MTR w/ vetted corporate guests, longer stays, lower turns.

Tier usage

Beta: 1 playbook, 3 drafts/day, no clauses, no TL;DR, no revenue share/master lease.

Pro: 5 playbooks, tone control, attach ROI, include selected clause titles.

Premium: All playbooks, TL;DR, counters, clause pack suggestions, unlimited drafts.

9) Safety & compliance guardrails

System prompt forbids illegal use; the assistant must suggest compliant alternatives for restricted markets (e.g., MTR corporate).

If library_regions.regulation_level === 'restricted', prepend: “Local rules appear restrictive; propose legal alternatives only.”

Strip PII and external links from drafts automatically if needed.

We already built Negotiation Assistant; below are the other three “types” with DB, API, prompts, tier-gating, and minimal UI.

Shared: jobs table (already added)

We’ll reuse public.ai_jobs from Negotiation Assistant (type will differ per tool).

1) Property Analysis AI

Goal: quick due-diligence memo that blends Market + Estimator + Library (regs).

Types & validation
// src/types/ai_property.ts
export interface AIPropertyAnalysisInput {
  propertyId: string;
  focus?: ('risk'|'returns'|'ops'|'regs')[];
  depth?: 'brief'|'standard'|'deep'; // Beta: brief; Pro: standard; Premium: deep
}
export interface AIPropertyAnalysisOutput {
  summary: string;           // 120–250 words
  strengths: string[];       // bullets
  risks: string[];           // bullets
  actions: string[];         // next steps
  score: number;             // 0..100 composite (market+regs+roi)
}

// src/lib/validation/ai_property.ts
import { z } from "zod";
export const aiPropertySchema = z.object({
  propertyId: z.string().uuid(),
  focus: z.array(z.enum(['risk','returns','ops','regs'])).optional(),
  depth: z.enum(['brief','standard','deep']).optional()
});
export type AIPropertyPayload = z.infer<typeof aiPropertySchema>;

Context loader & scoring
// src/lib/ai/property/context.ts
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function loadPropertyContext(propertyId:string){
  const sb = getSupabaseServer();
  const { data: p } = await sb.from("properties")
    .select("id,address,city,state,zip,type,beds,baths,sqft,status").eq("id", propertyId).single();
  const { data: roi } = await sb.from("roi_analyses")
    .select("coc, annual_roi, payback_months, inputs").eq("property_id", propertyId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: reg } = await sb.from("library_regions")
    .select("jurisdiction_key, regulation_level, risk_score, summary")
    .eq("jurisdiction_key", p ? `${p.state}` : "").maybeSingle();
  const { data: market } = await sb.from("market_snapshots")
    .select("adr, occ, lt_rent, seasonality_index, risk_score")
    .eq("geo_key", p?.zip).order("as_of",{ascending:false}).limit(1).maybeSingle();

  return { p, roi, reg, market };
}

export function compositeScore(ctx:any){
  // simple baseline; refine later
  const roi = ctx.roi ? Math.min(100, Math.max(0, (ctx.roi.annual_roi||0))) : 40;
  const regs = (ctx.reg?.regulation_level === 'allowed') ? 85 :
               (ctx.reg?.regulation_level === 'conditional') ? 60 : 25;
  const risk = 100 - (ctx.market?.risk_score ?? 50) * 8; // 0..10 → 0..80 detractor
  return Math.round(0.5*roi + 0.3*regs + 0.2*Math.max(0, risk));
}

Prompts & route
// src/lib/ai/property/prompt.ts
import type { AIPropertyPayload } from "@/lib/validation/ai_property";
export function systemPrompt(tier:'beta'|'pro'|'premium'){
  return `You are ArbiBase Property Analyst. Prioritize legal compliance and realistic STR/MTR ops. Tier=${tier}.`;
}
export function userPrompt(payload:AIPropertyPayload, ctx:any, score:number){
  return [
    `Analyze property @ ${ctx.p?.address}, ${ctx.p?.city} ${ctx.p?.state} ${ctx.p?.zip}.`,
    `Type ${ctx.p?.type} • ${ctx.p?.beds}bd/${ctx.p?.baths}ba • ROI: ${ctx.roi?.annual_roi?.toFixed?.(1) || 'n/a'}%`,
    `Market ADR ${ctx.market?.adr ?? 'n/a'} • OCC ${(ctx.market?.occ ?? 0)*100}% • Regs ${ctx.reg?.regulation_level ?? 'unknown'}`,
    `Focus: ${(payload.focus||['returns','risk']).join(', ')} • Depth: ${payload.depth ?? 'standard'}`,
    `Compute composite score=${score} (0..100).`,
    `Return sections: Summary (single paragraph), Strengths (bullets), Risks (bullets), Actions (bullets).`
  ].join("\n");
}

// src/app/api/ai/property/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { aiPropertySchema } from "@/lib/validation/ai_property";
import { negotiationLimits } from "@/lib/tier"; // reuse for tier lookup pattern
import { loadPropertyContext, compositeScore } from "@/lib/ai/property/context";
import { systemPrompt, userPrompt } from "@/lib/ai/property/prompt";
import { runModel } from "@/lib/negotiation/model";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"}, {status:401});

  const { data: profile } = await sb.from("profiles").select("tier").eq("id", user.id).maybeSingle();
  const tier = (profile?.tier ?? 'beta') as 'beta'|'pro'|'premium';

  const body = await req.json();
  const parsed = aiPropertySchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({error:"Invalid payload"}, {status:400});

  const ctx = await loadPropertyContext(parsed.data.propertyId);
  const score = compositeScore(ctx);
  const sys = systemPrompt(tier);
  const usr = userPrompt(parsed.data, ctx, score);
  const raw = await runModel(sys, usr);

  // naive parsing to sections
  const out = {
    summary: clip(section(raw,'summary'), 900),
    strengths: bullets(section(raw,'strengths')),
    risks: bullets(section(raw,'risks')),
    actions: bullets(section(raw,'actions')),
    score
  };
  await sb.from("ai_jobs").insert({ user_id:user.id, type:'property_analysis', input:parsed.data, output:out });
  return NextResponse.json(out);
}

function section(t:string, key:'summary'|'strengths'|'risks'|'actions'){
  const re = new RegExp(`${key}:?([\\s\\S]*?)(\\n\\w+:|$)`, 'i'); const m = t.match(re); return m?m[1].trim():t;
}
function bullets(s:string){ return s.split(/\n|•|-/).map(x=>x.trim()).filter(Boolean).slice(0,6); }
function clip(s:string, n:number){ return s.length>n? s.slice(0,n-1)+'…' : s; }

Minimal UI hook
// src/components/ai/PropertyAnalysisButton.tsx
"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";

export default function PropertyAnalysisButton({ propertyId }:{propertyId:string}){
  const [open,setOpen]=useState(false); const [loading,setLoading]=useState(false); const [res,setRes]=useState<any>(null);
  async function run(){ setLoading(true); const r=await fetch('/api/ai/property',{method:'POST', body: JSON.stringify({propertyId})}); setRes(await r.json()); setLoading(false); }
  return (
    <div>
      <button onClick={()=>{setOpen(!open); if(!res) run();}} className="rounded bg-teal-600 px-3 py-2 text-sm font-semibold flex items-center gap-2"><Lightbulb size={16}/> Analyze</button>
      {open && <div className="mt-2 rounded border border-white/10 bg-white/5 p-4 text-sm">
        {loading? 'Analyzing…' : res && (
          <div>
            <div className="mb-2 text-white/80">Score: <b>{res.score}</b>/100</div>
            <p className="text-white/80 mb-3">{res.summary}</p>
            <List title="Strengths" items={res.strengths}/>
            <List title="Risks" items={res.risks}/>
            <List title="Actions" items={res.actions}/>
          </div>
        )}
      </div>}
    </div>
  );
}
function List({title, items}:{title:string; items:string[]}){ return (<div className="mb-2"><div className="text-white/60">{title}</div><ul className="list-disc ml-5 text-white/80">{items?.map((x,i)=><li key={i}>{x}</li>)}</ul></div>); }


Tier rules:

Beta → depth='brief', hide score if < 40.

Pro → standard; Premium → deep + include risk heat note (future).

2) Description Generator (listing copy)

Goal: description for STR/MTR listing + amenity bullets + SEO title.

Types & validation
// src/types/ai_description.ts
export interface AIDescriptionInput {
  propertyId: string;
  style?: 'premium'|'family'|'business'|'cozy';
  length?: 'short'|'medium'|'long';   // Beta: short; Pro: short/medium; Premium: all
  includeRules?: boolean;
}
export interface AIDescriptionOutput {
  title: string;
  bullets: string[];
  description: string;
  rules?: string[];
}

// src/lib/validation/ai_description.ts
import { z } from "zod";
export const aiDescriptionSchema = z.object({
  propertyId: z.string().uuid(),
  style: z.enum(['premium','family','business','cozy']).optional(),
  length: z.enum(['short','medium','long']).optional(),
  includeRules: z.boolean().optional()
});
export type AIDescriptionPayload = z.infer<typeof aiDescriptionSchema>;

Prompt & route
// src/app/api/ai/description/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { aiDescriptionSchema } from "@/lib/validation/ai_description";
import { runModel } from "@/lib/negotiation/model";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const { data: profile } = await sb.from("profiles").select("tier").eq("id", user.id).maybeSingle();
  const tier = (profile?.tier ?? 'beta') as 'beta'|'pro'|'premium';

  const body = await req.json();
  const parsed = aiDescriptionSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({error:"Invalid payload"},{status:400});
  const p = parsed.data;

  const { data: prop } = await sb.from("properties")
    .select("id,address,city,state,zip,type,beds,baths,sqft").eq("id", p.propertyId).single();

  const style = p.style ?? 'premium';
  const length = (tier==='beta' && p.length && p.length!=='short') ? 'short' : (p.length ?? 'medium');
  const sys = `You write frictionless, compliant STR/MTR listings.`;
  const usr = [
    `Write ${length} listing in style=${style}.`,
    `Property: ${prop.type} ${prop.beds}bd/${prop.baths}ba • ${prop.sqft||''} sqft • ${prop.city}, ${prop.state}.`,
    `Output JSON with fields: title, bullets(5), description${p.includeRules?' ,rules(4)':''}.`,
    `Avoid prohibited claims; no parties; quiet hours 10pm–7am (if rules requested).`
  ].join("\n");

  const text = await runModel(sys, usr);
  let out:any; try { out = JSON.parse(text); } catch { out = fallbackParse(text); }

  await sb.from("ai_jobs").insert({ user_id:user.id, type:'description', input:p, output:out });
  return NextResponse.json(out);
}
function fallbackParse(t:string){
  return { title: t.split('\n')[0]?.slice(0,80) || 'Stylish Stay',
           bullets: (t.match(/^- .+/gm)||[]).map(x=>x.replace(/^- /,'')),
           description: t };
}

Minimal UI button

Drop a “Generate Description” CTA on the property detail page; save output into a copy field or “Export to Clipboard.”

3) Clause/Addendum AI Generator

Goal: propose a tailored addendum using Library templates + property constraints.

Types & validation
// src/types/ai_clause.ts
export interface AIClauseGenInput {
  jurisdictionKey: string;            // 'TX' or 'TX:Travis:Austin'
  tags?: string[];                    // ['sublease','noise','utilities']
  strictness?: 'soft'|'standard'|'strict'; // Beta: standard only
  mergeIds?: string[];                // base clause IDs to merge
}
export interface AIClauseGenOutput {
  title: string;
  bodyMd: string;                     // final markdown
  sources?: {title:string,url:string}[];
}

// src/lib/validation/ai_clause.ts
import { z } from "zod";
export const aiClauseGenSchema = z.object({
  jurisdictionKey: z.string().min(2),
  tags: z.array(z.string()).optional(),
  strictness: z.enum(['soft','standard','strict']).optional(),
  mergeIds: z.array(z.string().uuid()).optional()
});
export type AIClauseGenPayload = z.infer<typeof aiClauseGenSchema>;

Route
// src/app/api/ai/clauses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { aiClauseGenSchema } from "@/lib/validation/ai_clause";
import { runModel } from "@/lib/negotiation/model";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { data: profile } = await sb.from("profiles").select("tier").eq("id", user.id).maybeSingle();
  const tier = (profile?.tier ?? 'beta') as 'beta'|'pro'|'premium';

  const body = await req.json();
  const parsed = aiClauseGenSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({error:"Invalid payload"},{status:400});
  const p = parsed.data;

  if(tier==='beta' && p.strictness && p.strictness!=='standard'){
    p.strictness = 'standard';
  }

  const { data: baseClauses } = await sb.from("library_clauses")
    .select("title, body_md").in("id", p.mergeIds||[]);

  const sys = `You are a cautious contract addendum writer. Output markdown only, compliant language, no legal advice.`;
  const usr = [
    `Jurisdiction: ${p.jurisdictionKey}. Strictness=${p.strictness||'standard'}.`,
    p.tags?.length ? `Focus tags: ${p.tags.join(', ')}` : '',
    baseClauses?.length ? `Incorporate these base clauses:\n${baseClauses.map(c=>`[${c.title}]\n${c.body_md}`).join('\n\n')}` : '',
    `Return: Title line then the body (markdown).`
  ].join("\n");

  const md = await runModel(sys, usr);
  const out = { title: md.split('\n')[0].replace(/^#\s*/,'').slice(0,80), bodyMd: md, sources: [] };

  await sb.from("ai_jobs").insert({ user_id:user.id, type:'clause_gen', input:p, output:out });
  return NextResponse.json(out);
}

UI (hooks into Library builder)

Add “AI Draft” button next to clause selection → POST to /api/ai/clauses → push the returned bodyMd into the preview panel; user can edit then Save Document.

Tier usage matrix (Personal AI Assistant)
Tool / Feature	Beta	Pro	Premium
Property Analysis	brief summary, score	standard + targeted focus	deep + composite scoring + richer next steps
Description Generator	short copy, 5 bullets	short/medium, rules optional	short/medium/long, tone/style nuance + compliance hints
Clause/Addendum Generator	standard strictness only	soft/standard/strict + merge up to 3 clauses	all + merge unlimited + suggest missing clauses
Negotiation Assistant (done)	1 playbook, 3/day	5 playbooks, 20/day, tone, attach ROI	all playbooks, TL;DR, counters, unlimited
Where it plugs in

Property page → “Analyze” + “Generate Description”

Library builder → “AI Draft clause”

Messaging → “AI Assist (Negotiation)” (already added)

complete, drop-in “AI Settings + Usage Meter” package that turns the Personal AI Assistant on/off by user, shows per-tool daily usage, and enforces tier limits across all AI tools.

1) Database (Supabase SQL)
-- 70_profiles_ai_settings.sql
-- If profiles table doesn't already have these:
alter table public.profiles
  add column if not exists tier text default 'beta',                      -- 'beta'|'pro'|'premium'
  add column if not exists ai_personal_enabled boolean default true,      -- master toggle
  add column if not exists ai_timezone text default 'America/New_York';   -- optional, for daily reset UX

-- Optional: index for frequent lookups
create index if not exists idx_profiles_tier on public.profiles(tier);


We’ll keep using your existing public.ai_jobs table for metering. No new tables needed.

2) Shared helpers (tier limits + usage math)

/src/lib/tier.ts (extend with per-tool limits)

export type Tier = 'beta'|'pro'|'premium';

export function getTierLimits(tier: Tier) {
  // per-day generation caps per tool
  return {
    enabled: true,
    property_analysis: tier === 'beta' ? 3 : tier === 'pro' ? 20 : Infinity,
    description:       tier === 'beta' ? 3 : tier === 'pro' ? 20 : Infinity,
    clause_gen:        tier === 'beta' ? 2 : tier === 'pro' ? 10 : Infinity,
    negotiation:       tier === 'beta' ? 3 : tier === 'pro' ? 20 : Infinity,
    // UI adornments
    features: {
      tl_dr: tier === 'premium',
      tones: tier !== 'beta',
      strictnessSoftStrict: tier !== 'beta',
    }
  };
}


/src/lib/ai/usage.ts

import { getSupabaseServer } from "@/lib/supabaseServer";
import { getTierLimits, type Tier } from "@/lib/tier";

export async function getUserTierAndToggle(userId: string) {
  const sb = getSupabaseServer();
  const { data: profile } = await sb.from("profiles")
    .select("tier, ai_personal_enabled").eq("id", userId).maybeSingle();
  const tier = (profile?.tier ?? 'beta') as Tier;
  const enabled = profile?.ai_personal_enabled ?? true;
  return { tier, enabled };
}

export async function getUsageToday(userId: string) {
  const sb = getSupabaseServer();
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const { data, error } = await sb
    .from("ai_jobs")
    .select("type", { count: "exact", head: false })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());
  if (error) return { byType: {}, total: 0 };

  const byType: Record<string, number> = {};
  (data as any[]).forEach((row: any) => {
    const t = row.type as string;
    byType[t] = (byType[t] ?? 0) + 1;
  });
  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  return { byType, total };
}

export async function getUsageSummary(userId: string) {
  const { tier, enabled } = await getUserTierAndToggle(userId);
  const limits = getTierLimits(tier);
  const usage = await getUsageToday(userId);
  const map: Record<string, { used: number; limit: number | '∞'; remaining: number | '∞' }> = {};
  const keys = [
    ['property_analysis', 'property_analysis'],
    ['description', 'description'],
    ['clause_gen', 'clause_gen'],
    ['negotiation', 'negotiation'],
  ] as const;

  keys.forEach(([apiKey, limitKey]) => {
    const used = usage.byType[apiKey] ?? 0;
    const limit = (limits as any)[limitKey] as number | typeof Infinity;
    if (limit === Infinity) {
      map[apiKey] = { used, limit: '∞', remaining: '∞' };
    } else {
      map[apiKey] = { used, limit, remaining: Math.max(0, limit - used) };
    }
  });

  return { enabled, tier, limits, usage: map };
}

3) API: get usage & toggle AI
GET usage: /api/ai/usage
// src/app/api/ai/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getUsageSummary } from "@/lib/ai/usage";

export async function GET() {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await getUsageSummary(user.id);
  return NextResponse.json(summary);
}

Toggle AI: /api/settings/ai (POST)
// src/app/api/settings/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enabled = !!body.enabled;

  const { error } = await sb.from("profiles")
    .update({ ai_personal_enabled: enabled })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, enabled });
}


Note: If you prefer role-based control, enforce the toggle change only for the current user (as above) or for admins, by adding an admin check.

4) Enforce limits in each AI route (1-liner)

At the top of every AI route (property/description/clause/negotiation), right after auth:

import { getUserTierAndToggle, getUsageSummary } from "@/lib/ai/usage";
import { getTierLimits } from "@/lib/tier";

// ...
const { tier, enabled } = await getUserTierAndToggle(user.id);
if (!enabled) return NextResponse.json({ error: "Personal AI Assistant is disabled in settings." }, { status: 403 });

const limits = getTierLimits(tier);
const usage = await getUsageSummary(user.id);
const toolKey = 'property_analysis'; // or 'description' | 'clause_gen' | 'negotiation'
const u = usage.usage[toolKey];
if (u.limit !== '∞' && u.used >= u.limit) {
  return NextResponse.json({ error: "Daily limit reached for your plan." }, { status: 429 });
}


…and keep your existing insert into ai_jobs on success (that’s what increments usage).

5) Settings UI (toggle + usage meter)
Small header widget (ideal to reuse anywhere)

/src/components/ai/AiUsageBadge.tsx

"use client";
import { useEffect, useState } from "react";

export default function AiUsageBadge() {
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetch("/api/ai/usage").then(r=>r.json()).then(setData); }, []);

  if (!data) return null;
  const { enabled, tier, usage } = data;

  function Pill({ label, k }:{ label:string; k:keyof typeof usage }) {
    const u = usage[k];
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10">
        <span className="text-white/60">{label}:</span>
        <span className="font-medium">
          {u.limit === '∞' ? `${u.used}/∞` : `${u.used}/${u.limit}`}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-xs px-2 py-1 rounded ${enabled ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-600/30 text-slate-300'}`}>
        AI {enabled ? 'On' : 'Off'}
      </span>
      <span className="text-xs px-2 py-1 rounded bg-white/10">Tier: <b>{tier.toUpperCase()}</b></span>
      <Pill label="Analyze"   k={"property_analysis" as any} />
      <Pill label="Describe"  k={"description" as any} />
      <Pill label="Clauses"   k={"clause_gen" as any} />
      <Pill label="Negotiate" k={"negotiation" as any} />
    </div>
  );
}

Settings page section

/src/app/(app)/settings/page.tsx (fragment)

"use client";
import { useEffect, useState } from "react";
import AiUsageBadge from "@/components/ai/AiUsageBadge";

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/usage").then(r=>r.json()).then(d => {
      setEnabled(!!d.enabled);
      setLoading(false);
    });
  }, []);

  async function toggle(v:boolean) {
    setEnabled(v);
    await fetch("/api/settings/ai", { method: "POST", body: JSON.stringify({ enabled: v }) });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Personal AI Assistant</div>
            <div className="text-sm text-white/60">Enable AI helpers for negotiation, analysis, descriptions, and clauses.</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only"
                   checked={enabled} disabled={loading}
                   onChange={e => toggle(e.target.checked)} />
            <span className={`w-12 h-6 rounded-full relative transition ${enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${enabled ? 'translate-x-6' : ''}`}></span>
            </span>
          </label>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <AiUsageBadge />
        </div>
      </div>
    </div>
  );
}


You can also drop <AiUsageBadge /> into your chat header, property page, or library builder so users always see their AI meter.

6) UX polish & guardrails

Tooltips: If a tool is blocked by tier or limit, show a tooltip “Upgrade to Pro/Premium to unlock X” or “Daily cap reached — resets at midnight”.

Reset time: Back end uses server midnight; if you want local resets, store profiles.ai_timezone and compute start-of-day accordingly.

Grace buffer: For Premium, we already show ∞. For Pro/Beta, you can allow a 1-draft grace and warn instead of blocking; just tweak the check.

7) One-line wiring in existing UIs

Chat → AI Assist: render <AiUsageBadge /> next to the button, and on “Generate” handle 429/403 to show a friendly banner.

Property page → Analyze/Describe buttons: before firing fetch, you can pre-read /api/ai/usage and gray out buttons if remaining=0.

That’s it — flipping this on will give you:

Centralized AI on/off per user

Clear daily meters by tool

Tier-aware enforcement across every AI endpoint
