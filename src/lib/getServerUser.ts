import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns the authenticated user the server sees, using:
 * 1) cookies (normal browser session), or
 * 2) Authorization: Bearer <access_token> (fallback)
 */
export async function getServerUser(req: Request) {
  // Try cookie session first
  const supaCookies = createRouteHandlerClient({ cookies });
  const cookieUser = await supaCookies.auth.getUser();
  if (cookieUser.data.user) return cookieUser.data.user;

  // Fallback to Bearer token
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const byToken = await admin.auth.getUser(token);
  return byToken.data.user ?? null;
}
