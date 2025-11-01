DB schema (tickets, conversations, messages, KB)

API routes (create/read, reply, assign, close)

Realtime chat UI + AI triage hook

KB search + auto-answer flow

Tier gating, metrics, and escalations

1) Database (Supabase SQL)
-- 80_support_contacts.sql
create table if not exists public.support_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null, -- signed-in users
  email text,
  name text,
  created_at timestamptz default now()
);
create index if not exists idx_support_contacts_user on public.support_contacts(user_id);

-- 81_support_tickets.sql
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.support_contacts(id) on delete set null,
  subject text,
  category text,                -- 'customer','technical','billing'
  status text default 'open',   -- open|pending|waiting_user|resolved|closed
  priority text default 'normal', -- low|normal|high|urgent
  assignee_id uuid references auth.users(id) on delete set null, -- staff
  source text default 'in_app', -- in_app|email|webhook
  meta jsonb,                   -- {plan:'pro', user_id:'...', property_id:'...'}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_tickets_status on public.support_tickets(status);
create index if not exists idx_tickets_assignee on public.support_tickets(assignee_id);

-- 82_support_conversations.sql
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  channel text default 'in_app',   -- in_app|email|slack
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 83_support_messages.sql
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_type text not null,        -- 'user'|'agent'|'ai'
  sender_id uuid,                   -- agent user id (nullable for ai/user)
  body text,
  attachment_url text,
  suggested boolean default false,  -- true if AI draft awaiting agent send
  created_at timestamptz default now()
);
create index if not exists idx_support_messages_conv on public.support_messages(conversation_id);

-- 84_kb_articles.sql (Knowledge Base)
create table if not exists public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  body_md text not null,
  tags text[] default '{}',
  category text,                    -- 'getting_started','billing','technical'
  intent text[],                    -- ['cancel','refund','roi','portfolio']
  published boolean default true,
  updated_at timestamptz default now()
);

-- 85_ai_inference_log.sql (optional, for support bot)
create table if not exists public.ai_support_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade,
  kind text,             -- 'triage'|'kb_answer'|'handoff'
  input jsonb,
  output jsonb,
  created_at timestamptz default now()
);

-- 🔒 RLS
alter table public.support_contacts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.kb_articles enable row level security;
alter table public.ai_support_log enable row level security;

-- Users can read/write their own tickets/conversations/messages
create policy "contacts self" on public.support_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tickets self or staff" on public.support_tickets
  for select using (
    (meta->>'user_id')::uuid = auth.uid() or exists (select 1 from auth.users where id = auth.uid())
  );
create policy "tickets insert self" on public.support_tickets for insert with check ((meta->>'user_id')::uuid = auth.uid());

-- Messages: participant of ticket (owner) or any staff
create policy "messages read/write" on public.support_messages
  for all using (
    exists(
      select 1 from public.support_conversations c
      join public.support_tickets t on t.id = c.ticket_id
      where c.id = conversation_id and (
        (t.meta->>'user_id')::uuid = auth.uid()
        or t.assignee_id = auth.uid()
      )
    )
  )
  with check (
    exists(
      select 1 from public.support_conversations c
      join public.support_tickets t on t.id = c.ticket_id
      where c.id = conversation_id and (
        (t.meta->>'user_id')::uuid = auth.uid()
        or t.assignee_id = auth.uid()
      )
    )
  );

-- KB: public read
create policy "kb public read" on public.kb_articles for select using (published = true);

2) API Routes (Next.js App Router)
Create ticket + conversation
// src/app/api/support/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { subject, category, message } = await req.json();

  // ensure contact
  const { data: contact } = await sb.from("support_contacts")
    .select("id").eq("user_id", user.id).maybeSingle();
  const contact_id = contact?.id || (await sb.from("support_contacts").insert({
    user_id:user.id, email: user.email
  }).select("id").single()).data?.id;

  const { data: ticket, error: e1 } = await sb.from("support_tickets").insert({
    contact_id, subject, category, meta: { user_id: user.id, tier: 'auto' }
  }).select("id").single();
  if(e1) return NextResponse.json({error:e1.message},{status:500});

  const { data: conv } = await sb.from("support_conversations").insert({
    ticket_id: ticket.id
  }).select("id").single();

  if(message){
    await sb.from("support_messages").insert({
      conversation_id: conv.id, sender_type:'user', body: message
    });
  }

  return NextResponse.json({ ticketId: ticket.id, conversationId: conv.id });
}

