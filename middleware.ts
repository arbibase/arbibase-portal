import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  // Touch session so auth cookies are kept fresh for server routes
  await supabase.auth.getSession();
  return res;
}

// Adjust matchers as you prefer
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
