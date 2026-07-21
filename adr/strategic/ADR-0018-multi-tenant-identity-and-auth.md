# ADR-0018: Multi-Tenant Identity and Authentication Strategy

## Status
Proposed

## Context
As we initiate Phase 2 (Platform Services), we must establish a rigorous, scalable, and secure mechanism to identify users and fundamentally enforce tenant isolation across the Restaurants OS ecosystem. The system handles highly sensitive operational, menu, and financial data across disparate tenants (restaurants and franchises). A failure in isolation could result in catastrophic cross-tenant data leaks. We require an authentication mechanism that flawlessly bridges the gap between our Next.js edge routing and our strict Clean Architecture boundaries, while maintaining cloud-native statelessness.

## Decision
We will implement a cryptographically secure JWT-based authentication strategy:

1. **Token Composition**: Authentication will rely on JWTs (JSON Web Tokens) that definitively contain the `tenantId` and `role` claims embedded securely within the verified payload.
2. **Platform Gateway (Next.js Middleware)**: We will implement a strict `TenantMiddleware` in Next.js. This middleware sits at the absolute edge of the application. It will cryptographically verify the JWT, extract the embedded `tenantId`, and securely attach it to the Request context (or propagate it via `AsyncLocalStorage` for deeper stack traversal).
3. **Immutable Isolation**: Once verified and established by the gateway middleware, the `tenantId` is fundamentally immutable for the entire lifecycle of that request.
4. **Dependency Injection Enforcement**: Controllers will extract this immutable `tenantId` from the secured context and pass it strictly into the Composition Root Factories. This permanently binds the downstream Repositories to a specific tenant boundary *before* any core business logic ever executes.

## Consequences

### Positive
- **Ironclad Isolation**: By deriving the `tenantId` strictly from a cryptographically signed token—rather than trusting user-submitted payload fields or URL parameters—we completely eliminate the attack vector for cross-tenant ID spoofing at the controller layer.
- **Stateless Scalability**: JWTs carry the tenant context inherently, removing the need for a stateful, centralized session database. This perfectly aligns with our cloud-native, serverless/edge-friendly deployment posture.
- **Uniformity**: Every module built during Phase 1 (Menu, Order, Kitchen) naturally inherits this perimeter defense via their established Factory DI patterns.

### Negative / Risks
- **Revocation Complexity**: Stateless tokens cannot be individually revoked before expiration without implementing a centralized token blocklist, which reintroduces state.
- **Security Posture**: If a token is intercepted, an attacker maintains authorized tenant access until the token expires.

### Mitigation
- We will strictly employ **short-lived access tokens** (e.g., 15 minutes) coupled with heavily guarded, rotation-based refresh tokens.
- Access tokens will be transmitted to web clients exclusively via **secure, HttpOnly, SameSite cookies** to proactively neutralize XSS (Cross-Site Scripting) vectors and mitigate CSRF attacks.
