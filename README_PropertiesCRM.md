0) What you get

Owners & Contacts (deduped, normalized)

Outreach Logs (calls, SMS, email, in-app; outcomes, next step)

Verification Pipeline (Kanban: Lead → Contacted → Doc Review → Approved/Denied → Negotiation → Signed)

Thread Linking (bind in-app chat conversation to an owner/property)

Tasks/Notes/Files per owner/property/stage

KPIs Dashboard (contact rate, approvals, cycle time)

Tier gates (Beta=single pipeline, Pro=multi-pipeline & automations, Premium=SLAs, webhooks, exports)

1) Database (Supabase SQL)
-- 60_owner_entities.sql
create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,              -- "John & Jane LLC"
  legal_name text,
  type text default 'individual',          -- individual|llc|pm_company
  email text, phone text,
  website text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_owners_email on public.owners(email);
create index if not exists idx_owners_phone on public.owners(phone);

create table if not exists public.owner_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  name text,
  role text,                 -- owner|pm|assistant|broker
  email text, phone text,
  preferred_channel text,    -- sms|email|phone|in_app
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_owner_contacts_owner on public.owner_contacts(owner_id);

-- properties already exist in your app; add linkage if needed:
alter table public.properties
  add column if not exists owner_id uuid references public.owners(id) on delete set null;

-- 61_outreach.sql
create table if not exists public.outreach_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  contact_id uuid references public.owner_contacts(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  channel text not null,         -- call|sms|email|in_app|dm
  direction text not null,       -- out|in
  subject text,
  body text,
  outcome text,                  -- no_answer|left_vm|interested|not_interested|follow_up|meeting_set
  sentiment text,                -- pos|neu|neg
  next_step_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_outreach_owner on public.outreach_logs(owner_id);
create index if not exists idx_outreach_next on public.outreach_logs(next_step_at);

-- 62_pipeline.sql
create table if not exists public.verification_pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- "Default Owner Pipeline"
  is_default boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.verification_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.verification_pipelines(id) on delete cascade,
  name text not null,              -- e.g., "Lead", "Contacted", ...
  position int not null,           -- order on the board
  won boolean default false,
  lost boolean default false,
  created_at timestamptz default now(),
  unique(pipeline_id, position)
);

create table if not exists public.property_verifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  stage_id uuid not null references public.verification_stages(id) on delete restrict,
  status text default 'active',    -- active|won|lost
  reason text,                     -- if lost/denied
  score numeric,                   -- 0..100 from your Estimator/ROI/Reg composite
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_verif_stage on public.property_verifications(stage_id);
create index if not exists idx_verif_owner on public.property_verifications(owner_id);
create index if not exists idx_verif_assignee on public.property_verifications(assigned_to);

-- 63_threads_links.sql (bind in-app chat with owner/properties)
-- You already have support_conversations for AI Chat Assistant.
-- Add a link table to reuse that infra for Owner<>Operator messages too, or create a separate in-app channel.
create table if not exists public.owner_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  conversation_id uuid, -- references support_conversations(id) or a new owners_conversations
  created_at timestamptz default now()
);

-- 64_notes_tasks_files.sql
create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  verif_id uuid references public.property_verifications(id) on delete set null,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  verif_id uuid references public.property_verifications(id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text default 'open', -- open|done|dismissed
  assignee_id uuid references auth.users(id) on delete set null,
  priority text default 'normal', -- low|normal|high|urgent
  created_at timestamptz default now()
);
create index if not exists idx_tasks_due on public.crm_tasks(due_at);

create table if not exists public.crm_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  verif_id uuid references public.property_verifications(id) on delete set null,
  file_url text not null,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 🔒 RLS
alter table public.owners enable row level security;
alter table public.owner_contacts enable row level security;
alter table public.outreach_logs enable row level security;
alter table public.verification_pipelines enable row level security;
alter table public.verification_stages enable row level security;
alter table public.property_verifications enable row level security;
alter table public.owner_threads enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_files enable row level security;

-- Simple policy: authenticated users of your org can access (adjust if you add teams)
create policy "auth read" on public.owners for select using (auth.role() = 'authenticated');
create policy "auth write" on public.owners for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- Repeat for related tables or craft ownership/team-based policies if needed.

2) API routes (Next.js App Router)
2.1 Owners CRUD + dedupe
// src/app/api/owners/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req:NextRequest){
  const sb = getSupabaseServer();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  let query = sb.from("owners").select("id, display_name, email, phone, created_at").order("created_at",{ascending:false}).limit(50);
  if(q) query = query.ilike("display_name", `%${q}%`);
  const { data, error } = await query;
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ data });
}

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const body = await req.json();
  // naive dedupe by email/phone
  if (body.email) {
    const { data:dupe } = await sb.from("owners").select("id").eq("email", body.email).maybeSingle();
    if (dupe) return NextResponse.json({ id: dupe.id, deduped: true });
  }
  const { data, error } = await sb.from("owners").insert(body).select("id").single();
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ id: data.id });
}

