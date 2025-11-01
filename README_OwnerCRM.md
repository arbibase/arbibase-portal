a true Owner Portal (owner-facing CRM) where property owners can log in, reply to operators, submit/manage listings, upload docs/photos, and track verification—separate from the operator’s CRM. Let’s spec and ship that.

Below is a drop-in blueprint: DB schema, RLS, storage, API routes, and the core React pages. It reuses your existing messaging fabric but adds owner roles, listings, applications, and a verification hand-off.

1) Roles & Identity
1.1 Profiles

Add an explicit role so owners can authenticate and see the owner console.

alter table public.profiles
  add column if not exists role text check (role in ('operator','owner','admin')) default 'operator';

create index if not exists idx_profiles_role on public.profiles(role);


Auth flows supported

Invite owners via magic link (email) → creates auth.users + profiles.role='owner'.

Owners can self-sign up from /owner/login → default role='owner'.

2) Core Data Model (Owner Portal)
2.1 Owner account & team
create table if not exists public.owner_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- the owner’s user
  display_name text not null,                                        -- "Jane Realty LLC"
  phone text, email text,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Optional: allow multiple team members per owner account
create table if not exists public.owner_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'owner_admin', -- owner_admin|owner_editor|owner_viewer
  created_at timestamptz default now(),
  unique(account_id, user_id)
);

2.2 Listings (owner-submitted)
create table if not exists public.owner_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  -- address block
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  lat numeric, lng numeric,
  -- unit details
  bedrooms int, bathrooms numeric, sqft int,
  furnished boolean default false,
  parking text, pets text,
  amenities text[],                   -- ['pool','gym','washer_dryer']
  photos jsonb default '[]',          -- [{path,width,height}]
  -- rental policy for arbitrage
  arbitrage_allowed boolean,          -- owner's explicit setting
  allowed_terms text[] default '{}',  -- ['STR','MTR','LTR'] (what owner allows)
  conditions_md text,                 -- owner notes/clauses
  -- economics the owner expects
  asking_rent numeric,                -- monthly LTR (base lease to operator)
  deposit numeric, utilities text,    -- 'owner','tenant','split'
  -- workflow
  status text not null default 'draft',  -- draft|submitted|under_review|approved|denied|archived
  verification_score numeric,            -- set by your pipeline
  verification_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_owner_listings_account on public.owner_listings(account_id);
create index if not exists idx_owner_listings_status on public.owner_listings(status);

2.3 Listing ↔ Property binding (once approved)
-- If you already have public.properties as operator-facing canonical properties
alter table public.properties
  add column if not exists owner_listing_id uuid references public.owner_listings(id) on delete set null;

2.4 Applications (operators apply to an owner listing)
create table if not exists public.owner_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.owner_listings(id) on delete cascade,
  operator_id uuid not null references auth.users(id) on delete cascade, -- operator user id
  message text,
  attachments jsonb default '[]',         -- [{path,title}]
  status text not null default 'new',     -- new|shortlisted|rejected|accepted
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(listing_id, operator_id)
);
create index if not exists idx_owner_apps_listing on public.owner_applications(listing_id);

2.5 Conversation linking (owner ↔ operator, per listing or application)

Reuse your conversations table; add a join:

create table if not exists public.owner_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.owner_listings(id) on delete cascade,
  application_id uuid references public.owner_applications(id) on delete cascade,
  conversation_id uuid not null, -- points to your existing messages/conversations
  created_at timestamptz default now()
);

3) Storage

Buckets

owner-listing-photos (private)

owner-docs (private)

Owners upload images/docs via signed URLs; operators only see after listing is submitted or if they’re part of an application thread.

4) Security (RLS)
alter table public.owner_accounts enable row level security;
alter table public.owner_members enable row level security;
alter table public.owner_listings enable row level security;
alter table public.owner_applications enable row level security;
alter table public.owner_conversations enable row level security;

-- Helpers: is current user an owner member?
create or replace function public.is_owner_member(p_account uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.owner_members m
    where m.account_id = p_account and m.user_id = auth.uid()
  );
$$;

-- Owner Accounts: owner can read/write their account
create policy "owner accounts rw" on public.owner_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Members: only within same owner account
create policy "owner members rw" on public.owner_members
  for all using (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()))
  with check (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()));

-- Listings: owner members can rw their listings; operators can read approved (marketplace)
create policy "listings owner rw" on public.owner_listings
  for all using (public.is_owner_member(account_id))
  with check (public.is_owner_member(account_id));

create policy "listings public read approved" on public.owner_listings
  for select using (status in ('approved')); -- visible in operator marketplace

-- Applications: owner sees applications to their listings; operator sees their own apps
create policy "apps owner read" on public.owner_applications
  for select using (
    exists (select 1 from public.owner_listings l where l.id=listing_id and public.is_owner_member(l.account_id))
  );
create policy "apps operator rw self" on public.owner_applications
  for all using (operator_id = auth.uid()) with check (operator_id = auth.uid());

5) API (Next.js App Router)
5.1 Owner “Me” bundle
// src/app/api/owner/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== 'owner') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: account } = await sb.from("owner_accounts").select("*").eq("user_id", user.id).maybeSingle();
  const { data: listings } = await sb.from("owner_listings").select("*").eq("account_id", account?.id || "").order("updated_at",{ascending:false});
  const { data: apps } = await sb.from("owner_applications")
    .select("*, listing:owner_listings(address_line1,city,state,zip)")
    .in("listing_id", (listings||[]).map(l=>l.id));

  return NextResponse.json({ account, listings: listings||[], applications: apps||[] });
}

5.2 Listings CRUD (owner)
// src/app/api/owner/listings/route.ts  (POST create, GET list)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();
  const { data, error } = await sb.from("owner_listings").select("*").eq("account_id", account?.id||"");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();
  const insert = { ...body, account_id: account!.id, status: 'draft' };
  const { data, error } = await sb.from("owner_listings").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

5.3 Listing submit/withdraw
// src/app/api/owner/listings/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
export async function POST(_:NextRequest,{params}:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  // validate ownership via RLS; set status->submitted
  const { error } = await sb.from("owner_listings").update({ status:'submitted', updated_at: new Date().toISOString() }).eq("id", params.id);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ ok:true });
}

5.4 Operator applications to a listing
// src/app/api/listings/[id]/apply/route.ts  (operator-side)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
export async function POST(_:NextRequest,{params}:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  // role check: must be operator
  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if(prof?.role !== 'operator') return NextResponse.json({error:"Forbidden"},{status:403});

  const { data, error } = await sb.from("owner_applications").insert({
    listing_id: params.id, operator_id: user.id, status: 'new'
  }).select("id").single();
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ id: data.id });
}

6) Messaging integration (owner ↔ operator)

How it works

When an operator applies to a listing, create a conversation and link it in owner_conversations with application_id.

Owner and the applying operator can message in-app on that thread.

Use your existing message tables; just ensure participant rules include the owner user and the operator user.

API sketch to bootstrap a conversation

// src/app/api/applications/[id]/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_:NextRequest,{params}:{params:{id:string}}){
  const sb = getSupabaseServer();
  // load application with listing + owner account
  const { data: app } = await sb.from("owner_applications")
    .select("id, listing_id, operator_id, listing:owner_listings(account_id)")
    .eq("id", params.id).single();

  // create conversation in your existing messaging table, add participants: app.operator_id + owner account's user_id
  // then store row in owner_conversations { application_id: app.id, conversation_id: ... }
  return NextResponse.json({ ok:true/*, conversationId*/ });
}

7) Owner Portal UI (React)
7.1 Owner Dashboard

path: /owner

cards: “Listings (Draft/Submitted/Approved)”, “New Applications”, “Pending Messages”, quick CTA “Create Listing”.

7.2 Listing Wizard (4 steps)

Basics (address, map pin)

Unit & Amenities (beds/baths/sqft, amenities, photos upload)

Arbitrage Policy (allowed, conditions, allowed terms STR/MTR/LTR, required addendum clauses)

Economics (asking rent, deposit, utilities responsibility)

Submit → status submitted → triggers Verification Pipeline card creation.

Component skeleton

