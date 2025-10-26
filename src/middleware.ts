import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disabled for debugging - remove this return to re-enable
  return NextResponse.next();
  
  /* Original middleware code - commented out for now
  const path = request.nextUrl.pathname;
  const protectedRoutes = ['/dashboard', '/properties', '/favorites', '/requests', '/billing', '/account'];
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    const cookies = request.cookies.getAll();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.includes('auth')
    );

    if (!hasAuthCookie) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
  */
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
