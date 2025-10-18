import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    id: user?.id ?? null,
    email: user?.email ?? null,
    role: (user?.user_metadata as any)?.role ?? null,
  });
}