// src/app/(owner)/owner/listings/new/page.tsx
"use client";
import { useState } from "react";
export default function NewListing(){
  const [step,setStep] = useState(1);
  const [form,setForm] = useState<any>({ city:'', state:'', zip:'', bedrooms:1, allowed_terms:['MTR'] });

  async function saveDraft(){ await fetch("/api/owner/listings", { method:"POST", body: JSON.stringify(form) }); }
  async function submit(id:string){ await fetch(`/api/owner/listings/${id}/submit`, { method:"POST" }); }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">New Listing</h1>
      {/* render step panels; on last step call submit */}
    </div>
  );
}

7.3 Owners: Listings table

Filter by status; inline badge for arbitrage_allowed, allowed_terms.

Row actions: Edit, Submit, Archive.

7.4 Owners: Applications drawer

For each application: operator name (from profiles), message, attachments, status chip (new/shortlisted/rejected/accepted), Open Conversation button.

8) Verification pipeline hand-off

When an owner submits a listing:

Create/Upsert a verification card in property_verifications with stage “Doc Review”.

Run your existing composite score (Estimator/ROI + Library risk + Market risk) and write verification_score.

On approved:

Set listing status='approved'.

Create/attach canonical property row (if not exists) and link owner_listing_id.

Expose in the operator marketplace (respect tier gates).

9) Operator Marketplace updates (consuming approved owner listings)

The operator Property Browser shows owner_listings where status='approved'.

Operators can Apply (POST to /listings/:id/apply).

Tier rules still apply (search filters, contact allotments, etc.).

10) Tier model (who pays for what)

Owners: free portal (frictionless supply).

Operators (your customers):

Beta: View approved listings + Apply with daily cap.

Pro: Unlimited views + in-thread messaging + application attachments.

Premium: Priority messaging badge, owner call scheduling, document exchange and counter-offer templates.

Gate these on operator endpoints (apply, messaging) by checking profiles.tier.

11) Nice-to-haves (fast follow)

Calendar connect (optional): allow owners to connect a calendar link for call slots; embed in the conversation.

Doc signing (Premium): Dropbox Sign/DocuSign—expose to owners in “Documents” and mirror to operator thread.

Stripe Connect (later): owner payouts dashboard if you broker payments.

Bulk import: CSV import of many units into owner_listings.

Auto redaction: sanitize images (metadata) on upload.

12) Minimal “done-ness” checklist

 Role 'owner' wired; magic-link invite working

 owner_accounts created on first owner login

 Listing Wizard CRUD + Submit → Verification card created

 RLS prevents cross-tenant data leaks

 Approved listings visible in operator marketplace

 Application flow + conversation bootstrap (owner↔operator)

 Owner Dashboard shows Applications & Messages

 here are commit-ready files to paste into your repo. They include:

Supabase SQL migrations (roles, owner portal tables, RLS & policies)

API routes (owner “me”, listings CRUD + submit, operator apply, app→conversation bootstrap)

Owner pages: Dashboard and Listing Wizard (Next.js App Router, Tailwind)

Paths assume your existing structure: /supabase/migrations, /src/app/api, /src/app/(owner).
If a file already exists, merge rather than overwrite. Comments marked // TODO are safe to ship and fill later.

1) Supabase SQL migrations
/supabase/migrations/20251101-001_owner_portal_core.sql
-- 1) Profiles role
alter table public.profiles
  add column if not exists role text check (role in ('operator','owner','admin')) default 'operator';

create index if not exists idx_profiles_role on public.profiles(role);

-- 2) Owner accounts & members
create table if not exists public.owner_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  phone text, email text,
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists public.owner_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'owner_admin',
  created_at timestamptz default now(),
  unique(account_id, user_id)
);

-- 3) Owner listings
create table if not exists public.owner_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  lat numeric, lng numeric,
  bedrooms int, bathrooms numeric, sqft int,
  furnished boolean default false,
  parking text, pets text,
  amenities text[] default '{}',
  photos jsonb default '[]',
  arbitrage_allowed boolean,
  allowed_terms text[] default '{}', -- ['STR','MTR','LTR']
  conditions_md text,
  asking_rent numeric,
  deposit numeric,
  utilities text, -- 'owner'|'tenant'|'split'
  status text not null default 'draft', -- draft|submitted|under_review|approved|denied|archived
  verification_score numeric,
  verification_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_owner_listings_account on public.owner_listings(account_id);
create index if not exists idx_owner_listings_status on public.owner_listings(status);

-- 4) Applications (operators apply to owner listings)
create table if not exists public.owner_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.owner_listings(id) on delete cascade,
  operator_id uuid not null references auth.users(id) on delete cascade,
  message text,
  attachments jsonb default '[]',
  status text not null default 'new', -- new|shortlisted|rejected|accepted
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(listing_id, operator_id)
);
create index if not exists idx_owner_apps_listing on public.owner_applications(listing_id);

-- 5) Conversation link (reusing your messages infra)
create table if not exists public.owner_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.owner_listings(id) on delete cascade,
  application_id uuid references public.owner_applications(id) on delete cascade,
  conversation_id uuid not null,
  created_at timestamptz default now()
);

-- 6) Canonical property linkage (optional)
alter table public.properties
  add column if not exists owner_listing_id uuid references public.owner_listings(id) on delete set null;

-- 7) RLS & helper
alter table public.owner_accounts enable row level security;
alter table public.owner_members enable row level security;
alter table public.owner_listings enable row level security;
alter table public.owner_applications enable row level security;
alter table public.owner_conversations enable row level security;

create or replace function public.is_owner_member(p_account uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.owner_members m
    where m.account_id = p_account and m.user_id = auth.uid()
  );
$$;

-- Owner accounts: owner user rw
drop policy if exists "owner accounts rw" on public.owner_accounts;
create policy "owner accounts rw" on public.owner_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Owner members: any member rw within account
drop policy if exists "owner members rw" on public.owner_members;
create policy "owner members rw" on public.owner_members
  for all using (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()))
  with check (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()));

-- Listings: owners rw their listings; public read only approved
drop policy if exists "listings owner rw" on public.owner_listings;
create policy "listings owner rw" on public.owner_listings
  for all using (public.is_owner_member(account_id))
  with check (public.is_owner_member(account_id));

drop policy if exists "listings public read approved" on public.owner_listings;
create policy "listings public read approved" on public.owner_listings
  for select using (status in ('approved'));

-- Applications: owner reads apps to their listings; operator rw own app
drop policy if exists "apps owner read" on public.owner_applications;
create policy "apps owner read" on public.owner_applications
  for select using (
    exists (select 1 from public.owner_listings l where l.id=listing_id and public.is_owner_member(l.account_id))
  );

drop policy if exists "apps operator rw self" on public.owner_applications;
create policy "apps operator rw self" on public.owner_applications
  for all using (operator_id = auth.uid())
  with check (operator_id = auth.uid());

-- Owner conversations: owner or operator in related app/listing can read
drop policy if exists "owner conv read" on public.owner_conversations;
create policy "owner conv read" on public.owner_conversations
  for select using (
    exists (
      select 1 from public.owner_applications a
      join public.owner_listings l on l.id = a.listing_id
      where owner_conversations.application_id = a.id
        and (a.operator_id = auth.uid() or public.is_owner_member(l.account_id))
    )
    or
    exists (
      select 1 from public.owner_listings l
      where owner_conversations.listing_id = l.id
        and public.is_owner_member(l.account_id)
    )
  );

2) API routes

Uses your getSupabaseServer() helper (adjust import if different). All return JSON. Add to src/app/api.

src/app/api/owner/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ensure account exists
  let { data: account } = await sb.from("owner_accounts").select("*").eq("user_id", user.id).maybeSingle();
  if (!account) {
    const ins = await sb.from("owner_accounts").insert({
      user_id: user.id,
      display_name: profile?.full_name || user.email || "Owner"
    }).select("*").single();
    account = ins.data!;
    await sb.from("owner_members").insert({ account_id: account.id, user_id: user.id, role: "owner_admin" });
  }

  const listings = (await sb.from("owner_listings").select("*").eq("account_id", account.id).order("updated_at", { ascending: false })).data || [];
  const apps = (await sb.from("owner_applications")
    .select("*, listing:owner_listings(address_line1,city,state,zip)")
    .in("listing_id", listings.map(l => l.id))).data || [];

  return NextResponse.json({ account, listings, applications: apps });
}

