import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/properties', '/favorites', '/requests', '/billing', '/account'];
  
  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    // Look for any Supabase auth cookie
    const cookies = request.cookies.getAll();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.includes('auth')
    );

    // If no auth cookie found, redirect to login
    if (!hasAuthCookie) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/properties/:path*', 
    '/favorites/:path*', 
    '/requests/:path*', 
    '/billing/:path*', 
    '/account/:path*'
  ],
};
