// Use the *route handler* helper so cookies/session are read correctly.
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const user = data.user;
  const role = (user?.user_metadata?.role as string) ?? null;

  return Response.json({
    id: user?.id ?? null,
    email: user?.email ?? null,
    role,
  });
}
