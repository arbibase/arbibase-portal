// src/app/api/admin/tiers/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

type Tier = "beta" | "pro" | "premium";

function getUserClient(cookies: Headers) {
  // user-scoped client to read current session
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon, {
    global: { headers: { Cookie: cookies.get("cookie") ?? "" } as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

// Enforce admin via current session
async function requireAdmin(request: Request) {
  const cookieHeader = new Headers({ cookie: request.headers.get("cookie") ?? "" });
  const userClient = getUserClient(cookieHeader);
  const { data } = await userClient.auth.getUser();
  const user = data.user;
  if (!user || user.user_metadata?.role !== "admin") {
    return { ok: false, user: null };
  }
  return { ok: true, user };
}

// GET /api/admin/tiers?query=&page=1&limit=20
export async function GET(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // List auth users (email, metadata)
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: limit });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // naive filter on server result (auth API doesn’t support search by email/name directly)
  const rows = (data?.users || []).filter((u) => {
    if (!query) return true;
    const name = (u.user_metadata?.full_name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || "",
      tier: (u.user_metadata?.tier as Tier) || "beta",
      role: u.user_metadata?.role || "",
      created_at: u.created_at,
    })),
    page,
    limit,
    count: rows.length,
  });
}

// POST /api/admin/tiers  { userId, tier }
export async function POST(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { userId, tier } = body || {};
  if (!userId || !["beta", "pro", "premium"].includes(tier)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

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