src/app/api/owner/listings/route.ts (GET list, POST create draft)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();
  const { data, error } = await sb.from("owner_listings").select("*").eq("account_id", account?.id || "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();

  const insert = { ...body, account_id: account!.id, status: "draft" };
  const { data, error } = await sb.from("owner_listings").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

src/app/api/owner/listings/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS ensures ownership — just update
  const { error } = await sb.from("owner_listings")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: enqueue verification card creation here (e.g., via Edge Function or server route)
  return NextResponse.json({ ok: true });
}

src/app/api/listings/[id]/apply/route.ts (operator applies)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "operator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await sb.from("owner_applications").insert({
    listing_id: params.id, operator_id: user.id, status: "new"
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: bootstrap conversation & link in owner_conversations
  return NextResponse.json({ id: data.id });
}

src/app/api/applications/[id]/conversation/route.ts (bootstrap thread)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();

  const { data: app, error } = await sb.from("owner_applications")
    .select("id, listing_id, operator_id, listing:owner_listings(account_id)")
    .eq("id", params.id).single();
  if (error || !app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // TODO: create conversation in your existing messaging system and capture its id
  // const conversationId = await createConversation([app.operator_id, owner_user_id]);
  // await sb.from("owner_conversations").insert({ application_id: app.id, listing_id: app.listing_id, conversation_id });

  return NextResponse.json({ ok: true /*, conversationId*/ });
}

3) Owner pages (Next.js App Router)

Put these under (owner) segment so styling and auth can differ if you want.