2.2 Outreach logging
// src/app/api/outreach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const payload = await req.json(); // {owner_id, contact_id?, property_id?, channel, direction, subject?, body?, outcome?, sentiment?, next_step_at?}
  const { error } = await sb.from("outreach_logs").insert({ ...payload, created_by: user.id });
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ ok:true });
}

export async function GET(req:NextRequest){
  const sb = getSupabaseServer();
  const ownerId = new URL(req.url).searchParams.get("ownerId")!;
  const { data, error } = await sb.from("outreach_logs")
    .select("id,channel,direction,subject,outcome,next_step_at,created_at,created_by")
    .eq("owner_id", ownerId).order("created_at",{ascending:false}).limit(100);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ data });
}

2.3 Pipeline board
// src/app/api/pipeline/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req:NextRequest){
  const sb = getSupabaseServer();
  const pipelineId = new URL(req.url).searchParams.get("pipelineId")!;
  const { data: stages } = await sb.from("verification_stages")
    .select("id, name, position, won, lost").eq("pipeline_id", pipelineId).order("position");
  const { data: cards } = await sb.from("property_verifications")
    .select("id, property_id, owner_id, stage_id, status, score, assigned_to, updated_at");
  return NextResponse.json({ stages, cards });
}

export async function PATCH(req:NextRequest){
  const sb = getSupabaseServer();
  const { cardId, toStageId } = await req.json();
  const { error } = await sb.from("property_verifications")
    .update({ stage_id: toStageId, updated_at: new Date().toISOString() })
    .eq("id", cardId);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ ok:true });
}

2.4 Owner detail bundle (for fast page load)
// src/app/api/owners/[id]/bundle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
export async function GET(_:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const [owner, contacts, outreach, props, threads] = await Promise.all([
    sb.from("owners").select("*").eq("id", params.id).single(),
    sb.from("owner_contacts").select("*").eq("owner_id", params.id),
    sb.from("outreach_logs").select("*").eq("owner_id", params.id).order("created_at",{ascending:false}).limit(50),
    sb.from("properties").select("id,address,city,state,zip").eq("owner_id", params.id),
    sb.from("owner_threads").select("*").eq("owner_id", params.id)
  ]);
  return NextResponse.json({
    owner: owner.data, contacts: contacts.data, outreach: outreach.data, properties: props.data, threads: threads.data
  });
}

