import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/getServerUser";

export const dynamic = "force-dynamic"; // ensures cookies are read

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Tier = "beta" | "pro" | "premium";

export async function GET(req: Request) {
  try {
    // Admin guard
    const me = await getServerUser(req);
    const myRole = (me?.user_metadata?.role as string) || "";
    if (!me || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("query")?.trim();

    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;

    const users = (data.users || [])
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        full_name: (u.user_metadata as any)?.full_name || "",
        role: (u.user_metadata as any)?.role || "operator",
        tier: ((u.user_metadata as any)?.tier || "beta") as Tier,
        suspended: Boolean((u.user_metadata as any)?.suspended),
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
    // Admin guard
    const me = await getServerUser(req);
    const myRole = (me?.user_metadata?.role as string) || "";
    if (!me || myRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, tier } = (await req.json()) as { userId?: string; tier?: Tier };
    if (!userId || !tier) {
      return NextResponse.json({ error: "Missing userId/tier" }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { tier },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
