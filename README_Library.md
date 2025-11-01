1) Database (Supabase SQL)
-- 40_library_regions.sql
create table if not exists public.library_regions (
  id uuid primary key default gen_random_uuid(),
  state text not null,           -- "TX"
  county text,                   -- optional
  city text,                     -- optional
  jurisdiction_key text not null, -- e.g. "TX", "TX:Travis", "TX:Travis:Austin"
  regulation_level text not null default 'conditional', -- allowed|conditional|restricted
  summary text,                  -- human summary ("STR allowed w/ permit...")
  requirements jsonb,            -- { permits:[], taxes:[], occupancy_caps:{...}, hoa:... }
  sources jsonb,                 -- [{title,url,as_of}]
  risk_score numeric default 5,  -- 0..10 (lower = safer)
  last_update timestamptz default now()
);
create unique index if not exists uq_library_regions_key on public.library_regions(jurisdiction_key);

-- 41_library_clauses.sql
create table if not exists public.library_clauses (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_key text not null,    -- inherit or override by region
  title text not null,
  body_md text not null,             -- markdown body
  tags text[] default '{}',          -- ['sublease','hoa','noise','city_permit']
  version int not null default 1,
  is_global boolean default false,   -- available for all jurisdictions
  last_update timestamptz default now()
);
create index if not exists idx_clauses_juris on public.library_clauses(jurisdiction_key);

-- 42_library_documents.sql
create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  doc_type text not null,         -- 'addendum'|'clause_pack'|'summary'
  title text not null,
  body_md text not null,          -- frozen at creation
  file_url text,                  -- pdf/docx after export (optional)
  created_at timestamptz default now()
);

-- Security / RLS
alter table public.library_regions enable row level security;
alter table public.library_clauses enable row level security;
alter table public.library_documents enable row level security;

-- Public read for regulations, controlled write for admins
create policy "regions public read" on public.library_regions for select using (true);
create policy "clauses public read" on public.library_clauses for select using (true);

-- Users can read their docs and write their own
create policy "docs read own" on public.library_documents for select using (auth.uid() = user_id);
create policy "docs write own" on public.library_documents for insert with check (auth.uid() = user_id);
create policy "docs update own" on public.library_documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

2) Types & Validation
// src/types/library.ts
export type RegulationLevel = 'allowed'|'conditional'|'restricted';

export interface LibraryRegion {
  id: string;
  state: string;
  county?: string|null;
  city?: string|null;
  jurisdiction_key: string;
  regulation_level: RegulationLevel;
  summary?: string|null;
  requirements?: any;
  sources?: Array<{title:string; url:string; as_of?:string}>;
  risk_score: number;
  last_update: string;
}

export interface LibraryClause {
  id: string;
  jurisdiction_key: string;
  title: string;
  body_md: string;
  tags: string[];
  version: number;
  is_global: boolean;
  last_update: string;
}

export interface LibraryDocument {
  id: string;
  user_id: string;
  property_id?: string|null;
  doc_type: 'addendum'|'clause_pack'|'summary';
  title: string;
  body_md: string;
  file_url?: string|null;
  created_at: string;
}

// src/lib/validation/library.ts
import { z } from "zod";

export const regionQuerySchema = z.object({
  state: z.string().length(2),
  county: z.string().optional(),
  city: z.string().optional()
});

export const clauseSearchSchema = z.object({
  jurisdiction: z.string().min(2), // "TX" or "TX:Travis" or "TX:Travis:Austin"
  tags: z.array(z.string()).optional(),
  q: z.string().optional()
});

export const documentCreateSchema = z.object({
  propertyId: z.string().uuid().nullable().optional(),
  docType: z.enum(['addendum','clause_pack','summary']),
  title: z.string().min(3),
  bodyMd: z.string().min(10)
});

3) API Routes (Next.js App Router)
Get regulation by state/county/city
// src/app/api/library/regions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { regionQuerySchema } from "@/lib/validation/library";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = {
    state: searchParams.get("state") || "",
    county: searchParams.get("county") || undefined,
    city: searchParams.get("city") || undefined
  };
  const parsed = regionQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query"}, { status: 400 });

  const supabase = getSupabaseServer();
  const key = [parsed.data.state, parsed.data.county, parsed.data.city].filter(Boolean).join(":");

  // prefer most-specific, fall back to broader
  const keys = [
    key,
    [parsed.data.state, parsed.data.county].filter(Boolean).join(":"),
    parsed.data.state
  ].filter(Boolean);

  const { data, error } = await supabase
    .from("library_regions")
    .select("*")
    .in("jurisdiction_key", keys)
    .order("jurisdiction_key", { ascending: false }); // more specific last

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // choose most specific available
  const picked = data?.find(d => d.jurisdiction_key === key) || data?.[0] || null;
  return NextResponse.json({ data: picked });
}