src/app/(owner)/owner/page.tsx (Owner Dashboard)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OwnerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    const r = await fetch("/api/owner/me");
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (data?.error) return <div className="p-6 text-red-400">{data.error}</div>;

  const listings = data.listings || [];
  const apps = data.applications || [];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">Owner Portal</h1>
        <Link href="/owner/listings/new" className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">Create Listing</Link>
      </div>

      {/* Listing summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat title="Draft" value={listings.filter((l:any)=>l.status==='draft').length} />
        <Stat title="Submitted" value={listings.filter((l:any)=>l.status==='submitted').length} />
        <Stat title="Approved" value={listings.filter((l:any)=>l.status==='approved').length} />
        <Stat title="Applications" value={apps.length} />
      </div>

      {/* Listings table */}
      <Card title="Your Listings">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60">
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">City/State</th>
                <th className="p-2">Beds</th>
                <th className="p-2">Status</th>
                <th className="p-2">Updated</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l:any)=>(
                <tr key={l.id} className="border-t border-white/10">
                  <td className="p-2">{l.address_line1}</td>
                  <td className="p-2">{l.city}, {l.state}</td>
                  <td className="p-2 text-center">{l.bedrooms ?? '—'}</td>
                  <td className="p-2 text-center"><StatusChip s={l.status} /></td>
                  <td className="p-2 text-center">{new Date(l.updated_at).toLocaleDateString()}</td>
                  <td className="p-2 text-right">
                    <Link href={`/owner/listings/${l.id}/edit`} className="text-emerald-300 underline">Edit</Link>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr><td className="p-4 text-white/60" colSpan={6}>No listings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Applications */}
      <Card title="Recent Applications">
        <ul className="divide-y divide-white/10 text-sm">
          {apps.map((a:any)=>(
            <li key={a.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.listing?.address_line1} • <span className="text-white/60">{a.status}</span></div>
                <div className="text-white/50">{new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {/* TODO: link to conversation once bootstrapped */}
                <button className="rounded bg-white/10 px-2 py-1 text-xs">Open Conversation</button>
              </div>
            </li>
          ))}
          {apps.length === 0 && <li className="py-2 text-white/60">No applications yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/70 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
function StatusChip({ s }:{ s:string }) {
  const map:any = {
    draft: "bg-slate-700 text-slate-200",
    submitted: "bg-amber-700 text-amber-200",
    under_review: "bg-blue-700 text-blue-200",
    approved: "bg-emerald-700 text-emerald-200",
    denied: "bg-red-700 text-red-200",
    archived: "bg-zinc-700 text-zinc-200"
  };
  return <span className={`px-2 py-1 rounded text-xs ${map[s]||'bg-slate-700 text-slate-200'}`}>{s.replace('_',' ')}</span>;
}

src/app/(owner)/owner/listings/new/page.tsx (Listing Wizard — minimal 4 steps)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListing() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    address_line1: "", address_line2: "", city: "", state: "", zip: "",
    bedrooms: 1, bathrooms: 1, sqft: 600, furnished: false,
    amenities: [], parking: "", pets: "",
    arbitrage_allowed: true, allowed_terms: ["MTR"], conditions_md: "",
    asking_rent: 2000, deposit: 2000, utilities: "tenant"
  });

  function next(){ setStep(s => Math.min(4, s+1)); }
  function prev(){ setStep(s => Math.max(1, s-1)); }
  const set = (k:string, v:any)=> setForm((f:any)=>({ ...f, [k]: v }));

  async function saveDraft() {
    setSaving(true);
    const r = await fetch("/api/owner/listings", { method: "POST", body: JSON.stringify(form) });
    const j = await r.json();
    setSaving(false);
    if (j.id) { setListingId(j.id); return true; }
    alert(j.error || "Failed to save.");
    return false;
  }
  async function submit() {
    if (!listingId) {
      const ok = await saveDraft();
      if (!ok) return;
    }
    const id = listingId!;
    const r = await fetch(`/api/owner/listings/${id}/submit`, { method: "POST" });
    const j = await r.json();
    if (j.ok) router.push("/owner");
    else alert(j.error || "Failed to submit.");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Create Listing</h1>

      {/* Stepper */}
      <div className="flex gap-2 text-xs text-white/60">
        {["Basics","Unit & Amenities","Arbitrage Policy","Economics"].map((t,i)=>(
          <span key={t} className={`px-2 py-1 rounded ${step===i+1?'bg-white/10 text-white':'bg-white/5'}`}>{i+1}. {t}</span>
        ))}
      </div>

      {step===1 && (
        <Panel title="Basics">
          <Grid>
            <Input label="Address line 1" value={form.address_line1} onChange={v=>set("address_line1", v)} />
            <Input label="Address line 2" value={form.address_line2} onChange={v=>set("address_line2", v)} />
            <Input label="City" value={form.city} onChange={v=>set("city", v)} />
            <Input label="State (e.g., TX)" value={form.state} onChange={v=>set("state", v)} />
            <Input label="ZIP" value={form.zip} onChange={v=>set("zip", v)} />
          </Grid>
        </Panel>
      )}

      {step===2 && (
        <Panel title="Unit & Amenities">
          <Grid>
            <Number label="Bedrooms" value={form.bedrooms} onChange={v=>set("bedrooms", v)} />
            <Number label="Bathrooms" value={form.bathrooms} onChange={v=>set("bathrooms", v)} />
            <Number label="Sqft" value={form.sqft} onChange={v=>set("sqft", v)} />
            <Toggle label="Furnished" value={form.furnished} onChange={v=>set("furnished", v)} />
            <Input label="Parking" value={form.parking} onChange={v=>set("parking", v)} />
            <Input label="Pets" value={form.pets} onChange={v=>set("pets", v)} />
          </Grid>
          <Tags label="Amenities" value={form.amenities} onChange={v=>set("amenities", v)} suggestions={["pool","gym","washer_dryer","ac","balcony"]}/>
        </Panel>
      )}

      {step===3 && (
        <Panel title="Arbitrage Policy">
          <Toggle label="Arbitrage Allowed" value={form.arbitrage_allowed} onChange={v=>set("arbitrage_allowed", v)} />
          <Tags label="Allowed Terms" value={form.allowed_terms} onChange={v=>set("allowed_terms", v)} suggestions={["STR","MTR","LTR"]}/>
          <TextArea label="Conditions / Notes" value={form.conditions_md} onChange={v=>set("conditions_md", v)} rows={6}/>
        </Panel>
      )}

      {step===4 && (
        <Panel title="Economics">
          <Grid>
            <Number label="Asking Rent (monthly)" value={form.asking_rent} onChange={v=>set("asking_rent", v)} />
            <Number label="Deposit" value={form.deposit} onChange={v=>set("deposit", v)} />
            <Select label="Utilities responsibility" value={form.utilities} onChange={v=>set("utilities", v)} options={["owner","tenant","split"]}/>
          </Grid>
        </Panel>
      )}

      <div className="flex items-center gap-2">
        <button onClick={prev} disabled={step===1} className="rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-40">Back</button>
        {step<4 ? (
          <button onClick={next} className="rounded bg-white/10 px-3 py-2 text-sm">Next</button>
        ) : (
          <button onClick={submit} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">
            {listingId ? "Submit Listing" : "Save & Submit"}
          </button>
        )}
        <button onClick={async()=>{ await saveDraft(); alert("Draft saved."); }} disabled={saving}
                className="ml-auto rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-40">
          {saving ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}

function Panel({title, children}:{title:string; children:any}){
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
    <div className="text-sm text-white/70 font-semibold">{title}</div>{children}
  </div>;
}
function Grid({children}:{children:any}){ return <div className="grid md:grid-cols-2 gap-3">{children}</div>; }
function Input({label, value, onChange}:{label:string; value:any; onChange:(v:any)=>void}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Number({label, value, onChange}:{label:string; value:number; onChange:(v:number)=>void}){
  return <Input label={label} value={value} onChange={(v:any)=>onChange(Number(v))} />;
}
function Toggle({label, value, onChange}:{label:string; value:boolean; onChange:(v:boolean)=>void}){
  return <label className="text-sm flex items-center gap-2">
    <input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/>
    <span className="text-white/60">{label}</span>
  </label>;
}
function Tags({label, value, onChange, suggestions}:{label:string; value:string[]; onChange:(v:string[])=>void; suggestions:string[]}){
  const add=(t:string)=> !value.includes(t) && onChange([...value,t]);
  const remove=(t:string)=> onChange(value.filter(x=>x!==t));
  return <div className="text-sm">
    <div className="text-white/60 mb-1">{label}</div>
    <div className="flex flex-wrap gap-2 mb-2">
      {value.map(t=>(
        <span key={t} className="px-2 py-1 rounded bg-white/10">{t}
          <button className="ml-1 text-white/50" onClick={()=>remove(t)}>×</button>
        </span>
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      {suggestions.map(s=>(
        <button key={s} onClick={()=>add(s)} className="rounded bg-white/10 px-2 py-1">{s}</button>
      ))}
    </div>
  </div>;
}
function TextArea({label, value, onChange, rows=4}:{label:string; value:string; onChange:(v:string)=>void; rows?:number}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <textarea rows={rows} className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
              value={value} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Select({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <select className="w-full rounded bg-white/5 border border-white/10 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o} value={o} className="bg-[#0b141d]">{o}</option>)}
    </select>
  </label>;
}

4) Minimal wiring notes

Auth routing: add a guard so /owner/** is only accessible to profiles.role='owner'.

Storage: create private buckets owner-listing-photos and owner-docs (signed URL upload later).

Verification hand-off: when listing is submitted, create a verification card in your existing pipeline (stage “Doc Review”) and compute verification_score.

Messaging: when an operator applies, create a conversation with participants [operator_id, owner_user_id], then insert owner_conversations row.

here are commit-ready files to paste into your repo. They include:

Supabase SQL migrations (roles, owner portal tables, RLS & policies)

API routes (owner “me”, listings CRUD + submit, operator apply, app→conversation bootstrap)

Owner pages: Dashboard and Listing Wizard (Next.js App Router, Tailwind)

Paths assume your existing structure: /supabase/migrations, /src/app/api, /src/app/(owner).
If a file already exists, merge rather than overwrite. Comments marked // TODO are safe to ship and fill later.

1) Supabase SQL migrations
/supabase/migrations/20251101-001_owner_portal_core.sql
-- 1) Profiles role
alter table public.profiles
  add column if not exists role text check (role in ('operator','owner','admin')) default 'operator';

create index if not exists idx_profiles_role on public.profiles(role);

-- 2) Owner accounts & members
create table if not exists public.owner_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  phone text, email text,
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists public.owner_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'owner_admin',
  created_at timestamptz default now(),
  unique(account_id, user_id)
);

-- 3) Owner listings
create table if not exists public.owner_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.owner_accounts(id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  lat numeric, lng numeric,
  bedrooms int, bathrooms numeric, sqft int,
  furnished boolean default false,
  parking text, pets text,
  amenities text[] default '{}',
  photos jsonb default '[]',
  arbitrage_allowed boolean,
  allowed_terms text[] default '{}', -- ['STR','MTR','LTR']
  conditions_md text,
  asking_rent numeric,
  deposit numeric,
  utilities text, -- 'owner'|'tenant'|'split'
  status text not null default 'draft', -- draft|submitted|under_review|approved|denied|archived
  verification_score numeric,
  verification_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_owner_listings_account on public.owner_listings(account_id);
create index if not exists idx_owner_listings_status on public.owner_listings(status);

-- 4) Applications (operators apply to owner listings)
create table if not exists public.owner_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.owner_listings(id) on delete cascade,
  operator_id uuid not null references auth.users(id) on delete cascade,
  message text,
  attachments jsonb default '[]',
  status text not null default 'new', -- new|shortlisted|rejected|accepted
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(listing_id, operator_id)
);
create index if not exists idx_owner_apps_listing on public.owner_applications(listing_id);

-- 5) Conversation link (reusing your messages infra)
create table if not exists public.owner_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.owner_listings(id) on delete cascade,
  application_id uuid references public.owner_applications(id) on delete cascade,
  conversation_id uuid not null,
  created_at timestamptz default now()
);

-- 6) Canonical property linkage (optional)
alter table public.properties
  add column if not exists owner_listing_id uuid references public.owner_listings(id) on delete set null;

-- 7) RLS & helper
alter table public.owner_accounts enable row level security;
alter table public.owner_members enable row level security;
alter table public.owner_listings enable row level security;
alter table public.owner_applications enable row level security;
alter table public.owner_conversations enable row level security;

create or replace function public.is_owner_member(p_account uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.owner_members m
    where m.account_id = p_account and m.user_id = auth.uid()
  );
$$;

-- Owner accounts: owner user rw
drop policy if exists "owner accounts rw" on public.owner_accounts;
create policy "owner accounts rw" on public.owner_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Owner members: any member rw within account
drop policy if exists "owner members rw" on public.owner_members;
create policy "owner members rw" on public.owner_members
  for all using (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()))
  with check (exists (select 1 from public.owner_accounts a where a.id=account_id and a.user_id=auth.uid()));

-- Listings: owners rw their listings; public read only approved
drop policy if exists "listings owner rw" on public.owner_listings;
create policy "listings owner rw" on public.owner_listings
  for all using (public.is_owner_member(account_id))
  with check (public.is_owner_member(account_id));

drop policy if exists "listings public read approved" on public.owner_listings;
create policy "listings public read approved" on public.owner_listings
  for select using (status in ('approved'));

-- Applications: owner reads apps to their listings; operator rw own app
drop policy if exists "apps owner read" on public.owner_applications;
create policy "apps owner read" on public.owner_applications
  for select using (
    exists (select 1 from public.owner_listings l where l.id=listing_id and public.is_owner_member(l.account_id))
  );

drop policy if exists "apps operator rw self" on public.owner_applications;
create policy "apps operator rw self" on public.owner_applications
  for all using (operator_id = auth.uid())
  with check (operator_id = auth.uid());

-- Owner conversations: owner or operator in related app/listing can read
drop policy if exists "owner conv read" on public.owner_conversations;
create policy "owner conv read" on public.owner_conversations
  for select using (
    exists (
      select 1 from public.owner_applications a
      join public.owner_listings l on l.id = a.listing_id
      where owner_conversations.application_id = a.id
        and (a.operator_id = auth.uid() or public.is_owner_member(l.account_id))
    )
    or
    exists (
      select 1 from public.owner_listings l
      where owner_conversations.listing_id = l.id
        and public.is_owner_member(l.account_id)
    )
  );

2) API routes

Uses your getSupabaseServer() helper (adjust import if different). All return JSON. Add to src/app/api.

src/app/api/owner/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ensure account exists
  let { data: account } = await sb.from("owner_accounts").select("*").eq("user_id", user.id).maybeSingle();
  if (!account) {
    const ins = await sb.from("owner_accounts").insert({
      user_id: user.id,
      display_name: profile?.full_name || user.email || "Owner"
    }).select("*").single();
    account = ins.data!;
    await sb.from("owner_members").insert({ account_id: account.id, user_id: user.id, role: "owner_admin" });
  }

  const listings = (await sb.from("owner_listings").select("*").eq("account_id", account.id).order("updated_at", { ascending: false })).data || [];
  const apps = (await sb.from("owner_applications")
    .select("*, listing:owner_listings(address_line1,city,state,zip)")
    .in("listing_id", listings.map(l => l.id))).data || [];

  return NextResponse.json({ account, listings, applications: apps });
}

src/app/api/owner/listings/route.ts (GET list, POST create draft)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();
  const { data, error } = await sb.from("owner_listings").select("*").eq("account_id", account?.id || "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: account } = await sb.from("owner_accounts").select("id").eq("user_id", user.id).maybeSingle();

  const insert = { ...body, account_id: account!.id, status: "draft" };
  const { data, error } = await sb.from("owner_listings").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

src/app/api/owner/listings/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS ensures ownership — just update
  const { error } = await sb.from("owner_listings")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: enqueue verification card creation here (e.g., via Edge Function or server route)
  return NextResponse.json({ ok: true });
}

src/app/api/listings/[id]/apply/route.ts (operator applies)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "operator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await sb.from("owner_applications").insert({
    listing_id: params.id, operator_id: user.id, status: "new"
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: bootstrap conversation & link in owner_conversations
  return NextResponse.json({ id: data.id });
}

src/app/api/applications/[id]/conversation/route.ts (bootstrap thread)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();

  const { data: app, error } = await sb.from("owner_applications")
    .select("id, listing_id, operator_id, listing:owner_listings(account_id)")
    .eq("id", params.id).single();
  if (error || !app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // TODO: create conversation in your existing messaging system and capture its id
  // const conversationId = await createConversation([app.operator_id, owner_user_id]);
  // await sb.from("owner_conversations").insert({ application_id: app.id, listing_id: app.listing_id, conversation_id });

  return NextResponse.json({ ok: true /*, conversationId*/ });
}

3) Owner pages (Next.js App Router)

Put these under (owner) segment so styling and auth can differ if you want.

src/app/(owner)/owner/page.tsx (Owner Dashboard)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OwnerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    const r = await fetch("/api/owner/me");
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (data?.error) return <div className="p-6 text-red-400">{data.error}</div>;

  const listings = data.listings || [];
  const apps = data.applications || [];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">Owner Portal</h1>
        <Link href="/owner/listings/new" className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">Create Listing</Link>
      </div>

      {/* Listing summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat title="Draft" value={listings.filter((l:any)=>l.status==='draft').length} />
        <Stat title="Submitted" value={listings.filter((l:any)=>l.status==='submitted').length} />
        <Stat title="Approved" value={listings.filter((l:any)=>l.status==='approved').length} />
        <Stat title="Applications" value={apps.length} />
      </div>

      {/* Listings table */}
      <Card title="Your Listings">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60">
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">City/State</th>
                <th className="p-2">Beds</th>
                <th className="p-2">Status</th>
                <th className="p-2">Updated</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l:any)=>(
                <tr key={l.id} className="border-t border-white/10">
                  <td className="p-2">{l.address_line1}</td>
                  <td className="p-2">{l.city}, {l.state}</td>
                  <td className="p-2 text-center">{l.bedrooms ?? '—'}</td>
                  <td className="p-2 text-center"><StatusChip s={l.status} /></td>
                  <td className="p-2 text-center">{new Date(l.updated_at).toLocaleDateString()}</td>
                  <td className="p-2 text-right">
                    <Link href={`/owner/listings/${l.id}/edit`} className="text-emerald-300 underline">Edit</Link>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr><td className="p-4 text-white/60" colSpan={6}>No listings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Applications */}
      <Card title="Recent Applications">
        <ul className="divide-y divide-white/10 text-sm">
          {apps.map((a:any)=>(
            <li key={a.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.listing?.address_line1} • <span className="text-white/60">{a.status}</span></div>
                <div className="text-white/50">{new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {/* TODO: link to conversation once bootstrapped */}
                <button className="rounded bg-white/10 px-2 py-1 text-xs">Open Conversation</button>
              </div>
            </li>
          ))}
          {apps.length === 0 && <li className="py-2 text-white/60">No applications yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/70 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
function StatusChip({ s }:{ s:string }) {
  const map:any = {
    draft: "bg-slate-700 text-slate-200",
    submitted: "bg-amber-700 text-amber-200",
    under_review: "bg-blue-700 text-blue-200",
    approved: "bg-emerald-700 text-emerald-200",
    denied: "bg-red-700 text-red-200",
    archived: "bg-zinc-700 text-zinc-200"
  };
  return <span className={`px-2 py-1 rounded text-xs ${map[s]||'bg-slate-700 text-slate-200'}`}>{s.replace('_',' ')}</span>;
}

src/app/(owner)/owner/listings/new/page.tsx (Listing Wizard — minimal 4 steps)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListing() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    address_line1: "", address_line2: "", city: "", state: "", zip: "",
    bedrooms: 1, bathrooms: 1, sqft: 600, furnished: false,
    amenities: [], parking: "", pets: "",
    arbitrage_allowed: true, allowed_terms: ["MTR"], conditions_md: "",
    asking_rent: 2000, deposit: 2000, utilities: "tenant"
  });

  function next(){ setStep(s => Math.min(4, s+1)); }
  function prev(){ setStep(s => Math.max(1, s-1)); }
  const set = (k:string, v:any)=> setForm((f:any)=>({ ...f, [k]: v }));

  async function saveDraft() {
    setSaving(true);
    const r = await fetch("/api/owner/listings", { method: "POST", body: JSON.stringify(form) });
    const j = await r.json();
    setSaving(false);
    if (j.id) { setListingId(j.id); return true; }
    alert(j.error || "Failed to save.");
    return false;
  }
  async function submit() {
    if (!listingId) {
      const ok = await saveDraft();
      if (!ok) return;
    }
    const id = listingId!;
    const r = await fetch(`/api/owner/listings/${id}/submit`, { method: "POST" });
    const j = await r.json();
    if (j.ok) router.push("/owner");
    else alert(j.error || "Failed to submit.");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Create Listing</h1>

      {/* Stepper */}
      <div className="flex gap-2 text-xs text-white/60">
        {["Basics","Unit & Amenities","Arbitrage Policy","Economics"].map((t,i)=>(
          <span key={t} className={`px-2 py-1 rounded ${step===i+1?'bg-white/10 text-white':'bg-white/5'}`}>{i+1}. {t}</span>
        ))}
      </div>

      {step===1 && (
        <Panel title="Basics">
          <Grid>
            <Input label="Address line 1" value={form.address_line1} onChange={v=>set("address_line1", v)} />
            <Input label="Address line 2" value={form.address_line2} onChange={v=>set("address_line2", v)} />
            <Input label="City" value={form.city} onChange={v=>set("city", v)} />
            <Input label="State (e.g., TX)" value={form.state} onChange={v=>set("state", v)} />
            <Input label="ZIP" value={form.zip} onChange={v=>set("zip", v)} />
          </Grid>
        </Panel>
      )}

      {step===2 && (
        <Panel title="Unit & Amenities">
          <Grid>
            <Number label="Bedrooms" value={form.bedrooms} onChange={v=>set("bedrooms", v)} />
            <Number label="Bathrooms" value={form.bathrooms} onChange={v=>set("bathrooms", v)} />
            <Number label="Sqft" value={form.sqft} onChange={v=>set("sqft", v)} />
            <Toggle label="Furnished" value={form.furnished} onChange={v=>set("furnished", v)} />
            <Input label="Parking" value={form.parking} onChange={v=>set("parking", v)} />
            <Input label="Pets" value={form.pets} onChange={v=>set("pets", v)} />
          </Grid>
          <Tags label="Amenities" value={form.amenities} onChange={v=>set("amenities", v)} suggestions={["pool","gym","washer_dryer","ac","balcony"]}/>
        </Panel>
      )}

      {step===3 && (
        <Panel title="Arbitrage Policy">
          <Toggle label="Arbitrage Allowed" value={form.arbitrage_allowed} onChange={v=>set("arbitrage_allowed", v)} />
          <Tags label="Allowed Terms" value={form.allowed_terms} onChange={v=>set("allowed_terms", v)} suggestions={["STR","MTR","LTR"]}/>
          <TextArea label="Conditions / Notes" value={form.conditions_md} onChange={v=>set("conditions_md", v)} rows={6}/>
        </Panel>
      )}

      {step===4 && (
        <Panel title="Economics">
          <Grid>
            <Number label="Asking Rent (monthly)" value={form.asking_rent} onChange={v=>set("asking_rent", v)} />
            <Number label="Deposit" value={form.deposit} onChange={v=>set("deposit", v)} />
            <Select label="Utilities responsibility" value={form.utilities} onChange={v=>set("utilities", v)} options={["owner","tenant","split"]}/>
          </Grid>
        </Panel>
      )}

      <div className="flex items-center gap-2">
        <button onClick={prev} disabled={step===1} className="rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-40">Back</button>
        {step<4 ? (
          <button onClick={next} className="rounded bg-white/10 px-3 py-2 text-sm">Next</button>
        ) : (
          <button onClick={submit} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">
            {listingId ? "Submit Listing" : "Save & Submit"}
          </button>
        )}
        <button onClick={async()=>{ await saveDraft(); alert("Draft saved."); }} disabled={saving}
                className="ml-auto rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-40">
          {saving ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}

function Panel({title, children}:{title:string; children:any}){
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
    <div className="text-sm text-white/70 font-semibold">{title}</div>{children}
  </div>;
}
function Grid({children}:{children:any}){ return <div className="grid md:grid-cols-2 gap-3">{children}</div>; }
function Input({label, value, onChange}:{label:string; value:any; onChange:(v:any)=>void}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Number({label, value, onChange}:{label:string; value:number; onChange:(v:number)=>void}){
  return <Input label={label} value={value} onChange={(v:any)=>onChange(Number(v))} />;
}
function Toggle({label, value, onChange}:{label:string; value:boolean; onChange:(v:boolean)=>void}){
  return <label className="text-sm flex items-center gap-2">
    <input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/>
    <span className="text-white/60">{label}</span>
  </label>;
}
function Tags({label, value, onChange, suggestions}:{label:string; value:string[]; onChange:(v:string[])=>void; suggestions:string[]}){
  const add=(t:string)=> !value.includes(t) && onChange([...value,t]);
  const remove=(t:string)=> onChange(value.filter(x=>x!==t));
  return <div className="text-sm">
    <div className="text-white/60 mb-1">{label}</div>
    <div className="flex flex-wrap gap-2 mb-2">
      {value.map(t=>(
        <span key={t} className="px-2 py-1 rounded bg-white/10">{t}
          <button className="ml-1 text-white/50" onClick={()=>remove(t)}>×</button>
        </span>
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      {suggestions.map(s=>(
        <button key={s} onClick={()=>add(s)} className="rounded bg-white/10 px-2 py-1">{s}</button>
      ))}
    </div>
  </div>;
}
function TextArea({label, value, onChange, rows=4}:{label:string; value:string; onChange:(v:string)=>void; rows?:number}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <textarea rows={rows} className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
              value={value} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Select({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <select className="w-full rounded bg-white/5 border border-white/10 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o} value={o} className="bg-[#0b141d]">{o}</option>)}
    </select>
  </label>;
}

4) Minimal wiring notes

Auth routing: add a guard so /owner/** is only accessible to profiles.role='owner'.

Storage: create private buckets owner-listing-photos and owner-docs (signed URL upload later).

Verification hand-off: when listing is submitted, create a verification card in your existing pipeline (stage “Doc Review”) and compute verification_score.

Messaging: when an operator applies, create a conversation with participants [operator_id, owner_user_id], then insert owner_conversations row.

edit endpoints for owner listings, plus a tiny tweak to your Edit page to use PATCH.

1) Owner Listing: GET / PATCH / DELETE

File: src/app/api/owner/listings/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// Optional: narrow validation (keeps PATCH payloads clean)
type ListingPatch = Partial<{
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  furnished: boolean;
  parking: string | null;
  pets: string | null;
  amenities: string[];
  photos: Array<{ path: string; width?: number; height?: number }>;
  arbitrage_allowed: boolean | null;
  allowed_terms: string[];
  conditions_md: string | null;
  asking_rent: number | null;
  deposit: number | null;
  utilities: "owner" | "tenant" | "split" | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "denied" | "archived";
}>;

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("owner_listings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle(); // RLS ensures only the owner can read their own draft/non-approved rows

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const body = (await req.json()) as ListingPatch;

  // Safety: prevent owners from toggling from approved/denied arbitrarily
  // (Use submit endpoint for workflow changes)
  if (body.status && body.status !== "draft") {
    return NextResponse.json(
      { error: "Status changes are restricted. Use submit/review workflow." },
      { status: 400 }
    );
  }

  // Strip unknown fields (very light validation)
  const allowedKeys = new Set([
    "address_line1","address_line2","city","state","zip","lat","lng",
    "bedrooms","bathrooms","sqft","furnished","parking","pets","amenities","photos",
    "arbitrage_allowed","allowed_terms","conditions_md","asking_rent","deposit","utilities","status"
  ]);
  const patch: Record<string, any> = {};
  Object.entries(body || {}).forEach(([k, v]) => { if (allowedKeys.has(k)) patch[k] = v; });

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  patch.updated_at = new Date().toISOString();

  // RLS guarantees: only the owner (member of the account) can update their listing
  const { error } = await sb
    .from("owner_listings")
    .update(patch)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  // Optional guard: only allow delete in draft/archived states
  const { data: row } = await sb
    .from("owner_listings")
    .select("status")
    .eq("id", params.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "draft" && row.status !== "archived") {
    return NextResponse.json(
      { error: "Only draft or archived listings can be deleted." },
      { status: 400 }
    );
  }

  const { error } = await sb.from("owner_listings").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

2) (Optional) Submit endpoint (already added earlier)

Keep using POST /api/owner/listings/[id]/submit for workflow transitions.

3) Update your Edit page to use PATCH

Replace the save() in src/app/(owner)/owner/listings/[id]/edit/page.tsx with:

async function save() {
  if (!form) return;
  setSaving(true);

  // Build minimal patch (only changed fields is ideal; here we send the whole form)
  const patch = {
    address_line1: form.address_line1,
    address_line2: form.address_line2 ?? null,
    city: form.city,
    state: form.state,
    zip: form.zip,
    bedrooms: form.bedrooms ?? null,
    bathrooms: form.bathrooms ?? null,
    sqft: form.sqft ?? null,
    furnished: !!form.furnished,
    parking: form.parking ?? null,
    pets: form.pets ?? null,
    amenities: form.amenities || [],
    arbitrage_allowed: form.arbitrage_allowed ?? null,
    allowed_terms: form.allowed_terms || [],
    conditions_md: form.conditions_md ?? null,
    asking_rent: form.asking_rent ?? null,
    deposit: form.deposit ?? null,
    utilities: form.utilities ?? null,
    status: "draft", // keep as draft while editing
  };

  const r = await fetch(`/api/owner/listings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const j = await r.json();
  setSaving(false);
  if (j.error) alert(j.error); else alert("Saved!");
}

4) Why this setup works

RLS-first: Only the listing’s owner (via is_owner_member) can read/update/delete drafts.

Clean workflow: Edits use PATCH; status transitions use dedicated endpoints (submit/approve/deny).

Operator safety: Approved listings remain stable; owners can’t silently flip them via PATCH.

Extensible: Easy to add autosave (debounce and call PATCH), photos (signed URLs), or moderation hooks.

additions to your Owner “Edit Listing” page:

1) Reusable autosave hook

File: src/hooks/useAutosave.ts

"use client";

import { useEffect, useRef, useState } from "react";

type UseAutosaveOpts<T> = {
  value: T;
  delay?: number;              // ms
  enabled?: boolean;           // allow turning off
  save: (val: T) => Promise<void>;
  skipFirst?: boolean;         // don't autosave on first render
};

export function useAutosave<T>({
  value,
  delay = 1200,
  enabled = true,
  save,
  skipFirst = true,
}: UseAutosaveOpts<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timer = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(false);
  const latest = useRef<T>(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (skipFirst && !mounted.current) {
      mounted.current = true;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setError(null);
        await save(latest.current);
        setLastSavedAt(new Date());
      } catch (e: any) {
        setError(e?.message || "Autosave failed");
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, enabled, delay, save, skipFirst]);

  const triggerSave = async () => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    try {
      setIsSaving(true);
      setError(null);
      await save(latest.current);
      setLastSavedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, error, lastSavedAt, triggerSave };
}

2) Simple confirm modal

File: src/components/ConfirmModal.tsx

"use client";

import { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#0b141d] p-5 shadow-xl">
        <div className="text-lg font-semibold mb-1">{title}</div>
        <p className="text-sm text-white/70 mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

3) Wire autosave + Delete into Edit page

Update: src/app/(owner)/owner/listings/[id]/edit/page.tsx
(Only the changed/added parts shown; you can replace your file with this full version safely.)

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { useAutosave } from "@/hooks/useAutosave";

export default function EditListing({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // manual save state
  const [form, setForm] = useState<any>(null);
  const [autosaveOn, setAutosaveOn] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    // fetch a single listing directly
    const r = await fetch(`/api/owner/listings/${id}`);
    const j = await r.json();
    if (j?.error || !j?.data) {
      alert(j?.error || "Listing not found");
      router.push("/owner");
      return;
    }
    setForm(j.data);
    setLoading(false);
  }

  // Build minimal PATCH payload from form
  const buildPatch = (f: any) => ({
    address_line1: f.address_line1 ?? null,
    address_line2: f.address_line2 ?? null,
    city: f.city ?? null,
    state: f.state ?? null,
    zip: f.zip ?? null,
    bedrooms: f.bedrooms ?? null,
    bathrooms: f.bathrooms ?? null,
    sqft: f.sqft ?? null,
    furnished: !!f.furnished,
    parking: f.parking ?? null,
    pets: f.pets ?? null,
    amenities: Array.isArray(f.amenities) ? f.amenities : [],
    arbitrage_allowed: f.arbitrage_allowed ?? null,
    allowed_terms: Array.isArray(f.allowed_terms) ? f.allowed_terms : [],
    conditions_md: f.conditions_md ?? null,
    asking_rent: f.asking_rent ?? null,
    deposit: f.deposit ?? null,
    utilities: f.utilities ?? null,
    status: "draft",
  });

  // Manual save (button)
  async function saveOnce(current: any = form) {
    if (!current) return;
    setSaving(true);
    const r = await fetch(`/api/owner/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPatch(current)),
    });
    const j = await r.json();
    setSaving(false);
    if (j.error) alert(j.error);
  }

  // Autosave hook
  const { isSaving: autoSaving, lastSavedAt, error: autoError, triggerSave } = useAutosave({
    value: form,
    delay: 1200,
    enabled: autosaveOn && !!form,     // turn off if user disabled
    skipFirst: true,                   // do not save immediately after load
    save: async (val) => {
      if (!val) return;
      await fetch(`/api/owner/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatch(val)),
      }).then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${r.status}`);
        }
      });
    },
  });

  // UI helpers
  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function submit() {
    const r = await fetch(`/api/owner/listings/${id}/submit`, { method: "POST" });
    const j = await r.json();
    if (j.ok) router.push("/owner");
    else alert(j.error || "Failed to submit.");
  }

  async function doDelete() {
    const r = await fetch(`/api/owner/listings/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (j?.ok) {
      setShowDelete(false);
      router.push("/owner");
    } else {
      alert(j?.error || "Delete failed");
    }
  }

  const canDelete = useMemo(() => {
    if (!form) return false;
    return form.status === "draft" || form.status === "archived";
  }, [form]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!form) return <div className="p-6 text-red-400">Not found</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Edit Listing</h1>
        <span className="ml-auto text-xs uppercase tracking-wide px-2 py-1 rounded bg-white/10">{form.status}</span>
      </div>

      {/* Autosave status bar */}
      <div className="flex items-center gap-3 text-xs text-white/60">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autosaveOn} onChange={e => setAutosaveOn(e.target.checked)} />
          Autosave
        </label>
        <span className={`${autoSaving ? "text-emerald-300" : "text-white/60"}`}>
          {autoSaving ? "Saving…" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "No changes saved yet"}
        </span>
        {autoError && <span className="text-amber-300">• {autoError}</span>}
        <button
          onClick={() => triggerSave()}
          className="ml-auto rounded bg-white/10 px-2 py-1 hover:bg-white/15"
        >
          Save now
        </button>
      </div>

      {/* Panels */}
      <Panel title="Basics">
        <Grid>
          <Input label="Address line 1" value={form.address_line1} onChange={v=>set("address_line1", v)} />
          <Input label="Address line 2" value={form.address_line2} onChange={v=>set("address_line2", v)} />
          <Input label="City" value={form.city} onChange={v=>set("city", v)} />
          <Input label="State (e.g., TX)" value={form.state} onChange={v=>set("state", v)} />
          <Input label="ZIP" value={form.zip} onChange={v=>set("zip", v)} />
        </Grid>
      </Panel>

      <Panel title="Unit & Amenities">
        <Grid>
          <Number label="Bedrooms" value={form.bedrooms} onChange={v=>set("bedrooms", v)} />
          <Number label="Bathrooms" value={form.bathrooms} onChange={v=>set("bathrooms", v)} />
          <Number label="Sqft" value={form.sqft} onChange={v=>set("sqft", v)} />
          <Toggle label="Furnished" value={form.furnished} onChange={v=>set("furnished", v)} />
          <Input label="Parking" value={form.parking} onChange={v=>set("parking", v)} />
          <Input label="Pets" value={form.pets} onChange={v=>set("pets", v)} />
        </Grid>
        <Tags label="Amenities" value={form.amenities||[]} onChange={v=>set("amenities", v)} suggestions={["pool","gym","washer_dryer","ac","balcony"]}/>
      </Panel>

      <Panel title="Arbitrage Policy">
        <Toggle label="Arbitrage Allowed" value={form.arbitrage_allowed} onChange={v=>set("arbitrage_allowed", v)} />
        <Tags label="Allowed Terms" value={form.allowed_terms||[]} onChange={v=>set("allowed_terms", v)} suggestions={["STR","MTR","LTR"]}/>
        <TextArea label="Conditions / Notes" value={form.conditions_md||""} onChange={v=>set("conditions_md", v)} rows={6}/>
      </Panel>

      <Panel title="Economics">
        <Grid>
          <Number label="Asking Rent (monthly)" value={form.asking_rent} onChange={v=>set("asking_rent", v)} />
          <Number label="Deposit" value={form.deposit} onChange={v=>set("deposit", v)} />
          <Select label="Utilities responsibility" value={form.utilities||"tenant"} onChange={v=>set("utilities", v)} options={["owner","tenant","split"]}/>
        </Grid>
      </Panel>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => saveOnce()}
          disabled={saving}
          className="rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <button
          onClick={() => setShowDelete(true)}
          disabled={!canDelete}
          className={`rounded px-3 py-2 text-sm ${canDelete ? "bg-red-600 hover:bg-red-500" : "bg-white/10 opacity-50 cursor-not-allowed"}`}
          title={canDelete ? "Delete draft/archived listing" : "Only draft or archived can be deleted"}
        >
          Delete
        </button>

        <button
          onClick={submit}
          className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
        >
          Submit for Review
        </button>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Delete listing?"
        message="This action cannot be undone. The listing will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  );
}

/* ---------- Reusable local UI bits ---------- */
function Panel({title, children}:{title:string; children:any}){
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
    <div className="text-sm text-white/70 font-semibold">{title}</div>{children}
  </div>;
}
function Grid({children}:{children:any}){ return <div className="grid md:grid-cols-2 gap-3">{children}</div>; }
function Input({label, value, onChange}:{label:string; value:any; onChange:(v:any)=>void}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
           value={value||""} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Number({label, value, onChange}:{label:string; value:number; onChange:(v:number)=>void}){
  return <Input label={label} value={value} onChange={(v:any)=>onChange(Number(v))}/>;
}
function Toggle({label, value, onChange}:{label:string; value:boolean; onChange:(v:boolean)=>void}){
  return <label className="text-sm flex items-center gap-2">
    <input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/>
    <span className="text-white/60">{label}</span>
  </label>;
}
function Tags({label, value, onChange, suggestions}:{label:string; value:string[]; onChange:(v:string[])=>void; suggestions:string[]}){
  const add=(t:string)=> !value.includes(t) && onChange([...value,t]);
  const remove=(t:string)=> onChange(value.filter(x=>x!==t));
  return <div className="text-sm">
    <div className="text-white/60 mb-1">{label}</div>
    <div className="flex flex-wrap gap-2 mb-2">
      {value.map(t=>(
        <span key={t} className="px-2 py-1 rounded bg-white/10">{t}
          <button className="ml-1 text-white/50" onClick={()=>remove(t)}>×</button>
        </span>
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      {suggestions.map(s=>(
        <button key={s} onClick={()=>add(s)} className="rounded bg-white/10 px-2 py-1">{s}</button>
      ))}
    </div>
  </div>;
}
function TextArea({label, value, onChange, rows=4}:{label:string; value:string; onChange:(v:string)=>void; rows?:number}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <textarea rows={rows} className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
              value={value||""} onChange={e=>onChange(e.target.value)}/>
  </label>;
}
function Select({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}){
  return <label className="text-sm block">
    <div className="text-white/60 mb-1">{label}</div>
    <select className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
            value={value||""} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o} value={o} className="bg-[#0b141d]">{o}</option>)}
    </select>
  </label>;
}

Notes

Autosave waits 1.2s after the last change; toggle is provided; “Save now” calls the same PATCH.

Delete is only enabled for draft/archived (server also enforces it).

Works with your previously added GET/PATCH/DELETE /api/owner/listings/[id] routes.

0) One-time setup (Storage)

Create a private bucket:

Name: owner-listing-photos

Public: off (private)

(You can do this in Supabase Dashboard → Storage → New bucket.)

1) API: create signed upload URL

File: src/app/api/owner/listings/[id]/photos/sign/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const BUCKET = "owner-listing-photos";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, mime } = await req.json() as { filename: string; mime?: string };
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  // path pattern: listing/<id>/<timestamp>_<filename>
  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const path = `listing/${params.id}/${Date.now()}_${safeName}`;

  // create signed upload URL (PUT to this URL from the client)
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path, {
    contentType: mime || "application/octet-stream",
    upsert: false
  } as any); // supabase-js v2 typing: allow any here

  if (error || !data) return NextResponse.json({ error: error?.message || "Failed to sign" }, { status: 500 });
  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    token: data.token // for older SDKs (kept for completeness)
  });
}

