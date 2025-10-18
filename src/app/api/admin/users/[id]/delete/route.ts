// src/app/api/admin/users/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: me } = await supabase.auth.getUser();
    const myRole = (me.user?.user_metadata?.role as string) || "";
    if (!me.user || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
const userId = params.id;
if (!userId) {
  return NextResponse.json({ error: "Missing userId" }, { status: 400 });
}
// removed accidental promote call — not needed when deleting a user

const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
