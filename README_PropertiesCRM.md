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