2) API: register (+delete) photo rows on the listing

File: src/app/api/owner/listings/[id]/photos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const BUCKET = "owner-listing-photos";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { path: string; width?: number; height?: number };
  if (!body?.path) return NextResponse.json({ error: "path required" }, { status: 400 });

  // Append to photos array (RLS ensures only owner can update)
  const { data: row, error: selErr } = await sb.from("owner_listings").select("photos").eq("id", params.id).maybeSingle();
  if (selErr || !row) return NextResponse.json({ error: selErr?.message || "Not found" }, { status: 404 });

  const photos = Array.isArray(row.photos) ? row.photos : [];
  photos.push({ path: body.path, width: body.width ?? null, height: body.height ?? null });

  const { error: updErr } = await sb.from("owner_listings")
    .update({ photos, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, photos });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const path = sp.get("path");
  if (!path) return NextResponse.json({ error: "path query required" }, { status: 400 });

  // 1) Remove from DB array
  const { data: row } = await sb.from("owner_listings").select("photos").eq("id", params.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = (row.photos || []).filter((p: any) => p?.path !== path);
  const { error: updErr } = await sb.from("owner_listings")
    .update({ photos, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 2) Delete from Storage (best-effort)
  await sb.storage.from(BUCKET).remove([path]).catch(() => {});

  return NextResponse.json({ ok: true, photos });
}

3) Edit page: Photo uploader + preview grid

