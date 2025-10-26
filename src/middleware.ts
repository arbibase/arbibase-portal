import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/properties', '/favorites', '/requests', '/billing', '/account'];
  
  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    // Check for auth token in cookies
    const token = request.cookies.get('sb-access-token')?.value || 
                  request.cookies.get('sb-refresh-token')?.value;

    // If no token, redirect to login
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/properties/:path*', '/favorites/:path*', '/requests/:path*', '/billing/:path*', '/account/:path*'],
};