Search clauses by jurisdiction/tags/free-text
// src/app/api/library/clauses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { clauseSearchSchema } from "@/lib/validation/library";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const payload = {
    jurisdiction: searchParams.get("jurisdiction") || "",
    q: searchParams.get("q") || undefined,
    tags: searchParams.getAll("tag")
  };
  const parsed = clauseSearchSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query"}, { status: 400 });

  const supabase = getSupabaseServer();
  let q = supabase.from("library_clauses")
    .select("id, jurisdiction_key, title, body_md, tags, version, is_global, last_update")
    .or(`jurisdiction_key.eq.${parsed.data.jurisdiction},is_global.eq.true`);

  if (parsed.data.tags && parsed.data.tags.length) {
    q = q.contains("tags", parsed.data.tags);
  }
  if (parsed.data.q) {
    q = q.textSearch("body_md", parsed.data.q, { type: "websearch" } as any);
  }
  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

Create a document (addendum / clause pack / summary)
// src/app/api/library/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { documentCreateSchema } from "@/lib/validation/library";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = documentCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload"}, { status: 400 });

  const insert = {
    user_id: user.id,
    property_id: parsed.data.propertyId ?? null,
    doc_type: parsed.data.docType,
    title: parsed.data.title,
    body_md: parsed.data.bodyMd
  };
  const { data, error } = await supabase.from("library_documents").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}


(PDF export endpoint can be added later to render body_md → PDF/DOCX and update file_url.)

4) Library UI (React)
Search + Compliance Banner + Clause Builder
// src/app/(app)/library/page.tsx
"use client";
import { useEffect, useState } from "react";

type Region = {
  jurisdiction_key:string; regulation_level:'allowed'|'conditional'|'restricted';
  summary?:string|null; risk_score:number;
};
type Clause = { id:string; title:string; body_md:string; tags:string[]; jurisdiction_key:string; };

