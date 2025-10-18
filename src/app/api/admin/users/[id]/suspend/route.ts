// src/app/api/admin/users/[id]/suspend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: authData, error: getUserError } = await supabase.auth.getUser();
    const user = authData?.user ?? null;
    const myRole = (user?.user_metadata?.role as string) || "";
    if (!user || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = params.id;
    const { suspend } = await req.json(); // boolean
    if (!userId || typeof suspend !== "boolean") {
      return NextResponse.json({ error: "Missing userId/suspend" }, { status: 400 });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { suspended: suspend },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