3) UI (React)
3.1 Owners list
// src/app/(app)/owners/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function OwnersPage(){
  const [q,setQ] = useState(""); const [rows,setRows] = useState<any[]>([]);
  useEffect(()=>{ fetch(`/api/owners?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(j=>setRows(j.data||[])); }, [q]);
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Owners</h1>
        <input className="ml-auto bg-white/5 border border-white/10 rounded px-3 py-2 text-sm" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead><tr className="text-white/60"><th className="p-2 text-left">Owner</th><th className="p-2">Email</th><th className="p-2">Phone</th><th className="p-2">Created</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="p-2"><Link href={`/owners/${r.id}`} className="text-emerald-300 underline">{r.display_name}</Link></td>
                <td className="p-2 text-center">{r.email||'—'}</td>
                <td className="p-2 text-center">{r.phone||'—'}</td>
                <td className="p-2 text-center">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

3.2 Owner detail (bundle loader)
// src/app/(app)/owners/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Phone, Mail, MessageSquare, Plus } from "lucide-react";

export default function OwnerDetail({ params }:{ params:{ id:string }}) {
  const [data,setData] = useState<any>(null);
  useEffect(()=>{ fetch(`/api/owners/${params.id}/bundle`).then(r=>r.json()).then(setData); }, [params.id]);
  if(!data) return <div className="p-6">Loading…</div>;

  const { owner, contacts, properties, outreach } = data;
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-6">
        <div>
          <div className="text-xl font-bold">{owner.display_name}</div>
          <div className="text-white/60 text-sm">{owner.legal_name || owner.type}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <a className="rounded bg-white/10 px-3 py-2 text-sm flex items-center gap-2"><Phone size={16}/> Call</a>
          <a className="rounded bg-white/10 px-3 py-2 text-sm flex items-center gap-2"><Mail size={16}/> Email</a>
          <a className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold flex items-center gap-2"><MessageSquare size={16}/> In-app</a>
        </div>
      </div>

      {/* Contacts + Properties */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Contacts" action={<button className="text-xs rounded bg-white/10 px-2 py-1"><Plus size={12}/> Add</button>}>
          <ul className="space-y-2 text-sm">
            {contacts?.map((c:any)=>(
              <li key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name} <span className="text-white/40">({c.role})</span></div>
                  <div className="text-white/60">{c.email || '—'} • {c.phone || '—'}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Properties">
          <ul className="space-y-2 text-sm">
            {properties?.map((p:any)=>(
              <li key={p.id}>{p.address}, {p.city} {p.state} {p.zip}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Outreach timeline */}
      <Card title="Outreach Timeline" dense>
        <ul className="divide-y divide-white/10">
          {outreach?.map((o:any)=>(
            <li key={o.id} className="py-2 text-sm flex items-center justify-between">
              <div><b>{o.channel}</b> • {o.direction} • {o.outcome || '—'} <span className="text-white/40 ml-2">{new Date(o.created_at).toLocaleString()}</span></div>
              {o.next_step_at && <div className="text-xs text-white/60">Next: {new Date(o.next_step_at).toLocaleString()}</div>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
function Card({title, children, action, dense}:{title:string; children:any; action?:any; dense?:boolean}){
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-white/70 font-semibold">{title}</div>
        {action}
      </div>
      <div className={dense ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

3.3 Pipeline board (Kanban)
// src/app/(app)/verification/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function VerificationBoard(){
  const [pipelineId, setPipelineId] = useState<string>("default"); // resolve real id on mount
  const [data, setData] = useState<{stages:any[]; cards:any[]}>({stages:[], cards:[]});

  useEffect(()=>{ load(); }, [pipelineId]);
  async function load(){
    const r = await fetch(`/api/pipeline/board?pipelineId=${pipelineId}`);
    setData(await r.json());
  }

  async function move(cardId:string, toStageId:string){
    await fetch(`/api/pipeline/board`, { method:"PATCH", body: JSON.stringify({ cardId, toStageId }) });
    load();
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 grid md:grid-cols-3 lg:grid-cols-6 gap-4">
      {data.stages.map(s=>(
        <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold mb-2">{s.name}</div>
          <div className="space-y-2 min-h-[200px]">
            {data.cards.filter(c=>c.stage_id===s.id).map(c=>(
              <div key={c.id} className="rounded-lg border border-white/10 bg-[#0c1420] p-2 text-xs cursor-move"
                   draggable onDragStart={(e)=>e.dataTransfer.setData("card", c.id)}
                   onDragOver={(e)=>e.preventDefault()}
              >
                <div className="font-semibold">#{c.property_id.slice(0,6)} • Score {c.score ?? '—'}</div>
                <div className="text-white/60">Updated {new Date(c.updated_at).toLocaleDateString()}</div>
                <div className="mt-2 flex gap-1">
                  {data.stages.filter(t=>t.id!==s.id).slice(0,3).map(t=>(
                    <button key={t.id} onClick={()=>move(c.id, t.id)} className="rounded bg-white/10 px-2 py-1">→ {t.name}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="h-10"
                 onDrop={(e)=>{ const cardId = e.dataTransfer.getData("card"); move(cardId, s.id); }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

4) Integrations

In-App Messaging (Owner–Operator)

When you create an owner thread, insert a row in owner_threads with conversation_id from your messaging system.

On Owner Detail page, show a link “Open Conversation” → /messages/[conversation_id].

Verification ↔ Estimator/ROI

On card create, compute score = composite(ROI annual %, Reg risk, Market risk).

Move card auto to “Approved” if: reg.allowed && score >= threshold.

Library / Documents

Upload signed addenda into crm_files with verif_id.

Attach latest jurisdiction summary to card sidebar.

Personal AI Assistant

Add a “Draft owner reply” quick-action on a card → posts to messages (Beta: suggested only, Pro+: one-click send).

5) KPIs (dashboard endpoints)
// src/app/api/owners/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(){
  const sb = getSupabaseServer();
  const since = new Date(); since.setDate(since.getDate()-30);
  const [outreach, approvals, cycle] = await Promise.all([
    sb.rpc("kpi_contact_rate_30d"),
    sb.rpc("kpi_approval_rate_30d"),
    sb.rpc("kpi_cycle_time_days")
  ]);
  return NextResponse.json({
    contact_rate: outreach.data ?? 0,
    approval_rate: approvals.data ?? 0,
    cycle_time_days: cycle.data ?? null
  });
}


Postgres helpers (simple samples):

create or replace function public.kpi_contact_rate_30d()
returns numeric language sql as $$
  select coalesce(avg( (outcome in ('interested','meeting_set','follow_up'))::int ),0) * 100
  from public.outreach_logs
  where created_at >= now() - interval '30 days';
$$;

create or replace function public.kpi_approval_rate_30d()
returns numeric language sql as $$
  select coalesce(100.0 * sum( (v.status='won')::int ) / nullif(count(*),0),0)
  from public.property_verifications v
  where v.created_at >= now() - interval '30 days';
$$;

create or replace function public.kpi_cycle_time_days()
returns numeric language sql as $$
  with won as (
    select v.id, min(v.created_at) as started, max(v.updated_at) filter (where v.status='won') as won_at
    from public.property_verifications v
    group by v.id
  )
  select round(avg(extract(epoch from (won_at - started)) / 86400.0),2)
  from won where won_at is not null;
$$;

6) Tier gates
Feature	Beta	Pro	Premium
Pipelines	1 default	Multiple pipelines, custom stages	Multi-team + stage SLAs
Outreach logging	Manual	+ email/SMS templating	+ bulk sequences & A/B
Verification board	Yes	+ score auto-move rules	+ automations & alerts
Messaging link	Link only	Inline thread panel	Two-way email bridge
Exports	—	CSV owners/outreach	CSV/XLSX + PDF reports
Automations	—	Reminders (next_step_at)	Webhooks + Slack/Email

Enforce server-side in API handlers by reading profiles.tier and returning 403 for locked paths (e.g., creating >1 pipeline).

7) Automations (Pro/Premium)

Follow-up reminders: cron job that queries outreach_logs.next_step_at <= now() → create crm_tasks and send in-app bell/email notification.

Stage SLA (Premium): if a card sits > N days in stage, flag red and notify assigned_to.

Auto-create owner on property import: when a property is imported (Zillow/CSV), upsert owners by email/phone, link properties.owner_id.

8) Quick wiring checklist

 Run SQL migrations above

 Add /owners list + /owners/[id] detail page

 Add /verification Kanban page

 Hook messaging: create/open conversation from Owner Detail

 Add outreach composer (small form: channel/outcome/next step)

 Add KPI widget on Owners index

 Gate multi-pipeline by tier

9) Nice-to-have (soon)

Owner merge tool (dedupe by email/phone Levenshtein)

Prospecting sequences (Pro+) using saved templates

Doc e-signature link for addenda (Premium, via Dropbox Sign/DocuSign)

Owner portal (read-only dashboard + chat)

commit-ready pieces to ship the two items you asked for:

Outreach Composer (modal with presets + “Log & follow-up”)

Kanban Card Right Panel (notes, tasks, files, quick reply)

They match your stack (Next.js App Router + Supabase + Tailwind + Lucide). I included minimal APIs and storage wiring so it all works on day one.

0) One-time storage (files)

Create a private bucket for verification files:

Bucket: crm-files (Private: ON)

1) API — Verification Notes / Tasks / Files
1.1 Notes

File: src/app/api/verification/[id]/notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("crm_notes")
    .select("id, note, created_by, created_at")
    .eq("verif_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { note } = await req.json();
  if (!note || note.trim().length < 2) return NextResponse.json({ error: "Note too short" }, { status: 400 });
  const { error } = await sb.from("crm_notes").insert({
    verif_id: params.id, note, created_by: user.id
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

1.2 Tasks

File: src/app/api/verification/[id]/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("crm_tasks")
    .select("id, title, status, due_at, priority, assignee_id, created_at")
    .eq("verif_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await req.json(); // { title, due_at?, priority? }
  if (!payload?.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const { error } = await sb.from("crm_tasks").insert({
    verif_id: params.id,
    title: payload.title,
    due_at: payload.due_at ?? null,
    priority: payload.priority ?? "normal",
    assignee_id: user.id
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const body = await req.json(); // { id, status? }
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch:any = {};
  if (body.status) patch.status = body.status;
  const { error } = await sb.from("crm_tasks").update(patch).eq("id", body.id).eq("verif_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

1.3 Files (signed upload + register + delete)

Sign upload
File: src/app/api/verification/[id]/files/sign/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const BUCKET = "crm-files";

export async function POST(req:NextRequest, { params }:{params:{id:string}}) {
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, mime } = await req.json() as { filename:string; mime?:string };
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const safe = filename.replace(/[^\w.\-]/g, "_");
  const path = `verification/${params.id}/${Date.now()}_${safe}`;

  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path, {
    contentType: mime || "application/octet-stream",
    upsert: false
  } as any);
  if (error || !data) return NextResponse.json({ error: error?.message || "sign failed" }, { status: 500 });
  return NextResponse.json({ path, signedUrl: data.signedUrl });
}


Register / list / delete
File: src/app/api/verification/[id]/files/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const BUCKET = "crm-files";

export async function GET(_:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("crm_files")
    .select("id, title, file_url, created_by, created_at")
    .eq("verif_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ data });
}

export async function POST(req:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { path, title } = await req.json();
  if (!path) return NextResponse.json({ error:"path required" }, { status:400 });
  const { error } = await sb.from("crm_files").insert({
    verif_id: params.id, file_url: path, title: title || null, created_by: user.id
  });
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(req:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error:"path query required" }, { status:400 });

  // remove db row
  const { error: delDb } = await sb.from("crm_files")
    .delete().eq("verif_id", params.id).eq("file_url", path);
  if (delDb) return NextResponse.json({ error: delDb.message }, { status: 500 });

  // remove storage (best-effort)
  await sb.storage.from(BUCKET).remove([path]).catch(()=>{});
  return NextResponse.json({ ok:true });
}

2) Component — Outreach Composer (Modal)

File: src/components/OutreachComposer.tsx

"use client";

import { useState } from "react";

type Props = {
  ownerId: string;
  contactId?: string|null;
  propertyId?: string|null;
  open: boolean;
  onClose: () => void;
  onLogged?: () => void;
};

const outcomes = ["no_answer","left_vm","interested","not_interested","follow_up","meeting_set"] as const;
const channels = ["call","sms","email","in_app","dm"] as const;

export default function OutreachComposer({ ownerId, contactId=null, propertyId=null, open, onClose, onLogged }: Props) {
  const [channel, setChannel] = useState<typeof channels[number]>("call");
  const [direction, setDirection] = useState<"out"|"in">("out");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<typeof outcomes[number]>("no_answer");
  const [nextStepAt, setNextStepAt] = useState<string>(""); // ISO local
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function log() {
    setLoading(true);
    const payload:any = { owner_id: ownerId, contact_id: contactId, property_id: propertyId, channel, direction, subject, body, outcome };
    if (nextStepAt) payload.next_step_at = new Date(nextStepAt).toISOString();
    const r = await fetch("/api/outreach", { method: "POST", body: JSON.stringify(payload) });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) return alert(j.error || "Failed");
    onLogged?.();
    onClose();
  }

  function preset(v:"first_touch"|"follow_up"|"close_won"){
    if (v==="first_touch"){
      setSubject("Intro — Sublease-friendly lease request");
      setBody("Hi! We work with vetted mid-term professionals. Interested in a corporate lease? Happy to send references, insurance, and deposits.");
      setOutcome("follow_up");
    } else if (v==="follow_up"){
      setSubject("Following up — corporate lease proposal");
      setBody("Just circling back on the proposal. We can adjust terms (deposit/length). Are you open to a quick call?");
      setOutcome("follow_up");
    } else {
      setSubject("Approved — next steps");
      setBody("Great news! Attaching addendum & COI draft. Which day works to sign and schedule move-in readiness?");
      setOutcome("meeting_set");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-white/10 bg-[#0b141d] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Log Outreach</div>
          <div className="flex gap-2 text-xs">
            <button className="rounded bg-white/10 px-2 py-1" onClick={()=>preset("first_touch")}>Preset: First Touch</button>
            <button className="rounded bg-white/10 px-2 py-1" onClick={()=>preset("follow_up")}>Preset: Follow-up</button>
            <button className="rounded bg-white/10 px-2 py-1" onClick={()=>preset("close_won")}>Preset: Close-Won</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <label className="block">
            <div className="text-white/60 mb-1">Channel</div>
            <select className="w-full rounded bg-white/5 border border-white/10 px-2 py-2"
              value={channel} onChange={e=>setChannel(e.target.value as any)}>
              {channels.map(c => <option key={c} value={c} className="bg-[#0b141d]">{c}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-white/60 mb-1">Direction</div>
            <select className="w-full rounded bg-white/5 border border-white/10 px-2 py-2"
              value={direction} onChange={e=>setDirection(e.target.value as any)}>
              <option className="bg-[#0b141d]" value="out">out</option>
              <option className="bg-[#0b141d]" value="in">in</option>
            </select>
          </label>
          <label className="block">
            <div className="text-white/60 mb-1">Outcome</div>
            <select className="w-full rounded bg-white/5 border border-white/10 px-2 py-2"
              value={outcome} onChange={e=>setOutcome(e.target.value as any)}>
              {outcomes.map(o => <option key={o} value={o} className="bg-[#0b141d]">{o}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3">
          <label className="block text-sm">
            <div className="text-white/60 mb-1">Subject</div>
            <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
              value={subject} onChange={e=>setSubject(e.target.value)} />
          </label>
          <label className="block text-sm">
            <div className="text-white/60 mb-1">Body / Call notes</div>
            <textarea rows={6} className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
              value={body} onChange={e=>setBody(e.target.value)} />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm">
            <div className="text-white/60 mb-1">Next step (reminder)</div>
            <input type="datetime-local" className="rounded bg-white/5 border border-white/10 px-3 py-2"
              value={nextStepAt} onChange={e=>setNextStepAt(e.target.value)} />
          </label>

          <button onClick={log} disabled={loading}
            className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">
            {loading ? "Saving…" : "Log & Follow-up"}
          </button>
          <button onClick={onClose} className="rounded bg-white/10 px-3 py-2 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}


How to use on Owner detail page
At top: import OutreachComposer from "@/components/OutreachComposer";
Add a state const [composerOpen,setComposerOpen]=useState(false);
Trigger with your existing CTA (“In-app” button). After save, refetch timeline.

3) Component — Verification Card Right Panel (Drawer)

File: src/components/VerificationCardPanel.tsx

"use client";

import { useEffect, useState } from "react";

type Note = { id:string; note:string; created_by:string; created_at:string };
type Task = { id:string; title:string; status:"open"|"done"|"dismissed"; due_at:string|null; priority:string };
type FileRow = { id:string; title:string|null; file_url:string; created_at:string };

export default function VerificationCardPanel({
  verifId,
  open,
  onClose,
  conversationUrl // optional deep link to your chat thread
}: {
  verifId: string;
  open: boolean;
  onClose: () => void;
  conversationUrl?: string | null;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(()=>{ if(open) loadAll(); }, [open, verifId]);

  async function loadAll(){
    const [n,t,f] = await Promise.all([
      fetch(`/api/verification/${verifId}/notes`).then(r=>r.json()),
      fetch(`/api/verification/${verifId}/tasks`).then(r=>r.json()),
      fetch(`/api/verification/${verifId}/files`).then(r=>r.json()),
    ]);
    setNotes(n.data||[]);
    setTasks(t.data||[]);
    setFiles(f.data||[]);
  }

  async function addNote(){
    const r = await fetch(`/api/verification/${verifId}/notes`, { method:"POST", body: JSON.stringify({ note: noteText }) });
    const j = await r.json(); if(!r.ok) return alert(j.error||"Failed");
    setNoteText(""); loadAll();
  }

  async function addTask(){
    const payload:any = { title: taskTitle };
    if (dueAt) payload.due_at = new Date(dueAt).toISOString();
    const r = await fetch(`/api/verification/${verifId}/tasks`, { method:"POST", body: JSON.stringify(payload) });
    const j = await r.json(); if(!r.ok) return alert(j.error||"Failed");
    setTaskTitle(""); setDueAt(""); loadAll();
  }

  async function toggleTask(id:string, status:"open"|"done"|"dismissed"){
    const r = await fetch(`/api/verification/${verifId}/tasks`, { method:"PATCH", body: JSON.stringify({ id, status }) });
    const j = await r.json(); if(!r.ok) return alert(j.error||"Failed");
    loadAll();
  }

  async function uploadFile(file: File, title?: string){
    const sign = await fetch(`/api/verification/${verifId}/files/sign`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ filename: file.name, mime: file.type })
    }).then(r=>r.json());
    const put = await fetch(sign.signedUrl, { method:"PUT", headers:{ "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!put.ok) return alert("Upload failed");
    const reg = await fetch(`/api/verification/${verifId}/files`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ path: sign.path, title: title || file.name })
    });
    if (!reg.ok) return alert("Register failed");
    loadAll();
  }
  async function deleteFile(path:string){
    const r = await fetch(`/api/verification/${verifId}/files?path=${encodeURIComponent(path)}`, { method:"DELETE" });
    const j = await r.json(); if(!r.ok) return alert(j.error||"Failed");
    loadAll();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose}/>
      <div className="w-full max-w-md h-full bg-[#0b141d] border-l border-white/10 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-lg font-semibold">Deal Panel</div>
          <button onClick={onClose} className="ml-auto rounded bg-white/10 px-2 py-1 text-sm">Close</button>
        </div>

        {/* Quick Reply */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-4">
          <div className="text-sm text-white/70 mb-2">Quick Reply</div>
          {conversationUrl ? (
            <a href={conversationUrl} className="text-xs rounded bg-emerald-600 px-3 py-2 font-semibold hover:bg-emerald-500 inline-block">
              Open Conversation
            </a>
          ) : (
            <div className="text-xs text-white/60">No thread linked.</div>
          )}
        </div>

        {/* Notes */}
        <section className="mb-4">
          <div className="text-sm text-white/70 font-semibold mb-2">Notes</div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
                     placeholder="Add a quick note…" value={noteText} onChange={e=>setNoteText(e.target.value)} />
              <button onClick={addNote} className="rounded bg-white/10 px-3 py-2 text-sm">Add</button>
            </div>
            <ul className="divide-y divide-white/10 text-sm">
              {notes.map(n=>(
                <li key={n.id} className="py-2">
                  <div>{n.note}</div>
                  <div className="text-xs text-white/50">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
              {notes.length===0 && <li className="py-2 text-white/60">No notes yet.</li>}
            </ul>
          </div>
        </section>

        {/* Tasks */}
        <section className="mb-4">
          <div className="text-sm text-white/70 font-semibold mb-2">Tasks</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
                   placeholder="Task title" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />
            <input type="datetime-local" className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
                   value={dueAt} onChange={e=>setDueAt(e.target.value)} />
          </div>
          <button onClick={addTask} className="rounded bg-white/10 px-3 py-2 text-sm mb-2">Add Task</button>
          <ul className="divide-y divide-white/10 text-sm">
            {tasks.map(t=>(
              <li key={t.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className={`font-medium ${t.status==="done" ? "line-through text-white/50" : ""}`}>{t.title}</div>
                  <div className="text-xs text-white/50">
                    {t.due_at ? `Due ${new Date(t.due_at).toLocaleString()}` : "No due date"} • {t.priority}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>toggleTask(t.id, t.status==="done" ? "open" : "done")} className="rounded bg-white/10 px-2 py-1 text-xs">
                    {t.status==="done" ? "Reopen" : "Done"}
                  </button>
                  <button onClick={()=>toggleTask(t.id, "dismissed")} className="rounded bg-white/10 px-2 py-1 text-xs">Dismiss</button>
                </div>
              </li>
            ))}
            {tasks.length===0 && <li className="py-2 text-white/60">No tasks yet.</li>}
          </ul>
        </section>

        {/* Files */}
        <section className="mb-2">
          <div className="text-sm text-white/70 font-semibold mb-2">Files</div>
          <input type="file" onChange={async e=>{
            const file = e.target.files?.[0]; if (!file) return;
            await uploadFile(file);
            e.currentTarget.value = "";
          }} />
          <ul className="divide-y divide-white/10 text-sm mt-2">
            {files.map(f=>(
              <li key={f.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.title || f.file_url.split("/").pop()}</div>
                  <div className="text-xs text-white/50">{new Date(f.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <a className="rounded bg-white/10 px-2 py-1 text-xs"
                     href={`/api/storage/signed-view?bucket=crm-files&path=${encodeURIComponent(f.file_url)}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                  <button onClick={()=>deleteFile(f.file_url)} className="rounded bg-white/10 px-2 py-1 text-xs">Delete</button>
                </div>
              </li>
            ))}
            {files.length===0 && <li className="py-2 text-white/60">No files yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}