export default function LibraryPage() {
  const [state, setState] = useState("TX");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region|null>(null);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [docTitle, setDocTitle] = useState("ArbiBase Addendum");

  async function loadRegion() {
    const q = new URLSearchParams({ state, ...(county?{county}:{}), ...(city?{city}:{}) });
    const res = await fetch(`/api/library/regions?${q.toString()}`);
    const json = await res.json();
    setRegion(json.data);
  }
  async function searchClauses() {
    const key = [state, county||null, city||null].filter(Boolean).join(":");
    const res = await fetch(`/api/library/clauses?jurisdiction=${encodeURIComponent(key)}`);
    const json = await res.json();
    setClauses(json.data || []);
  }
  useEffect(()=>{ loadRegion(); searchClauses(); }, []);

  function riskBadge(level:Region['regulation_level']) {
    if (level==='allowed') return <span className="px-2 py-0.5 text-xs rounded bg-emerald-600/20 text-emerald-300">Allowed</span>;
    if (level==='conditional') return <span className="px-2 py-0.5 text-xs rounded bg-amber-600/20 text-amber-300">Conditional</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-red-600/20 text-red-300">Restricted</span>;
  }

  const composedMd = selected
    .map(id => clauses.find(c=>c.id===id))
    .filter(Boolean)
    .map(c => `### ${c!.title}\n\n${c!.body_md}\n`)
    .join("\n");

  async function saveDocument() {
    const res = await fetch("/api/library/documents", {
      method: "POST",
      body: JSON.stringify({ docType: "addendum", title: docTitle, bodyMd: composedMd })
    });
    const json = await res.json();
    if (json.id) alert("Document saved: " + json.id);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">ArbiBase Library</h1>

      {/* Search Region */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input label="State (e.g., TX)" value={state} onChange={setState}/>
        <Input label="County (optional)" value={county} onChange={setCounty}/>
        <Input label="City (optional)" value={city} onChange={setCity}/>
        <button onClick={()=>{loadRegion(); searchClauses();}}
                className="rounded bg-teal-600 hover:bg-teal-500 text-sm font-semibold">Search</button>
      </div>

      {/* Compliance Banner */}
      {region && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-3">
            <div className="text-white/80">
              <div className="text-sm">Jurisdiction</div>
              <div className="font-semibold">{region.jurisdiction_key}</div>
            </div>
            <div className="ml-auto">{riskBadge(region.regulation_level)}</div>
          </div>
          {region.summary && <p className="mt-3 text-white/70 text-sm">{region.summary}</p>}
          <div className="mt-2 text-xs text-white/40">Risk Score: {region.risk_score?.toFixed?.(1) ?? region.risk_score}</div>
        </div>
      )}

      {/* Clause Builder */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Clause & Addendum Builder</h2>
          <input
            className="rounded bg-slate-800 text-sm px-3 py-2"
            placeholder="Document title"
            value={docTitle}
            onChange={e=>setDocTitle(e.target.value)}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="text-sm text-white/60">Available Clauses</div>
            <div className="max-h-72 overflow-auto rounded border border-slate-800">
              {clauses.map(c=>(
                <label key={c.id} className="flex items-start gap-2 p-3 border-b border-slate-800/60">
                  <input type="checkbox" checked={selected.includes(c.id)}
                         onChange={e=> setSelected(prev => e.target.checked ? [...prev, c.id] : prev.filter(x=>x!==c.id))}/>
                  <div>
                    <div className="font-medium">{c.title}</div>
                    {c.tags?.length>0 && <div className="text-xs text-white/40">{c.tags.join(" • ")}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-white/60 mb-2">Preview (Markdown)</div>
            <textarea
              readOnly
              className="w-full h-72 rounded bg-slate-800 p-3 text-sm"
              value={composedMd}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={saveDocument} className="rounded bg-teal-600 px-3 py-2 text-sm font-semibold hover:bg-teal-500">Save Document</button>
          {/* Premium: add Export PDF once you wire the renderer */}
          <button disabled className="rounded bg-slate-700 px-3 py-2 text-sm opacity-60 cursor-not-allowed">Export PDF (Premium)</button>
        </div>
      </div>
    </div>
  );
}

function Input({label, value, onChange}:{label:string; value:string; onChange:(v:string)=>void}) {
  return (
    <label className="text-sm">
      <div className="text-white/60 mb-1">{label}</div>
      <input value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded bg-slate-800 px-3 py-2"/>
    </label>
  );
}

5) Core Logic & Scoring

Jurisdiction key resolution: prefer most specific (state:county:city), fall back to county, then state.

Risk score: compute later as weighted composite (regulation_level, permit complexity, tax burdens, HOA exposure).

Compliance banner: simple traffic-light (Allowed / Conditional / Restricted).

Clause builder: merges global + jurisdiction clauses; selection → Markdown composition; saves a frozen snapshot to library_documents.

6) Tier Gates
Tier	Regions Access	Clause Builder	Export
Beta	State-level only	Read + 3 saved docs	—
Pro	State + County + City	Full builder + tags	—
Premium	All + “Update alerts”	Full + AI draft helper	PDF/DOCX

Add a simple check on the server (user profile metadata) to block city-level queries for Beta.

7) QA Targets

Region fallback works (city → county → state).

Clauses list contains both jurisdiction-specific and global entries.

Saved document renders same content on reload (frozen snapshot).

RLS: user can only read their own documents.

8) Optional Upgrades (Phase-2/3)

AI Clause/Addendum Generator: endpoint POST /api/ai/clause → uses inputs (jurisdiction, lease terms) to propose clauses; writes to library_documents.

Auto-Update Alerts: when library_regions.last_update changes for a user’s saved jurisdiction, notify via in-app bell/email.

Export Service: server route that converts body_md → PDF/DOCX (e.g., md-to-pdf, pdf-lib, or a headless Chromium render). After export, upload to Supabase Storage and set file_url.

1) SQL hardening & performance
1.1 Enums + FTS + useful indexes
-- 40a_enums.sql
do $$ begin
  create type regulation_level_enum as enum ('allowed','conditional','restricted');
exception when duplicate_object then null; end $$;

alter table public.library_regions
  alter column regulation_level type regulation_level_enum using regulation_level::regulation_level_enum;

-- FTS: generated tsvectors for fast search on body_md/title
alter table public.library_clauses
  add column if not exists tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body_md,'')), 'B')
  ) stored;

create index if not exists idx_clauses_tsv on public.library_clauses using gin(tsv);
create index if not exists idx_clauses_tags on public.library_clauses using gin(tags);

-- Regions key helpers
create unique index if not exists uq_regions_key on public.library_regions(jurisdiction_key);
create index if not exists idx_regions_state on public.library_regions(state);

