import { NextResponse, type NextRequest } from 'next/server';

/**
 * Block legacy monolith API routes.
 *
 * All API traffic must go through the microservice API Gateway (port 3000).
 * These Next.js API routes are kept only for reference and will be removed.
 * Only /api/health is allowed through for monitoring.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LEGACY_ROUTE_DISABLED',
          message: 'This endpoint has been moved to the API Gateway. Use the /api/v2/ prefix via the gateway.',
        },
      },
      { status: 410 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