export async function GET(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { data, error } = await sb.from("support_tickets")
    .select("id, subject, status, priority, category, assignee_id, updated_at")
    .contains("meta", { user_id: user.id });
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ data });
}

Send/read messages
// src/app/api/support/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("support_messages")
    .select("*").eq("conversation_id", params.id).order("created_at",{ascending:true});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ data });
}

export async function POST(req:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { body, attachmentUrl } = await req.json();

  const { data, error } = await sb.from("support_messages").insert({
    conversation_id: params.id, sender_type:'user', body, attachment_url: attachmentUrl
  }).select("id, created_at").single();
  if(error) return NextResponse.json({error:error.message},{status:500});

  await sb.from("support_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", params.id);
  return NextResponse.json({ id: data.id, created_at: data.created_at });
}

Staff actions (assign, close)
// src/app/api/support/tickets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req:NextRequest, { params }:{params:{id:string}}){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  // TODO: verify user is staff/admin
  const payload = await req.json(); // { status?, assignee_id?, priority? }
  const { error } = await sb.from("support_tickets").update(payload).eq("id", params.id);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ ok: true });
}

KB search
// src/app/api/support/kb/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req:NextRequest){
  const sb = getSupabaseServer();
  const q = new URL(req.url).searchParams.get("q") || "";
  let query = sb.from("kb_articles").select("id, title, slug, tags, body_md").eq("published", true);
  if(q) query = query.textSearch("body_md", q as any, { type: "websearch" } as any);
  const { data, error } = await query.limit(8);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ data });
}

3) Frontend: Support Widget + Inbox
In-app chat widget (client)
// src/components/support/SupportWidget.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Send, Search, X } from "lucide-react";