1.2 Clause versioning (audit trail)
-- 41a_clause_versions.sql
create table if not exists public.library_clause_versions (
  id uuid primary key default gen_random_uuid(),
  clause_id uuid not null references public.library_clauses(id) on delete cascade,
  version int not null,
  title text not null,
  body_md text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- trigger to snapshot on update
create or replace function public.snapshot_clause_version()
returns trigger as $$
begin
  insert into public.library_clause_versions (clause_id, version, title, body_md, tags)
  values (new.id, new.version, new.title, new.body_md, new.tags);
  return new;
end $$ language plpgsql;

drop trigger if exists trg_snapshot_clause on public.library_clauses;
create trigger trg_snapshot_clause
after insert or update on public.library_clauses
for each row execute function public.snapshot_clause_version();

1.3 Storage for exports
-- No SQL needed for bucket, but name it consistently:
-- Supabase Storage bucket: `library_exports`
-- (Create via Dashboard or CLI; make it private)

2) Security: admin write policies + tier gates
2.1 Admin writes (regions/clauses)

Assuming profiles.is_admin boolean:

alter table public.profiles add column if not exists is_admin boolean default false;

-- RLS: only admins can write regions/clauses
create policy if not exists "regions admin write" on public.library_regions
  for insert with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  to authenticated;

create policy if not exists "regions admin update" on public.library_regions
  for update using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  to authenticated;

create policy if not exists "clauses admin write" on public.library_clauses
  for insert with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  to authenticated;

create policy if not exists "clauses admin update" on public.library_clauses
  for update using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  to authenticated;

2.2 Tier enforcement (city-level lock for Beta)

In your regions API route, enforce at the top:

// src/app/api/library/regions/route.ts (add near top after auth fetch if you have one)
import { getUserTier } from "@/lib/tierUser"; // small helper you add

// ...
const tier = await getUserTier(); // 'beta'|'pro'|'premium'
if (tier === 'beta') {
  const cityParam = new URL(req.url).searchParams.get("city");
  if (cityParam) {
    return NextResponse.json({ error: "City-level access requires Pro plan." }, { status: 403 });
  }
}


(Same pattern can block county if you want Beta=state-only.)

3) API: fast search & admin CRUD
3.1 FTS endpoint (uses tsv)
// src/app/api/library/clauses/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const q = new URL(req.url).searchParams.get("q") || "";
  const jur = new URL(req.url).searchParams.get("jurisdiction") || "";

  let query = sb.from("library_clauses")
    .select("id, title, body_md, jurisdiction_key, tags, version, is_global")
    .or(`jurisdiction_key.eq.${jur},is_global.eq.true`);

  if (q) {
    query = query.filter("tsv", "fts", q); // uses the GIN index
  }

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

3.2 Admin upsert (regions/clauses)
// src/app/api/admin/library/regions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { data: prof } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if(!prof?.is_admin) return NextResponse.json({error:"Forbidden"},{status:403});

  const payload = await req.json(); // { state, county?, city?, regulation_level, summary, requirements, sources, risk_score }
  payload.jurisdiction_key = [payload.state, payload.county, payload.city].filter(Boolean).join(":");

  const { data, error } = await sb.from("library_regions")
    .upsert(payload, { onConflict: "jurisdiction_key" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}


(Mirror for /api/admin/library/clauses with version = version + 1 on updates.)

4) Export to PDF (Premium)

Two pieces:

Route that renders body_md → HTML → PDF

Upload to Supabase Storage (library_exports) and save file_url

This uses puppeteer-core + @sparticuz/chromium for Vercel/Serverless. If you’re on a full Node server, regular puppeteer is fine.

// src/app/api/library/documents/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { remark } from "remark";
import html from "remark-html";

// If on serverless:
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs"; // ensure Node runtime

