// src/app/api/admin/promote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Server-side Supabase (reads caller from cookies in a Route Handler)
function getServerSupabase() {
  return createRouteHandlerClient({ cookies });
}

// Supabase Admin client (service role) – no internal fetch calls
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  try {
    // 1) Authenticate the caller (must be admin)
    const supabase = getServerSupabase();
    const { data: me } = await supabase.auth.getUser();
    const myRole = (me.user?.user_metadata?.role as string) || "";
    if (!me.user || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Parse input
    const { userId, makeAdmin } = await req.json();
    if (!userId || typeof makeAdmin !== "boolean") {
      return NextResponse.json({ error: "Missing userId/makeAdmin" }, { status: 400 });
    }

    // 3) Update metadata directly via Admin SDK
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: makeAdmin ? "admin" : "operator" },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
