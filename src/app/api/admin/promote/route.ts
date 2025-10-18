// src/app/api/admin/promote/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Prefer reusing your existing admin helper if you have one:
// import { supabaseAdmin } from "@/lib/supabaseAdmin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !service) {
  throw new Error("SUPABASE env vars missing (URL / SERVICE ROLE KEY).");
}
const supabaseAdmin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

export async function POST(req: Request) {
  try {
    const { userId, makeAdmin } = await req.json();

    if (!userId || typeof makeAdmin !== "boolean") {
      return NextResponse.json({ error: "userId and makeAdmin are required." }, { status: 400 });
    }

    // NOTE: For production: verify the caller is admin.
    // If you already built an admin check in /api/admin/tiers, copy it here.
    // (e.g., read cookies/headers and validate user_metadata.role === 'admin')

    // Update Auth user_metadata.role
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: makeAdmin ? "admin" : "operator" },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