export async function POST(_:NextRequest, { params }:{ params:{ id:string } }) {
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // tier check
  const { data: prof } = await sb.from("profiles").select("tier").eq("id", user.id).maybeSingle();
  if (prof?.tier !== 'premium') return NextResponse.json({ error: "Export is Premium-only." }, { status: 403 });

  const { data: doc, error } = await sb.from("library_documents")
    .select("id, user_id, title, body_md").eq("id", params.id).single();
  if (error || !doc || doc.user_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // MD -> HTML
  const htmlBody = String(await remark().use(html).process(doc.body_md));
  const pageHtml = templateHTML(doc.title, htmlBody);

  // Render with Chromium
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(pageHtml, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  await browser.close();

  // Upload to Storage
  const filePath = `exports/${doc.id}.pdf`;
  const { error: upErr } = await sb.storage.from("library_exports").upload(filePath, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = sb.storage.from("library_exports").getPublicUrl(filePath);
  await sb.from("library_documents").update({ file_url: pub?.publicUrl }).eq("id", doc.id);

  return NextResponse.json({ file_url: pub?.publicUrl });
}

function templateHTML(title:string, bodyHtml:string){
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Inter, ui-sans-serif, system-ui, -apple-system; margin: 32px; color: #0f172a; }
  h1,h2,h3 { color: #0b1324; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .sub { color:#475569; font-size:12px; margin-bottom:24px; }
  .box { border:1px solid #e2e8f0; border-radius:12px; padding:16px; }
  ul { margin-left: 18px; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Generated via ArbiBase Library</div>
  <div class="box">${bodyHtml}</div>
</body></html>`;
}
function escapeHtml(s:string){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }


Client button (Premium only):

// On Library page, replace disabled Export button:
<button
  onClick={async ()=>{
    const r = await fetch(`/api/library/documents/${savedDocId}/export`, { method:'POST' });
    const j = await r.json();
    if(j.file_url) window.open(j.file_url, "_blank");
  }}
  className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
>
  Export PDF (Premium)
</button>

5) “Watch updates” alerts (optional but powerful)
5.1 User watchlist
create table if not exists public.library_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jurisdiction_key text not null,
  created_at timestamptz default now(),
  unique (user_id, jurisdiction_key)
);
alter table public.library_watchlist enable row level security;
create policy "watchlist self" on public.library_watchlist
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

5.2 Edge Function to notify on changes

Add a trigger to enqueue a notification row when library_regions.last_update changes.

create table if not exists public.library_updates_queue (
  id bigserial primary key,
  jurisdiction_key text not null,
  changed_at timestamptz default now(),
  processed boolean default false
);

create or replace function public.enqueue_region_update()
returns trigger as $$
begin
  if (old.* is distinct from new.*) then
    insert into public.library_updates_queue (jurisdiction_key) values (new.jurisdiction_key);
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_enqueue_region_update on public.library_regions;
create trigger trg_enqueue_region_update
after update on public.library_regions
for each row execute function public.enqueue_region_update();


A scheduled Edge Function (every hour) reads unprocessed rows, finds subscribers in library_watchlist, and sends in-app notification (or email) — and marks processed.

(If you don’t want Edge Functions yet, you can poll from the app on login and show a bell badge.)

6) Tiny UX upgrades

Clause search: swap your current GET to the FTS route for faster/snappier results.

Jurisdiction builder: add a “Watch” toggle next to the jurisdiction badge:

<label className="flex items-center gap-2 text-xs">
  <input type="checkbox" checked={watched} onChange={toggleWatch} />
  Watch updates for {region.jurisdiction_key}
</label>


Conflict warnings: when user mixes global + city clause that contradicts state (later; simple heuristic: tag “overrides_state” and warn).

7) Seed data (quick start)
-- TX (state)
insert into public.library_regions (state, county, city, jurisdiction_key, regulation_level, summary, requirements, sources, risk_score)
values (
  'TX', null, null, 'TX', 'conditional',
  'STR allowed varies by city; many require hotel occupancy tax registration. MTR (30+ days) broadly allowed.',
  '{"permits":["State hotel occupancy tax registration (as applicable)"],"taxes":["HOT 6% state + local"],"occupancy_caps":null,"hoa":"Check community rules"}'::jsonb,
  '[{"title":"Texas HOT","url":"https://comptroller.texas.gov/taxes/hotel/"}]'::jsonb,
  5
)
on conflict (jurisdiction_key) do nothing;

-- Clause examples
insert into public.library_clauses (jurisdiction_key, title, body_md, tags, is_global)
values
('TX', 'Local Compliance', 'Operator shall obtain and maintain all registrations, permits, and tax accounts required by the city, county, or state for short-term or mid-term rentals.', '{compliance,permits,tax}', false),
('TX:Austin', 'Austin STR Notice', 'Operator acknowledges Austin-specific STR requirements and agrees to adhere to applicable limits and enforcement provisions.', '{austin,compliance}', false),
('GLOBAL', 'Quiet Hours', 'Quiet hours are 10:00 PM to 7:00 AM. Parties and events are prohibited without prior written consent.', '{noise,house_rules}', true)
;

8) Integrations recap (so data flows clean)

Estimator/ROI → Library: when user clicks “Generate Addendum,” pre-select tags (e.g., sublease, utilities) and jurisdiction from property.

Messaging: drop addendum as attachment into the owner thread after export (Premium).

Portfolio: link each property to its last exported addendum (file_url) for quick retrieval.

What changed vs. your baseline

Faster searching (FTS + GIN)

Admin-safe writes with RLS

Clause version history

Real PDF export to Storage (Premium)

“Watch updates” scaffolding for jurisdiction alerts

Beta/Pro gating enforced server-side
