// src/app/api/debug/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1) Try cookie-based session (ideal)
  try {
    const sb = createRouteHandlerClient({ cookies });
    const { data, error } = await sb.auth.getUser();
    const user = data?.user ?? null;

    if (user) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: (user.user_metadata as any)?.role ?? null,
      });
    }
  } catch {
    // ignore and fall through to bearer
  }

  // 2) Fallback: bearer token from Authorization header
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (token) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data } = await anon.auth.getUser(token);
      const user = data?.user ?? null;

      if (user) {
        return NextResponse.json({
          id: user.id,
          email: user.email,
          role: (user.user_metadata as any)?.role ?? null,
        });
      }
    }
  } catch {
    // ignore
  }

  // 3) No session detected via cookies or bearer
  return NextResponse.json({ id: null, email: null, role: null });
}