Update your src/app/(owner)/owner/listings/[id]/edit/page.tsx:

Add imports and a helper to get signed view URLs (so owners can see private images).

Add the Photos panel with file input, upload flow, preview, and delete.

3.1 Add imports (top of file)
import { supabase } from "@/lib/supabase"; // your existing client-side supabase

3.2 Add helpers inside the component
const BUCKET = "owner-listing-photos";

async function getSignedViewUrl(path: string) {
  // 60-minute temporary URL
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function uploadPhoto(file: File) {
  // 1) ask server for a signed upload URL
  const signRes = await fetch(`/api/owner/listings/${id}/photos/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mime: file.type }),
  });
  const signed = await signRes.json();
  if (!signRes.ok) throw new Error(signed?.error || "Failed to sign");

  // 2) PUT the file to the signed URL (no auth header; URL is pre-signed)
  const put = await fetch(signed.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  // 3) Register in DB (optional: read image dims)
  const imgDims = await readDims(file).catch(() => ({ width: null, height: null }));
  const reg = await fetch(`/api/owner/listings/${id}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: signed.path, ...imgDims }),
  });
  const j = await reg.json();
  if (!reg.ok) throw new Error(j?.error || "Failed to register photo");

  // Refresh form/photos in state
  setForm((f: any) => ({ ...f, photos: j.photos }));
}

function readDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function deletePhoto(path: string) {
  const r = await fetch(`/api/owner/listings/${id}/photos?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Delete failed");
  setForm((f: any) => ({ ...f, photos: j.photos }));
}

3.3 Add the Photos panel UI (place it above “Arbitrage Policy”, for example)
<Panel title="Photos">
  <div className="text-xs text-white/60 mb-2">
    Upload clear, exterior/interior images. (Max ~10MB each recommended)
  </div>
  <div className="flex items-center gap-2 mb-3">
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          await uploadPhoto(file);
        } catch (err: any) {
          alert(err?.message || "Upload failed");
        } finally {
          // reset input
          e.currentTarget.value = "";
        }
      }}
      className="text-sm"
    />
  </div>

  {/* Preview grid */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {(form.photos || []).map((p: any) => (
      <PhotoTile key={p.path} path={p.path} onDelete={() => deletePhoto(p.path)} getUrl={getSignedViewUrl} />
    ))}
    {(form.photos || []).length === 0 && (
      <div className="text-sm text-white/60">No photos yet. Upload one to get started.</div>
    )}
  </div>
</Panel>

3.4 Add a tiny PhotoTile component inside the file (below)
function PhotoTile({ path, onDelete, getUrl }: { path: string; onDelete: () => void; getUrl: (p: string) => Promise<string | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const u = await getUrl(path);
      if (alive) {
        setUrl(u);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [path, getUrl]);

  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5 aspect-[4/3] flex items-center justify-center">
      {loading ? (
        <div className="text-xs text-white/60">Loading…</div>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="text-xs text-white/60">Preview unavailable</div>
      )}

      <button
        onClick={onDelete}
        className="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition"
        title="Delete photo"
      >
        Delete
      </button>
    </div>
  );
}

4) RLS reminder

No extra RLS needed if you already applied the policies from earlier: owners can update their own owner_listings rows; Storage is private; previews use signed view URLs on the client.

5) UX notes

Uploads: PUT directly to Supabase’s signed URL — no exposing service keys client-side.

Previews: short-lived signed URLs prevent link leakage; refreshed when the edit page mounts.

Deleting: removes from DB first (instant UI), then best-effort storage deletion server-side.