export default function SupportWidget(){
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(open && !conversationId) bootstrap(); }, [open]);

  async function bootstrap(){
    // create ticket + conversation on first open
    const res = await fetch("/api/support/tickets", { method:"POST", body: JSON.stringify({ subject:"Support", category:"customer" }) });
    const json = await res.json();
    setConversationId(json.conversationId);
    loadMessages(json.conversationId);
  }
  async function loadMessages(id:string){
    const res = await fetch(`/api/support/conversations/${id}/messages`);
    const json = await res.json();
    setMessages(json.data||[]);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}), 0);
  }
  async function send(){
    if(!conversationId || !input.trim()) return;
    await fetch(`/api/support/conversations/${conversationId}/messages`, { method:"POST", body: JSON.stringify({ body: input }) });
    setInput("");
    loadMessages(conversationId);
  }

  // lightweight KB suggestions as user types
  useEffect(()=>{
    const t = setTimeout(async ()=>{
      if(input.length < 3) return setSuggestions([]);
      const r = await fetch(`/api/support/kb/search?q=${encodeURIComponent(input)}`);
      setSuggestions((await r.json()).data || []);
    }, 250);
    return ()=>clearTimeout(t);
  }, [input]);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!open ? (
        <button onClick={()=>setOpen(true)} className="rounded-full bg-emerald-600 hover:bg-emerald-500 p-3 shadow-lg">
          <HelpCircle />
        </button>
      ) : (
        <div className="w-[360px] h-[520px] rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl flex flex-col">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-semibold">ArbiBase Support</div>
            <button onClick={()=>setOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={16}/></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_type==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[75%] text-sm rounded-2xl px-3 py-2 ${m.sender_type==='user'?'bg-emerald-600/40':'bg-white/10'}`}>
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* Composer + KB suggest */}
          <div className="p-3 border-t border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/40"/>
              <input
                className="w-full pl-8 pr-10 rounded-lg bg-white/5 border border-white/10 text-sm py-2"
                placeholder="Describe your issue…"
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter' && send()}
              />
              <button onClick={send} className="absolute right-1 top-1.5 rounded bg-emerald-600 px-2 py-1"><Send size={16}/></button>
            </div>
            {suggestions.length>0 && (
              <div className="mt-2 max-h-28 overflow-y-auto rounded border border-white/10 bg-white/5">
                {suggestions.map((s:any)=>(
                  <div key={s.id} className="p-2 text-xs hover:bg-white/10 cursor-pointer" onClick={()=>setInput(s.title)}>
                    {s.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

Staff inbox (basic)

List open tickets, filter by category/status, open conversation, reply as agent (sender_type:'agent'), assign/close.

4) AI Triage + Auto-Answer (with Tier gates)

Flow

User types first message → create ticket & conversation

AI triage classifies: category, priority, intent

Search KB; if confident, post AI answer (sender_type='ai', suggested=true for Beta/Pro, auto-send for Premium if confidence high)

If needs human → route to staff queue and tag with intent

Triage endpoint
// src/app/api/support/triage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { runModel } from "@/lib/negotiation/model"; // your LLM wrapper

export async function POST(req:NextRequest){
  const sb = getSupabaseServer();
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});

  const { conversationId, latest } = await req.json();

  // pull last 10 msgs for context
  const { data: msgs } = await sb.from("support_messages")
    .select("sender_type, body")
    .eq("conversation_id", conversationId)
    .order("created_at",{ascending:false})
    .limit(10);

  const sys = "You are ArbiBase Support Triage. Classify the request and propose a short solution.";
  const usr = `Messages:\n${(msgs||[]).reverse().map((m:any)=>`${m.sender_type.toUpperCase()}: ${m.body}`).join('\n')}\n\nReturn JSON: {category:'customer|technical|billing', intent:'string', priority:'low|normal|high|urgent', reply:'string (<=120 words)'}`
  const text = await runModel(sys, usr);

  let out:any; try { out = JSON.parse(text); } catch { out = { category:'customer', intent:'general', priority:'normal', reply:'Thanks for your message. Our team will follow up shortly.'}; }

  // update ticket
  const { data: conv } = await sb.from("support_conversations").select("ticket_id").eq("id", conversationId).single();
  if(conv?.ticket_id){
    await sb.from("support_tickets").update({ category: out.category, priority: out.priority }).eq("id", conv.ticket_id);
  }

  // store AI suggestion message (suggested=true)
  const { data: aiMsg } = await sb.from("support_messages").insert({
    conversation_id: conversationId, sender_type:'ai', body: out.reply, suggested: true
  }).select("id").single();

  await sb.from("ai_support_log").insert({
    ticket_id: conv?.ticket_id, kind:'triage', input:{latest}, output: out
  });

  return NextResponse.json({ suggestionId: aiMsg?.id, triage: out });
}


Auto-answer policy (tier)

Beta: AI reply is saved as suggested; agent must click “Send”.

Pro: If intent matches KB and confidence high (you can approximate by keyword overlap), allow one-click “Approve & Send”.

Premium: If category=customer/billing and intent in allowed set, auto-send and mark ticket pending.

5) Knowledge Base → Answer Composer

When triage runs, also call /api/support/kb/search?q=... and merge the top article excerpt into the AI’s reply (Premium: auto-include a link to the KB article and step list).

Answer format (Premium)

Greeting + direct fix

If technical: steps 1-3

If billing: link to plan/upgrade/cancel page

Add “Was this helpful?” buttons → log feedback table (optional)

6) Tier Gating
Tier	AI Replies	KB Suggestions	Email Bridge	SLAs & Assign
Beta	Suggestions only (agent must send)	Top 3 KB hits	—	Manual
Pro	One-click approve	Top 5 + snippets	Outbound notify email	Assign to team
Premium	Auto-send for low-risk intents	Top 8 + snippet & link	Two-way email bridge (optional)	SLA metrics + auto-routing

Implementation notes

Gate in the triage route before auto-sending.

For email bridge later: add support_mailboxes + webhooks.

7) Metrics (Support Dashboard)

Track:

First response time (FRT) & Median Time To Resolution (MTTR)

Volume by category/intent

Deflection rate (AI suggestion accepted / total)

Satisfaction (thumbs up/down on AI answers)

Quick API:

// src/app/api/support/metrics/route.ts
// aggregate avg(created_at diff) where first agent/user messages etc.

8) Integration Points

Billing (GoHighLevel / Stripe later): intents upgrade, cancel, invoice → deep link to your checkout/portal.

Portfolio/Properties: when a user opens a ticket from a property, store meta.property_id so agents see context.

Personal AI Assistant: escalate complicated technical threads to Technical Analysis AI (future).

Minimal wiring checklist

 Run SQL migrations for support tables + KB

 Drop the API routes above

 Add <SupportWidget /> globally (e.g., in your (app)/layout.tsx)

 Seed a few KB articles (billing: upgrade/cancel, technical: login, ROI calc troubleshooting)

 Add a staff-only page to view/assign tickets

 Hook triage on: conversation creation + first user message

 
