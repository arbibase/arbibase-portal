// src/app/api/admin/promote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller with cookies
    // Authenticate the caller using the Admin client (helper not available)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: me } = await supabaseAdmin.auth.getUser();
    const myRole = (me.user?.user_metadata?.role as string) || "";
    if (!me.user || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, makeAdmin } = await req.json();
    if (!userId || typeof makeAdmin !== "boolean") {
      return NextResponse.json({ error: "Missing userId/makeAdmin" }, { status: 400 });
    }

    // Directly update via Admin SDK — NO fetches here
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: makeAdmin ? "admin" : "operator" },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

const userId = "<REPLACE_WITH_USER_ID>";
const makeAdmin = false;

await fetch("/api/admin/promote", {
  method: "POST",
  credentials: "include",               // 👈 add this
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, makeAdmin }),
});
