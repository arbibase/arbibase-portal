// src/app/api/debug/me/route.ts
import { NextResponse } from "next/server";

function getServerSupabase() {
  // Minimal local stub to satisfy the missing module during development/compilation.
  // Adjust to return a real Supabase client in production.
  return {
    auth: {
      async getUser() {
        return { data: { user: null } };
      },
    },
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = (data as any)?.user;
  const role = (user?.user_metadata?.role as string) || null;
  return NextResponse.json({ id: user?.id || null, email: user?.email || null, role });
}
