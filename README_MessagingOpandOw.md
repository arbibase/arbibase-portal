We’ll architect it for three layers:

Core Messaging Engine (database + real-time)

API layer (CRUD + thread management)

React UI (chat interface + notifications)
and we’ll show how it integrates with Supabase and each other ArbiBase tool (Portfolio, Property Browser, etc.)

🧠 Overview
Feature	Purpose	Integrations
Threads	One per property or negotiation	Linked to properties and users
Messages	Realtime chat messages	Uses Supabase Realtime for updates
Attachments	Lease files, images, docs	Linked via Supabase Storage
Status/Tags	For filtering (e.g., Active, Closed, Offer Sent)	Portfolio, ROI calculator
Notifications	New message badges, push/email	Personal AI Assistant in future
🏗️ 1) Database (Supabase SQL)
-- 50_messaging_threads.sql
create table if not exists public.messaging_threads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  operator_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  status text default 'active', -- active|archived|closed
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_threads_operator on public.messaging_threads(operator_id);
create index if not exists idx_threads_owner on public.messaging_threads(owner_id);

-- 51_messaging_messages.sql
create table if not exists public.messaging_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.messaging_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachment_url text,
  seen_by uuid[] default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_messages_thread on public.messaging_messages(thread_id);

-- 🔒 RLS Policies
alter table public.messaging_threads enable row level security;
alter table public.messaging_messages enable row level security;

create policy "threads participants" on public.messaging_threads
  for all using (auth.uid() = operator_id or auth.uid() = owner_id)
  with check (auth.uid() = operator_id or auth.uid() = owner_id);

create policy "messages participants" on public.messaging_messages
  for all using (
    auth.uid() in (
      select operator_id from public.messaging_threads where id = thread_id
      union
      select owner_id from public.messaging_threads where id = thread_id
    )
  )
  with check (
    auth.uid() in (
      select operator_id from public.messaging_threads where id = thread_id
      union
      select owner_id from public.messaging_threads where id = thread_id
    )
  );

⚙️ 2) API Endpoints (Next.js App Router)
📂 /api/messages/threads – Get or Create Thread
// src/app/api/messages/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const role = searchParams.get("role"); // operator|owner

  let query = supabase.from("messaging_threads").select("*");
  if (role === "operator") query = query.eq("operator_id", user.id);
  else if (role === "owner") query = query.eq("owner_id", user.id);
  if (propertyId) query = query.eq("property_id", propertyId);

  const { data, error } = await query.order("last_message_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { propertyId, ownerId, subject } = body;

  const { data, error } = await supabase
    .from("messaging_threads")
    .insert({
      property_id: propertyId,
      operator_id: user.id,
      owner_id: ownerId,
      subject
    })
    .select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

💬 /api/messages/[threadId] – Send + Retrieve Messages
// src/app/api/messages/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: NextRequest, { params }: { params: { threadId: string } }) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("messaging_messages")
    .select("*")
    .eq("thread_id", params.threadId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: { threadId: string } }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { text, attachmentUrl } = body;

  const { data, error } = await supabase
    .from("messaging_messages")
    .insert({
      thread_id: params.threadId,
      sender_id: user.id,
      body: text,
      attachment_url: attachmentUrl
    })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // update thread timestamp
  await supabase
    .from("messaging_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.threadId);

  return NextResponse.json({ id: data.id, created_at: data.created_at });
}

💻 3) Frontend Chat UI
"use client";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";

export default function ChatPanel({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); subscribe(); }, [threadId]);
  async function load() {
    const res = await fetch(`/api/messages/${threadId}`);
    const json = await res.json();
    setMessages(json.data || []);
  }
  function subscribe() {
    const ch = window.supabase
      .channel("realtime:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messaging_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => window.supabase.removeChannel(ch);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    const body = { text };
    await fetch(`/api/messages/${threadId}`, { method: "POST", body: JSON.stringify(body) });
    setText("");
  }

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-white/10 bg-white/5">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === window.userId ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.sender_id === window.userId ? "bg-emerald-600/40 text-white" : "bg-white/10 text-white/90"}`}>
              {m.body}
              {m.attachment_url && (
                <a href={m.attachment_url} target="_blank" className="block mt-1 text-xs underline text-white/60">
                  Attachment
                </a>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <button disabled={uploading} className="p-2 rounded hover:bg-white/10">
          <Paperclip size={18} />
        </button>
        <input
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/40"
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="p-2 rounded bg-emerald-600 hover:bg-emerald-500">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

🔄 4) Data Flow
flowchart LR
User1((Operator)) --sends--> API1[/api/messages/:threadId POST/] --> DB[(messaging_messages)]
User2((Owner)) --realtime sub--> DB
DB --> Websocket --> User2
DB --> Threads[(messaging_threads)] --> PortfolioPage
PortfolioPage --> ROI_Calculator


Threads created when a negotiation starts (e.g., “Send Proposal” in ROI or Property Browser).

Each property can have exactly one active thread per operator-owner pair.

Portfolio shows unread message badge if last_message_at > last_seen.

🔔 5) Optional Enhancements
Feature	Description
Seen receipts	update seen_by array when message viewed
File uploads	integrate with Supabase Storage bucket message_attachments
Email bridge	owner receives email if offline
AI reply suggester	later uses Personal AI Assistant (/api/ai/reply)
Tier gating	Beta: text-only, Pro: file sharing, Premium: AI assistant + email fallback
🔗 Integrations

Portfolio: show message count & unread status next to each property.

ROI Calculator: “Send Offer” → creates thread and first message with ROI summary attached.

Property Browser: verified owner can reply to operator inside platform.
