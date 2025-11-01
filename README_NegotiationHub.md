0) What you get (capabilities)

Negotiation Rooms per property/owner with secure roles (operator ↔ owner; optional reviewer).

Structured Offers: normalized JSON terms (rent, length, deposits, caps, cleaning, exit, indemnity, STR/MTR allowance, addenda list, etc.).

Redline timeline: versioned offers/counteroffers with term-level diff.

Clause/Library sync: pull jurisdiction summary + clause suggestions; inject addenda.

Chat dock: bind to an existing in-app conversation thread.

AI Coach: draft counters, explain risks, propose compromise ladders, convert free text → structured terms.

Approvals & E-sign handoff: mark final, export addendum pack, optional DocuSign/Dropbox Sign stub.

Tier gates: Beta basics; Pro automation + templates; Premium e-sign + multi-party + auto-redlines.

1) Database (Supabase SQL)

File: supabase/migrations/70_negotiation.sql

-- Negotiation room
create table if not exists public.negotiations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  conversation_id uuid,                         -- link to your in-app chat (owner_threads.conversation_id)
  status text not null default 'open',          -- open|pending_owner|pending_operator|final|signed|abandoned
  current_offer_id uuid,                        -- convenience pointer to latest active offer
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Role membership for security
create table if not exists public.negotiation_members (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,                           -- operator|owner|reviewer
  created_at timestamptz default now(),
  unique(negotiation_id, user_id)
);

-- Normalized terms payload (JSON) + human note + versioning
create table if not exists public.negotiation_offers (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  author_role text not null,                    -- operator|owner
  version int not null,                         -- 1..N per negotiation
  terms jsonb not null,                         -- structured terms
  note text,                                    -- plain explanation / concessions
  derived_score numeric,                        -- composite from ROI/Reg/Market
  status text not null default 'proposed',      -- proposed|accepted|declined|withdrawn|superseded
  created_at timestamptz default now()
);
create index if not exists idx_neg_offers_neg on public.negotiation_offers(negotiation_id);
create unique index if not exists uq_neg_offer_version on public.negotiation_offers(negotiation_id, version);

-- Optional snapshots of clauses/addenda attached to a given offer
create table if not exists public.negotiation_offer_clauses (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.negotiation_offers(id) on delete cascade,
  title text not null,
  body_md text not null,
  jurisdiction_key text,
  created_at timestamptz default now()
);

-- Audit actions (accept/decline/request_change, AI assist calls, export, sign)
create table if not exists public.negotiation_events (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  type text not null,     -- 'offer_created'|'offer_accepted'|'offer_declined'|'ai_suggest'|'export'|'sign_request'|'message_link'
  metadata jsonb,         -- {offer_id, reason, prompt_tokens, ...}
  actor uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 🔒 RLS
alter table public.negotiations enable row level security;
alter table public.negotiation_members enable row level security;
alter table public.negotiation_offers enable row level security;
alter table public.negotiation_offer_clauses enable row level security;
alter table public.negotiation_events enable row level security;

-- Policies (simple: members of the negotiation can read/write)
create policy "neg read" on public.negotiations
for select using (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiations.id and m.user_id = auth.uid()
));

create policy "neg write" on public.negotiations
for update using (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiations.id and m.user_id = auth.uid()
));

create policy "members read" on public.negotiation_members
for select using (exists (
  select 1 from public.negotiation_members m2
  where m2.negotiation_id = negotiation_members.negotiation_id and m2.user_id = auth.uid()
));

create policy "members write" on public.negotiation_members
for insert with check (true);

create policy "offers read" on public.negotiation_offers
for select using (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiation_offers.negotiation_id and m.user_id = auth.uid()
));

create policy "offers write" on public.negotiation_offers
for insert with check (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiation_offers.negotiation_id and m.user_id = auth.uid()
));

create policy "events read" on public.negotiation_events
for select using (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiation_events.negotiation_id and m.user_id = auth.uid()
));