Optional helper for viewing files via a signed URL (if you want one): add a tiny route src/app/api/storage/signed-view/route.ts that reads bucket + path and returns a 302 redirect to a createSignedUrl from Supabase. (Or just surface the path for admins.)

4) Wire-up examples
4.1 Use OutreachComposer on Owner Detail

In src/app/(app)/owners/[id]/page.tsx:

Imports:

import OutreachComposer from "@/components/OutreachComposer";
import { useState } from "react";


State + handler:

const [composerOpen, setComposerOpen] = useState(false);

async function refreshTimeline(){
  const j = await fetch(`/api/owners/${params.id}/bundle`).then(r=>r.json());
  setData(j);
}


Replace your “In-app” CTA with:

<a onClick={()=>setComposerOpen(true)} className="cursor-pointer rounded bg-emerald-600 px-3 py-2 text-sm font-semibold flex items-center gap-2">
  In-app
</a>
<OutreachComposer
  ownerId={params.id}
  open={composerOpen}
  onClose={()=>setComposerOpen(false)}
  onLogged={refreshTimeline}
/>

4.2 Add VerificationCardPanel to the Kanban board

In src/app/(app)/verification/page.tsx:

Imports & state:

import VerificationCardPanel from "@/components/VerificationCardPanel";
import { useState } from "react";

