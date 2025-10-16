// src/app/api/admin/tiers/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// user-scoped client to read current session
function getUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // next/headers cookies() is the proper way in app router handlers
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  return createClient(url, anon, {
    global: { headers: { Cookie: cookieHeader } as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Tier = "beta" | "pro" | "premium";

async function requireAdmin() {
  const userClient = getUserClient();
  const { data } = await userClient.auth.getUser();
  const user = data.user;
  return !!(user && user.user_metadata?.role === "admin");
}

// GET /api/admin/tiers
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: limit });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users || []).filter((u) => {
    if (!query) return true;
    const name = (u.user_metadata?.full_name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || "",
      tier: (u.user_metadata?.tier as Tier) || "beta",
      role: u.user_metadata?.role || "",
      created_at: u.created_at,
    })),
    page,
    limit,
    count: users.length,
  });
}

// POST /api/admin/tiers  { userId, tier }
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { userId, tier } = body || {};
  if (!userId || !["beta", "pro", "premium"].includes(tier)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { tier },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      full_name: data.user?.user_metadata?.full_name || "",
      tier: data.user?.user_metadata?.tier || "beta",
    },
  });
}