create policy "events write" on public.negotiation_events
for insert with check (exists (
  select 1 from public.negotiation_members m
  where m.negotiation_id = negotiation_events.negotiation_id and m.user_id = auth.uid()
));


Suggested terms JSON shape (stored in negotiation_offers.terms):

{
  "rent": 2950,
  "term_months": 12,
  "start_date": "2025-12-01",
  "deposits": { "security": 2950, "extra": 1000 },
  "utilities": "tenant",               // owner|tenant|split
  "use": { "allowed": ["MTR","STR"], "nights_min": 3, "cap_occupancy": 6 },
  "compliance": { "permit": true, "str_tax": true, "hoa_notice": true },
  "ops": { "cleaning": "operator", "inspections": "quarterly", "noise_monitor": true },
  "financials": { "rent_escalator_pct": 0, "late_fee": "5% after 5d" },
  "exit": { "break_fee": 1, "notice_days": 45, "cure_period_days": 7 },
  "insurance": { "liability_m": 1, "additional_insured": "Owner LLC" },
  "addenda": ["Corporate Housing Addendum v1", "STR/MTR Use Addendum v3"]
}

2) API Routes (Next.js App Router)
2.1 Create / List negotiations

File: src/app/api/negotiations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const sp = new URL(req.url).searchParams;
  const propertyId = sp.get("propertyId");
  let q = sb.from("negotiations").select("id, property_id, owner_id, status, current_offer_id, created_at, updated_at")
    .order("updated_at", { ascending: false }).limit(50);
  if (propertyId) q = q.eq("property_id", propertyId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const body = await req.json(); // { property_id, owner_id, conversation_id?, member_ids?[] }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: neg, error } = await sb.from("negotiations")
    .insert({
      property_id: body.property_id,
      owner_id: body.owner_id,
      conversation_id: body.conversation_id || null,
      created_by: user.id
    }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // add members (creator is operator by default)
  const members = [{ negotiation_id: neg.id, user_id: user.id, role: "operator" }].concat(
    (body.member_ids || []).map((uid: string) => ({ negotiation_id: neg.id, user_id: uid, role: "owner" }))
  );
  await sb.from("negotiation_members").insert(members).catch(()=>{});

  return NextResponse.json({ id: neg.id });
}

2.2 Room bundle (fast load)

File: src/app/api/negotiations/[id]/bundle/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const sb = getSupabaseServer();
  const [neg, members, offers, events] = await Promise.all([
    sb.from("negotiations").select("*").eq("id", params.id).single(),
    sb.from("negotiation_members").select("user_id, role").eq("negotiation_id", params.id),
    sb.from("negotiation_offers").select("*").eq("negotiation_id", params.id).order("version"),
    sb.from("negotiation_events").select("*").eq("negotiation_id", params.id).order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({
    negotiation: neg.data, members: members.data, offers: offers.data, events: events.data
  });
}

2.3 Post offer / accept / decline

File: src/app/api/negotiations/[id]/offers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req:NextRequest, { params }:{ params: { id:string }}) {
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json(); // { terms, note, author_role }
  // next version number
  const { data: maxv } = await sb.rpc("next_offer_version", { p_neg_id: params.id }).catch(()=>({ data: 1 }));
  const version = (maxv as number) || 1;

  // compute derived score (simple placeholder – call your ROI/Reg composites)
  const derived_score = (body.terms?.rent ? 100 - Math.min(60, Math.max(0, body.terms.rent/100)) : 70);

  const { data: offer, error } = await sb.from("negotiation_offers").insert({
    negotiation_id: params.id,
    author_role: body.author_role || "operator",
    version,
    terms: body.terms,
    note: body.note || null,
    derived_score
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status:500 });

  await sb.from("negotiations").update({ current_offer_id: offer.id, updated_at: new Date().toISOString() }).eq("id", params.id);
  await sb.from("negotiation_events").insert({ negotiation_id: params.id, type: "offer_created", metadata: { offer_id: offer.id }, actor: user.id });

  return NextResponse.json({ id: offer.id, version });
}

export async function PATCH(req:NextRequest, { params }:{ params:{ id:string }}) {
  const sb = getSupabaseServer();
  const { action, offer_id, reason } = await req.json(); // action: 'accept'|'decline'
  if (!offer_id) return NextResponse.json({ error:"offer_id required" }, { status:400 });

  if (action === 'accept') {
    await sb.from("negotiation_offers").update({ status: "accepted" }).eq("id", offer_id);
    await sb.from("negotiations").update({ status: "final", current_offer_id: offer_id, updated_at: new Date().toISOString() }).eq("id", params.id);
    await sb.from("negotiation_events").insert({ negotiation_id: params.id, type: "offer_accepted", metadata: { offer_id }, actor: null });
  } else if (action === 'decline') {
    await sb.from("negotiation_offers").update({ status: "declined" }).eq("id", offer_id);
    await sb.from("negotiation_events").insert({ negotiation_id: params.id, type: "offer_declined", metadata: { offer_id, reason }, actor: null });
  } else {
    return NextResponse.json({ error:"invalid action" }, { status:400 });
  }
  return NextResponse.json({ ok:true });
}


Helper function (SQL) to compute next version):