const [panelOpen, setPanelOpen] = useState(false);
const [activeVerifId, setActiveVerifId] = useState<string|null>(null);


When rendering a card, add a click to open:

<div
  key={c.id}
  className="rounded-lg border border-white/10 bg-[#0c1420] p-2 text-xs cursor-pointer"
  onClick={() => { setActiveVerifId(c.id); setPanelOpen(true); }}
  draggable
  onDragStart={(e)=>e.dataTransfer.setData("card", c.id)}
  onDragOver={(e)=>e.preventDefault()}
>
  {/* ... existing content ... */}
</div>


Mount the panel:

<VerificationCardPanel
  verifId={activeVerifId || ""}
  open={panelOpen && !!activeVerifId}
  onClose={()=>setPanelOpen(false)}
  conversationUrl={null /* or `/messages/${conversation_id}` if you have it */}
/>

5) Tier gates (quick)

Beta: show panel read/write Notes & Tasks; files limited to 3 per deal (enforce in POST /files with count check).

Pro: remove file cap; enable due-date reminders (cron hitting crm_tasks).

Premium: add bulk upload & export; add “email bridge” on composer (send actual emails/SMS).

(You can check profiles.tier server-side in each route and return 403 when over limit.)

1) Signed view helper (redirect to a temporary URL)

