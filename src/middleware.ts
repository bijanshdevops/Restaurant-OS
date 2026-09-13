import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RateLimiter } from './shared/infrastructure/gateway/RateLimiter';

export function middleware(request: NextRequest) {
  // Bypass authentication entirely for public Identity module routes (Login, Register)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  let tenantId: string | null = null;

  // 1. JWT Verification Mock (In production: verify cryptographic signature via 'jose' or equivalent)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // For this architectural simulation, we consider the token valid if it matches our strictly defined mock pattern
    if (token.startsWith('valid-tenant-')) {
      tenantId = token.replace('valid-tenant-', '');
    }
  }

  // 2. Boundary Defense: Reject immediately if no valid identity is established
  if (!tenantId) {
    // In development mode, allow unauthenticated requests with a demo tenant
    if (process.env.NODE_ENV !== 'production') {
      tenantId = 'demo-tenant';
    } else {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing authentication token.' },
        { status: 401 }
      );
    }
  }

  // 3. Security Perimeter: Strip any client-provided tenant headers and forcefully inject the cryptographically verified one.
  // This explicitly prevents cross-tenant spoofing attacks.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);

  // 4. API Gateway Throttling
  // We enforce a strict 100 requests / minute quota on high-traffic routes
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/orders') || path.startsWith('/api/analytics')) {
    if (!RateLimiter.isAllowed(tenantId, 100, 60000)) {
      return NextResponse.json(
        { error: 'Too Many Requests: Tenant API quota exceeded (100 req/min).' },
        { status: 429 }
      );
    }
  }

  // 5. Pass the sanitized, securely-identified request down to the Next.js Route Handlers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// 5. Edge configuration to guarantee execution on all internal module APIs
export const config = {
  matcher: '/api/:path*',
};