create or replace function public.next_offer_version(p_neg_id uuid)
returns int language sql stable as $$
  select coalesce(max(version),0)+1 from public.negotiation_offers where negotiation_id = p_neg_id
$$;

2.4 AI Coach endpoints (stub to your internal LLM service)

File: src/app/api/negotiations/[id]/ai/coach/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
// Wire this to your internal AI function (Personal AI Assistant)
export async function POST(req:NextRequest, { params }:{ params:{ id:string }}) {
  const sb = getSupabaseServer();
  const body = await req.json(); // { prompt, terms?, goal? }
  // Pull latest context: offers + jurisdiction risk + ROI snapshot if needed
  const [{ data: offers }, { data: neg }] = await Promise.all([
    sb.from("negotiation_offers").select("version, terms, author_role, status").eq("negotiation_id", params.id).order("version",{ascending:false}).limit(5),
    sb.from("negotiations").select("property_id, owner_id").eq("id", params.id).single()
  ]);

  // TODO: call your AI service with structured context
  const suggestion = {
    message: "Propose 24-month term with 2% escalator, owner-paid water, operator handles quarterly filter changes. Keep security at 1x, add 45-day notice and 7-day cure.",
    counter_terms: {
      ...offers?.[0]?.terms,
      term_months: 24,
      financials: { ...(offers?.[0]?.terms?.financials||{}), rent_escalator_pct: 2 }
    },
    risks: ["Confirm HOA notice clause and STR permit timeline."],
    clause_recs: ["STR/MTR Addendum v3", "Insurance COI + Additional Insured"]
  };

  await sb.from("negotiation_events").insert({
    negotiation_id: params.id, type: "ai_suggest", metadata: { prompt: body.prompt, suggestion }
  });

  return NextResponse.json({ suggestion });
}

2.5 Export (bundle addenda + terms → MD/PDF) and Sign stubs

POST /api/negotiations/[id]/export → compose final offer + attached clauses (from Library) into MD → render PDF + store in crm-files (reuses your signed upload).

POST /api/negotiations/[id]/sign → create placeholder signing session (store sign_provider, sign_url) to handoff (Premium).

(You already have storage helpers; you can reuse those patterns.)

3) UI (React)
3.1 Negotiation Room page

File: src/app/(app)/negotiations/[id]/page.tsx

"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Check, X, MessageSquare, FileText, Wand2, Scale } from "lucide-react";

type Offer = { id:string; version:number; author_role:string; terms:any; note?:string; status:string; created_at:string; derived_score?:number };
type RoomBundle = { negotiation:any; members:any[]; offers:Offer[]; events:any[] };