Purpose: Safely let users view private Supabase Storage files (e.g., CRM docs) by issuing a short-lived signed URL and 302 redirecting to it.

File: src/app/api/storage/signed-view/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/**
 * GET /api/storage/signed-view?bucket=crm-files&path=verification/<verifId>/<filename>
 * Optional: ?expires=3600  (seconds, default 3600 = 1h)
 *
 * Requires current user to be authenticated. RLS on your data tables
 * controls who can *discover* paths; this endpoint only signs & redirects.
 */
export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") || "";
  const path = url.searchParams.get("path") || "";
  const expires = Math.max(60, Math.min(60 * 60 * 24, Number(url.searchParams.get("expires")) || 3600));

  if (!bucket || !path) {
    return NextResponse.json({ error: "bucket and path are required" }, { status: 400 });
  }

  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expires);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Failed to sign URL" }, { status: 500 });
  }

  // 302 redirect so <a href="/api/storage/signed-view?..."> opens the file directly.
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}


How to use in UI (example):

<a
  href={`/api/storage/signed-view?bucket=crm-files&path=${encodeURIComponent(file.file_url)}`}
  target="_blank" rel="noreferrer"
  className="rounded bg-white/10 px-2 py-1 text-xs"
>
  View
</a>

2) Task reminder “cron” (API + schedule + tiny notifications table)

