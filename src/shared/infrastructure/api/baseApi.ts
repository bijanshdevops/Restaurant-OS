/**
 * Base API utility that wraps the native fetch API.
 * Automatically injects the x-tenant-id header by reading it from cookies
 * (or from local storage in a purely client-side SPA, but here we assume Next.js client context).
 * 
 * Note: In a real Next.js app, reading cookies securely on the client requires
 * passing the context from the Server Component, or an HTTP-Only cookie check
 * on the backend. For this mock, we assume the token is available to the client.
 */

function getTenantToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )tenant_session=([^;]+)'));
  return match ? match[2] : null;
}

export async function baseApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tenantToken = getTenantToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  headers.set('x-tenant-id', tenantToken ?? 'demo-tenant');
  if (tenantToken) {
    headers.set('Authorization', `Bearer valid-tenant-${tenantToken}`);
  } else {
    // Dev fallback: allows dashboard to work without login
    headers.set('Authorization', 'Bearer dev-bypass-token');
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignore JSON parse error on non-JSON error responses
    }
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json.data as T; // Assuming our standard API response shape { data: T }
}