export default function NegotiationRoom({ params }:{ params:{ id:string }}) {
  const [data, setData] = useState<RoomBundle|null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [ai, setAi] = useState<{msg:string; terms:any; risks:string[]; clauses:string[]}|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ load(); }, [params.id]);
  async function load(){
    setLoading(true);
    const j = await fetch(`/api/negotiations/${params.id}/bundle`).then(r=>r.json());
    setData(j);
    setDraft(j.offers?.[j.offers.length-1]?.terms || {});
    setLoading(false);
  }

  const latest = useMemo(() => data?.offers?.[data.offers.length-1] as Offer|undefined, [data]);

  async function propose() {
    const r = await fetch(`/api/negotiations/${params.id}/offers`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ terms: draft, note: "Counter proposal", author_role: "operator" })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error||"Failed");
    await load();
  }

  async function accept() {
    if (!latest) return;
    const r = await fetch(`/api/negotiations/${params.id}/offers`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action: "accept", offer_id: latest.id })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error||"Failed");
    await load();
  }

  async function decline() {
    if (!latest) return;
    const r = await fetch(`/api/negotiations/${params.id}/offers`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action: "decline", offer_id: latest.id, reason: "Needs adjustment" })
    });
    if (!r.ok) return alert("Failed");
    await load();
  }

  async function aiCoach() {
    const r = await fetch(`/api/negotiations/${params.id}/ai/coach`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ prompt: "Suggest a win-win counter improving cashflow while keeping compliance strong." })
    });
    const j = await r.json();
    setAi({
      msg: j.suggestion.message,
      terms: j.suggestion.counter_terms,
      risks: j.suggestion.risks || [],
      clauses: j.suggestion.clause_recs || []
    });
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!data) return <div className="p-6 text-red-400">Not found</div>;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft size={20}/> Lease Negotiation</h1>
        <span className="ml-auto text-xs rounded bg-white/10 px-2 py-1">{data.negotiation.status}</span>
        {data.negotiation.conversation_id && (
          <Link href={`/messages/${data.negotiation.conversation_id}`} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold flex items-center gap-1">
            <MessageSquare size={14}/> Open Chat
          </Link>
        )}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Timeline">
            <ul className="divide-y divide-white/10 text-sm">
              {data.offers.map((o:Offer)=>(
                <li key={o.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">v{o.version} • {o.author_role}</span>
                    <span className="text-xs rounded bg-white/10 px-2 py-0.5">{o.status}</span>
                    <span className="text-xs text-white/50 ml-auto">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <TermsDiff prev={versionOf(data.offers, o.version-1)} next={o}/>
                  {o.note && <div className="mt-2 text-white/70 italic">“{o.note}”</div>}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Compose Counter">
            <TermsEditor value={draft} onChange={setDraft}/>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={propose} className="rounded bg-white/10 px-3 py-2 text-sm">Propose Counter</button>
              <button onClick={aiCoach} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold flex items-center gap-2">
                <Wand2 size={14}/> AI Coach
              </button>
              <div className="ml-auto flex gap-2">
                <button onClick={accept} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold flex items-center gap-1"><Check size={14}/> Accept</button>
                <button onClick={decline} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold flex items-center gap-1"><X size={14}/> Decline</button>
              </div>
            </div>
            {ai && (
              <div className="mt-3 rounded border border-emerald-800/40 bg-emerald-900/10 p-3 text-sm">
                <div className="font-semibold mb-1">AI Suggestion</div>
                <div className="text-white/80">{ai.msg}</div>
                {!!ai.risks.length && <div className="mt-2 text-amber-300 text-xs">Risks: {ai.risks.join(" • ")}</div>}
                {!!ai.clauses.length && <div className="mt-1 text-xs text-white/60">Clause recs: {ai.clauses.join(", ")}</div>}
                <button onClick={()=>setDraft(ai.terms)} className="mt-2 rounded bg-white/10 px-2 py-1 text-xs">Apply Terms</button>
              </div>
            )}
          </Card>
        </div>

        {/* Right: compliance + documents */}
        <div className="space-y-4">
          <CompliancePanel propertyId={data.negotiation.property_id}/>
          <Card title="Documents">
            <Link href={`/library`} className="inline-flex items-center gap-2 text-sm rounded bg-white/10 px-3 py-2">
              <FileText size={14}/> Add Addenda from Library
            </Link>
            <div className="mt-2 text-xs text-white/60">
              Attach addenda to the **latest** offer. (Pro+: auto-insert jurisdiction clauses)
            </div>
          </Card>
          <Card title="Fairness Score">
            <div className="text-sm text-white/70 flex items-center gap-2"><Scale size={14}/> {latest?.derived_score ?? "—"} / 100</div>
            <div className="text-xs text-white/50 mt-1">Composite from Market/ROI/Reg.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function versionOf(offers:Offer[], v:number){ return offers.find(o=>o.version===v); }
function Card({title, children}:{title:string; children:any}){
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-sm text-white/70 font-semibold mb-2">{title}</div>{children}</div>;
}

/* ---- Minimal Terms Editor / Diff ---- */

function TermsEditor({ value, onChange }:{ value:any; onChange:(v:any)=>void }) {
  function set(path:string, val:any){
    const next = structuredClone(value||{});
    const seg = path.split(".");
    let cur = next;
    for (let i=0;i<seg.length-1;i++) cur = cur[seg[i]] = cur[seg[i]] ?? {};
    cur[seg[seg.length-1]] = val;
    onChange(next);
  }
  return (
    <div className="grid md:grid-cols-2 gap-3 text-sm">
      <Input label="Rent ($/mo)" type="number" value={value?.rent||""} onChange={v=>set("rent", Number(v))}/>
      <Input label="Term (months)" type="number" value={value?.term_months||""} onChange={v=>set("term_months", Number(v))}/>
      <Input label="Start date" type="date" value={value?.start_date||""} onChange={v=>set("start_date", v)}/>
      <Input label="Security Deposit" type="number" value={value?.deposits?.security||""} onChange={v=>set("deposits.security", Number(v))}/>
      <Select label="Utilities" value={value?.utilities||"tenant"} onChange={v=>set("utilities", v)} options={["owner","tenant","split"]}/>
      <Select label="Use" value={value?.use?.allowed?.[0]||"MTR"} onChange={v=>set("use.allowed.0", v)} options={["MTR","STR","MTR+STR"]}/>
      <Toggle label="Permit in place" checked={!!value?.compliance?.permit} onChange={v=>set("compliance.permit", v)}/>
      <Input label="Notice (days)" type="number" value={value?.exit?.notice_days||""} onChange={v=>set("exit.notice_days", Number(v))}/>
      <Input label="Cure period (days)" type="number" value={value?.exit?.cure_period_days||""} onChange={v=>set("exit.cure_period_days", Number(v))}/>
      <Input label="Rent escalator (%)" type="number" value={value?.financials?.rent_escalator_pct||0} onChange={v=>set("financials.rent_escalator_pct", Number(v))}/>
    </div>
  );
}
function TermsDiff({ prev, next }:{ prev?:Offer; next:Offer }){
  const changes = diffTerms(prev?.terms||{}, next.terms||{});
  if (changes.length===0) return <div className="text-xs text-white/50 mt-1">No changes.</div>;
  return <ul className="mt-2 text-xs space-y-1">
    {changes.map((c,i)=>(
      <li key={i}>
        <span className="text-white/60">{c.path}:</span>{" "}
        <span className="text-red-300 line-through">{fmt(c.from)}</span>{" "}
        → <span className="text-emerald-300">{fmt(c.to)}</span>
      </li>
    ))}
  </ul>;
}
function diffTerms(a:any,b:any, base:string[]=[]): Array<{path:string; from:any; to:any}>{
  const out:any[] = [];
  const keys = new Set([...Object.keys(a||{}), ...Object.keys(b||{})]);
  for (const k of keys) {
    const p = [...base,k];
    if (isObj(a?.[k]) || isObj(b?.[k])) out.push(...diffTerms(a?.[k]||{}, b?.[k]||{}, p));
    else if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) out.push({ path: p.join("."), from: a?.[k], to: b?.[k] });
  }
  return out;
}
const isObj=(x:any)=> x && typeof x==="object" && !Array.isArray(x);
const fmt=(v:any)=> v===undefined||v===null||v==="" ? "—" : String(v);

function Input(props:any){ return (
  <label className="block">
    <div className="text-white/60 mb-1 text-xs">{props.label}</div>
    <input type={props.type||"text"} value={props.value} onChange={e=>props.onChange(e.target.value)}
      className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"/>
  </label>
);}
function Select({label, value, onChange, options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){ return (
  <label className="block">
    <div className="text-white/60 mb-1 text-xs">{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm">
      {options.map(o=><option key={o} value={o} className="bg-[#0b141d]">{o}</option>)}
    </select>
  </label>
);}
function Toggle({label, checked, onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){ return (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
    <span className="text-white/60">{label}</span>
  </label>
);}
function CompliancePanel({propertyId}:{propertyId:string}){
  // you can fetch /api/library/regions?state=.. here using property meta
  return (
    <Card title="Compliance Snapshot">
      <div className="text-xs text-white/60">Pull jurisdiction (state/county/city) + risk score; show traffic-light banner and link to required addenda.</div>
    </Card>
  );
}

4) Integrations & Data Flow

Messages: negotiations.conversation_id links to your existing chat. Surface a “Open Chat” CTA; optionally embed thread on the right pane (Pro+).

Library: on Accept or when composing, call /api/library/clauses?jurisdiction=… and attach recommended clauses into negotiation_offer_clauses (Pro+: auto-attach).

Estimator/ROI: when posting offers, compute derived_score using your Estimator + Market Radar. Show “Fairness Score” and nudge (e.g., rent too high for occupancy forecasts).

Portfolio: once negotiations.status = 'signed', create/attach a Portfolio record and seed baseline KPIs.

Owner CRM Hub: automatically log an outreach entry when a new offer is posted (outreach_logs: channel=in_app, subject=Offer vN posted).

5) Tier Gates (server-side checks)
Feature	Beta	Pro	Premium
Negotiation room	1 active per property	Unlimited	Unlimited + multi-party (brokers)
Terms editor	Manual	+ Templates & presets	+ Auto redlines from AI
AI Coach	Suggestion only	+ Apply terms in one click	+ Negotiate-path recommendations (3 plans)
Library	Manual attach	Auto recommended clauses	Auto insert + jurisdiction alerts
Export	MD → PDF (manual)	One-click PDF pack	E-sign handoff (DocuSign/Dropbox Sign)
Messaging	Open thread link	Inline thread	Email/SMS bridge

Enforce by reading profiles.tier inside your API handlers (403 on restricted actions).

6) QA Targets

Users not in negotiation_members cannot read/write room artifacts (RLS).

Versions strictly increment; accept locks room (final) and pins current_offer_id.

Diff shows only changed fields; dates & numbers normalized.

AI suggestions never overwrite terms until user clicks Apply.

Export builds the currently accepted (or latest proposed) offer with attached clauses.

7) Nice-to-have next

Templated Plays (ladder of concessions; e.g., Term↑, Rent↓, Deposit↑).

Owner-side portal view (limited to their rooms + chat + accept/decline).

Clause conflicts detector (e.g., HOA restrictions vs STR addendum).

Outcome analytics (median rent delta from ask, time-to-final by market).
