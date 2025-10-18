// src/app/api/admin/tiers/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // no static cache

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("query")?.trim();

    let query = admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const { data, error } = await query;
    if (error) throw error;

    // Map out what we need + simple text filter
    const users = (data.users || [])
      .map((u) => ({
        id: u.id,
        email: u.email!,
        full_name: (u.user_metadata as any)?.full_name || "",
        role: (u.user_metadata as any)?.role || "",
        tier: ((u.user_metadata as any)?.tier || "beta") as "beta" | "pro" | "premium",
        created_at: u.created_at,
      }))
      .filter((u) =>
        !q ? true : `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase())
      );

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
const { userId, tier } = await req.json();
if (!userId || !tier) return NextResponse.json({ error: "Missing userId/tier" }, { status: 400 });

// Directly update the user's tier using Supabase admin API
const { data, error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { tier },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

