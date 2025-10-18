import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for privileged operations
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Helper: get caller user from Authorization header
async function getCaller(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  try {
    const me = await getCaller(req);
    const myRole = (me?.user_metadata as any)?.role;
    if (!me || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const q = new URL(req.url).searchParams.get("query")?.trim() || "";

    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;

    const users = (data.users || [])
      .map((u) => ({
        id: u.id,
        email: u.email!,
        full_name: (u.user_metadata as any)?.full_name || "",
        role: (u.user_metadata as any)?.role || "",
        tier: ((u.user_metadata as any)?.tier || "beta") as "beta" | "pro" | "premium",
        created_at: u.created_at,
        status: (u.user_metadata as any)?.status || "active",
      }))
      .filter((u) => (q ? `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()) : true));

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getCaller(req);
    const myRole = (me?.user_metadata as any)?.role;
    if (!me || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, tier } = await req.json();
    if (!userId || !tier) return NextResponse.json({ error: "Missing userId/tier" }, { status: 400 });

    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...((me?.user_metadata as any) || {}), tier },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
