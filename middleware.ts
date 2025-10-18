// middleware.ts (project root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  // Only guard admin API routes
  if (!req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Important: create a response and pass it into the middleware client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1) Try cookie-based session (normal browser calls)
  const { data, error } = await supabase.auth.getUser();
  let user = data?.user;

  // 2) Fallback: accept Authorization: Bearer <access_token>
  if (!user) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      const { data: fromToken } = await supabase.auth.getUser(token);
      user = fromToken?.user ?? null;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (user.user_metadata?.role as string) || "";
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Allow through; make sure to return the `res` we created so set-cookie works
  return res;
}

// Only run this middleware for admin API endpoints
export const config = {
  matcher: ["/api/admin/:path*"],
};
