// src/app/api/admin/promote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

function getServerSupabase() {
  return createServerComponentClient({ cookies });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const { data: me } = await supabase.auth.getUser();
    const myRole = (me.user?.user_metadata?.role as string) || "";
    if (!me.user || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, makeAdmin } = await req.json();
    if (!userId || typeof makeAdmin !== "boolean") {
      return NextResponse.json({ error: "Missing userId/makeAdmin" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: makeAdmin ? "admin" : "operator" },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