We’ll implement:

A notifications table (lightweight bell feed).

A secure cron API route that finds due tasks and inserts notifications.

A Vercel Cron (or GitHub Actions) schedule that hits the API with a secret.

Simple tier logic (Premium: also flag SLA on overdue verification stages, optional).

2.1 SQL migration (notifications)

File: supabase/migrations/65_crm_notifications.sql

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,                         -- e.g., "/verification/<id>"
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.crm_notifications enable row level security;

-- Basic RLS: users can only see their own notifications
create policy "notif read own" on public.crm_notifications
  for select using (auth.uid() = user_id);

create policy "notif write own" on public.crm_notifications
  for insert with check (auth.uid() = user_id);

-- Optional: allow system/cron inserts by bypassing RLS with service role in server context.


If your server uses the Supabase service role in API routes (via getSupabaseServer() on the server side), you may skip the insert own policy and perform system inserts; otherwise keep it and insert for the assignee using service role.

2.2 Cron route (secure by shared secret)

File: src/app/api/cron/tasks-due/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * POST /api/cron/tasks-due
 * Headers: x-cron-secret: <CRON_SECRET>
 *
 * Behavior:
 *  - Find open tasks with due_at <= now()
 *  - Create notifications for assignee (if not already created within last 24h for same task)
 *  - (Optional) Premium: flag verifications that exceeded stage SLA (see SLA sketch below)
 */
export async function POST(req: NextRequest) {
  const incoming = req.headers.get("x-cron-secret") || "";
  if (!CRON_SECRET || incoming !== CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = getSupabaseServer();

  // 1) Fetch due tasks (open + due)
  const { data: tasks, error: taskErr } = await sb
    .from("crm_tasks")
    .select("id, title, due_at, assignee_id, verif_id, status")
    .eq("status", "open")
    .lte("due_at", new Date().toISOString())
    .limit(500);
  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });

  let created = 0;

  // 2) For each task, insert a notification if not recently created (24h dedupe)
  for (const t of tasks || []) {
    if (!t.assignee_id) continue;

    // Check recent notification with same link to avoid spam
    const link = t.verif_id ? `/verification?card=${t.verif_id}` : "/owners";
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { data: existing } = await sb
      .from("crm_notifications")
      .select("id")
      .eq("user_id", t.assignee_id)
      .eq("link", link)
      .gte("created_at", since)
      .limit(1);

    if (existing && existing.length) continue;

    const title = "Task due";
    const body = `${t.title}${t.due_at ? ` (due ${new Date(t.due_at).toLocaleString()})` : ""}`;

    const { error: insErr } = await sb
      .from("crm_notifications")
      .insert({ user_id: t.assignee_id, title, body, link });
    if (!insErr) created++;
  }

  // 3) (Optional Premium) Stage SLA checks – see the sketch below
  // Example: flip a field/insert notifications if a card sits > N days in a stage.

  return NextResponse.json({ ok: true, tasks_checked: tasks?.length || 0, notifications_created: created });
}


Env var (add to your project):

CRON_SECRET=your-long-random-string

2.3 Schedule it
Vercel Cron (recommended)

Create /vercel.json or extend yours:

{
  "crons": [
    {
      "path": "/api/cron/tasks-due",
      "schedule": "*/15 * * * *",
      "headers": {
        "x-cron-secret": "@cron-secret"
      }
    }
  ]
}


Then add a Vercel Environment Variable named cron-secret with the same value as CRON_SECRET.

GitHub Actions (alternative)

File: .github/workflows/cron-tasks-due.yml

name: Task reminders
on:
  schedule:
    - cron: "*/30 * * * *" # every 30 minutes
  workflow_dispatch: {}

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Hit cron endpoint
        run: |
          curl -sS -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            https://<your-domain>/api/cron/tasks-due


Add Actions Secret CRON_SECRET in your repo settings.

2.4 (Optional) Premium SLA sketch

Add an SLA setting per stage (days limit), and flag cards exceeding it.

SQL (minimal):

alter table public.verification_stages
  add column if not exists sla_days int; -- null = no SLA

-- Add a column on property_verifications to store the datetime it *entered* the current stage
alter table public.property_verifications
  add column if not exists stage_entered_at timestamptz;

-- Ensure you update stage_entered_at whenever stage_id changes (API PATCH does this).


Update your move code (already patching stage):

// when moving a card
await sb.from("property_verifications")
  .update({
    stage_id: toStageId,
    stage_entered_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq("id", cardId);


Extend cron route to flag overdue cards:

// Pseudo inside POST /api/cron/tasks-due
const { data: stages } = await sb.from("verification_stages").select("id, name, sla_days");
const slaMap = new Map(stages?.map(s => [s.id, s.sla_days]) || []);
const { data: cards } = await sb.from("property_verifications")
  .select("id, stage_id, stage_entered_at, assigned_to")
  .eq("status", "active")
  .limit(1000);

for (const c of cards || []) {
  const sla = slaMap.get(c.stage_id);
  if (!sla || !c.stage_entered_at) continue;
  const exceeded = Date.now() - new Date(c.stage_entered_at).getTime() > sla * 86400_000;
  if (!exceeded || !c.assigned_to) continue;

  // notify assignee (dedupe like above)
  const link = `/verification?card=${c.id}`;
  // ... insert notification "SLA breach: card in stage > SLA days"
}

2.5 Minimal bell feed UI (optional)

File: src/app/(app)/notifications/page.tsx

"use client";
import { useEffect, useState } from "react";

export default function NotificationsPage(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{
    fetch("/api/notifications").then(r=>r.json()).then(j=>setRows(j.data||[]));
  },[]);
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <ul className="divide-y divide-white/10">
        {rows.map(n=>(
          <li key={n.id} className="py-3">
            <div className="font-medium">{n.title}</div>
            {n.body && <div className="text-sm text-white/70">{n.body}</div>}
            {n.link && <a className="text-xs text-emerald-300 underline" href={n.link}>Open</a>}
            <div className="text-xs text-white/50">{new Date(n.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


API for notifications:
File: src/app/api/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: NextRequest){
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("crm_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

2.6 Quick checklist

 Run the SQL migration for crm_notifications.

 Add CRON_SECRET env var in your app (and on Vercel/GHA).

 Deploy POST /api/cron/tasks-due and schedule it (Vercel Cron or GitHub Actions).

 (Optional) Add SLA columns & logic for Premium.

 Use the signed-view endpoint wherever you show private files.

 
