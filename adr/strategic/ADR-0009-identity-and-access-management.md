# ADR-0009: Identity and Access Management

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the provider-neutral Identity Platform contract, authentication standards, and authorization model for Restaurants OS |
| **Scope**          | All authentication and authorization across every deployment environment |
| **Status**         | Draft |
| **Owner**          | Security Architect + Principal Architect |
| **Assumptions**    | ADR-0006 is approved and binding — no architectural dependency on any cloud provider; the Identity Platform is a logical abstraction, not a named product; any OIDC-compliant provider that satisfies the contract is a valid implementation |
| **Constraints**    | The application must depend only on the Identity Platform interface, never on a specific product (Keycloak, Entra, Okta, etc.); must support offline-first POS authentication; must support multi-tenant, multi-branch isolation at the authorization layer |
| **Risks**          | IdP contract drift — implementation-specific features bleeding into application code; offline credential cache creating a security surface; privilege escalation through misconfigured roles |
| **References**     | [Authentication](../../docs/03-security/Authentication.md), [Authorization](../../docs/03-security/Authorization.md), [ThreatModel](../../docs/03-security/ThreatModel.md), [ADR-0006](ADR-0006-cloud-agnostic-deployment-strategy.md) |
| **Related Documents** | [Identity Platform](../../docs/04-platform/IDENTITY_PLATFORM.md), [ADR-0007](ADR-0007-technology-stack.md), [ADR-0010](ADR-0010-plugin-architecture.md), [Security Reference Model](../../architecture/reference-models/security-reference-model.md) |

---

## Context

Restaurants OS must support authentication and authorization across diverse deployment environments — public cloud, private cloud, sovereign cloud, and on-premises (ADR-0006). The previous version of this ADR specified Microsoft Entra External ID as the Identity Provider. That decision is **superseded** by ADR-0006's requirement for zero cloud vendor lock-in.

Identity is a critical platform service. The architecture must ensure:

1. **The application never depends on a specific Identity Provider product.** It depends on the Identity Platform contract — a set of standard protocols and a defined token structure.
2. **Any OIDC-compliant Identity Provider can be substituted** as a deployment-time decision without changing application source code.
3. **Authentication and authorization remain functional in offline environments** (POS, KDS) regardless of which provider is deployed.

## Problem Statement

How should Restaurants OS define its Identity and Access Management architecture such that: (a) authentication and authorization are fully provider-neutral; (b) the application depends only on open standards; (c) any compliant IdP can be deployed per environment; and (d) the system satisfies multi-tenant RBAC + ABAC + policy-based authorization requirements?

---

## The Identity Platform

**Identity Platform** is the logical name for the authentication and authorization capability in Restaurants OS. It is an architectural boundary — not a product name.

```
┌──────────────────────────────────────────────┐
│              Identity Platform               │
│                                              │
│  Contract:                                   │
│    • OIDC Discovery Endpoint                 │
│    • JWT Token (defined claims structure)    │
│    • OAuth 2.1 token endpoints               │
│    • JWKS Endpoint (public key rotation)     │
│                                              │
│  Implementation (chosen per deployment):     │
│    • Keycloak (default)                      │
│    • OpenIddict (embedded alternative)       │
│    • Authentik, Zitadel, Entra, Okta, Auth0 │
└──────────────────────────────────────────────┘
         │
         │  Standard protocols only
         ▼
┌──────────────────────────────────────────────┐
│           Application Layer                  │
│  (No import of any IdP SDK)                  │
│  Validates JWT · Reads claims · Enforces     │
│  RBAC + ABAC + Policy-based authorization   │
└──────────────────────────────────────────────┘
```

The application layer must:
- Validate JWT tokens using the JWKS endpoint (standard OIDC discovery)
- Read only the defined JWT claims structure (see below)
- Never call any IdP product SDK (Keycloak Admin API, Entra Graph API, etc.) in the application or domain layer
- IdP management calls (user provisioning, role assignment) are the responsibility of the Infrastructure layer only

---

## Alternatives Considered

### Identity Provider: Option A — Keycloak (Recommended Default)

**Description**: Keycloak is the open-source, enterprise-grade Identity Provider selected as the default implementation for all self-hosted and cloud deployments where no managed IdP is required or available.

**Pros**:
- Fully open-source (Apache 2.0); self-hostable on Kubernetes
- Supports OIDC, OAuth 2.1, SAML 2.0, LDAP, Active Directory federation
- Multi-tenant realm isolation natively
- B2C and B2B flows (social login, corporate federation)
- Device Authorization Flow for POS/KDS terminals
- MFA: TOTP, WebAuthn, SMS (via SPI)
- Fine-grained authorization (UMA 2.0) for future policy-based use cases
- Active community; long-term CNCF ecosystem alignment
- Zero per-MAU cost; operator owns the data

**Cons**:
- HA deployment requires operational knowledge (database-backed clustering)
- Keycloak admin UI complexity can be overwhelming initially
- Cache/session store (Infinispan) adds stateful infrastructure

---

### Identity Provider: Option B — OpenIddict (Embedded Alternative)

**Description**: OpenIddict is a .NET-native OIDC/OAuth server framework that runs embedded within the application process.

**Pros**:
- Zero additional infrastructure for simple deployments
- Native .NET; tight integration with ASP.NET Core
- Suitable for single-tenant or lightweight multi-tenant scenarios

**Cons**:
- Not suitable for large-scale multi-tenant deployments (no built-in realm isolation at scale)
- No built-in SAML, no native AD federation
- Less suitable for enterprise B2B federation

**Use case**: OpenIddict is the recommended implementation for development environments, single-tenant deployments, or edge scenarios where a full Keycloak cluster is not appropriate.

---

### Identity Provider: Option C — Managed IdP (Cloud-Specific, Optional)

Any OIDC-compliant managed Identity Provider may be used as a deployment-time choice:

| Provider | Standard Compliance | Notes |
|---|---|---|
| Microsoft Entra External ID | OIDC, OAuth 2.1 | Suitable for Azure deployments; enterprise federation |
| Okta / Auth0 | OIDC, OAuth 2.1 | Commercial; per-MAU pricing |
| Authentik | OIDC, SAML, LDAP | Open source; self-hostable alternative to Keycloak |
| Zitadel | OIDC, OAuth 2.1 | Modern; strong multi-tenant model; self-hostable |
| Dex | OIDC | Lightweight; federation focus |

**Decision**: Any of the above may be used in a specific deployment environment, provided it satisfies the Identity Platform contract. **No application code change is required.** Only infrastructure configuration (OIDC discovery URL, realm, client credentials) changes between deployments.

---

## Decision

> **Restaurants OS defines a provider-neutral Identity Platform. The default implementation is Keycloak. OpenIddict is the embedded alternative for lightweight deployments. Any OIDC-compliant Identity Provider that satisfies the Identity Platform contract is a valid implementation. Application code never imports or references any specific Identity Provider SDK.**

---

### Authentication Standards

The Identity Platform MUST support all of the following:

| Standard | Purpose |
|---|---|
| **OAuth 2.1** | Token issuance; replaces OAuth 2.0 with mandatory PKCE, no implicit flow |
| **OpenID Connect (OIDC)** | Identity layer on top of OAuth 2.1; discovery, userinfo, ID tokens |
| **JWT (RS256 or ES256)** | Token format; signed, stateless, short-lived |
| **Refresh Tokens** | Silent re-authentication for web and mobile clients |
| **Device Authorization Flow (RFC 8628)** | POS/KDS terminal authentication without browser |
| **PKCE (RFC 7636)** | Required for all public clients (SPA, PWA, mobile, terminal) |

Flows NOT permitted:
- Implicit Flow (removed in OAuth 2.1)
- Resource Owner Password Credentials (ROPC) — prohibited except for internal service accounts with Architecture Board approval

---

### JWT Claims Structure

The Identity Platform MUST issue tokens with the following standardised claim structure. Application code reads these claims. No other claims are required.

```json
{
  "sub":         "uuid — stable user identifier across sessions",
  "iss":         "https://identity.restaurants-os.example/",
  "aud":         "restaurants-os-api",
  "iat":         1720000000,
  "exp":         1720000900,
  "jti":         "uuid — unique token ID for revocation",
  "tid":         "uuid — tenant identifier",
  "bid":         "uuid | null — branch identifier (null = tenant-wide)",
  "roles":       ["Manager", "Cashier"],
  "permissions": ["orders:write", "menu:read"],
  "shift":       "uuid | null — active shift ID (null = no shift)"
}
```

**Rules**:
- `exp`: maximum 15 minutes for access tokens
- Refresh token: maximum 8 hours (session), 30 days (remember-me)
- `jti`: used for token revocation detection
- All fields are mandatory; `bid` and `shift` may be null

---

### Authorization Model

The application enforces a four-layer authorization model. All layers operate on JWT claims — no runtime IdP calls during request processing.

#### Layer 1: Role-Based Access Control (RBAC)

Permissions are grouped into roles. Roles are assigned per tenant.

| Role | Scope | Core Permissions |
|---|---|---|
| SystemAdmin | Platform | Full platform administration |
| TenantAdmin | Tenant | Tenant configuration, user and role management |
| FranchiseAdmin | Franchise | Cross-branch reporting, brand configuration |
| BranchManager | Branch | Full branch operations, staff management, discounts |
| Supervisor | Branch | Operations, voids, discounts |
| Cashier | Branch/Terminal | Order creation, payment, cash handling |
| Waiter | Branch | Order creation, table management |
| KitchenStaff | Branch/Station | Ticket lifecycle management |
| Customer | Loyalty program | Own account, order history |

#### Layer 2: Attribute-Based Access Control (ABAC)

Claims from the JWT are combined with RBAC at the authorization point. The application enforces:

| Attribute | Source | Rule |
|---|---|---|
| `tid` (tenant) | JWT claim | User can only access resources matching their `tid` — always enforced |
| `bid` (branch) | JWT claim | Branch-scoped users cannot access other branches |
| `shift` (active shift) | JWT claim | POS permissions require an active, non-null `shift` |

#### Layer 3: Policy-Based Authorization

Complex authorization rules that cannot be expressed as simple role+attribute checks are encoded as named policies in the application layer.

**Policy examples**:

| Policy | Rule |
|---|---|
| `CanVoidOrder` | Role `Supervisor` or `BranchManager` AND `bid` matches order's branch AND shift is active |
| `CanViewFinancialReport` | Role `BranchManager` or `FranchiseAdmin` AND `tid` matches report's tenant |
| `CanModifyMenu` | Role `TenantAdmin` or `BranchManager` AND current time is not peak service window |

Policies are declared in application code (not in the IdP). They reference JWT claims only. They are tested as unit tests.

#### Layer 4: Resource-Based Authorization

For operations where the requester's identity must be checked against the specific resource being accessed:

```
CanEditOrder(user, order) → true if:
  user.tid == order.TenantId  (tenant isolation)
  AND user.bid == order.BranchId OR user has TenantAdmin role
  AND order.Status != Completed
```

Resource-based checks are performed in the Application Layer command/query handlers, after RBAC and ABAC pre-filtering.

---

### Tenant and Branch Isolation

Tenant isolation is **always enforced** — it is never optional, never disabled, never a feature flag:

- `tid` from the JWT is injected into all repository queries (see ADR-0004)
- A user with `tid = A` can never read or write data belonging to `tid = B`
- Branch isolation (`bid`) is enforced for branch-scoped roles
- These checks are structural — enforced in the repository base class and application layer, not only in the UI

---

### Offline Authentication

Offline authentication is an **implementation capability** of the Identity Platform — not a dependency on any specific provider.

**Specification** (provider-neutral):

| Property | Value |
|---|---|
| **Mechanism** | Encrypted credential cache stored on the terminal device |
| **Token type** | Short-lived offline token (signed JWT, issued by Identity Platform at shift start) |
| **Encryption** | AES-256-GCM; key derived from device identity + PIN |
| **Default expiry** | 4 hours (configurable per deployment: `identity.offline.token.ttl`) |
| **Maximum offline window** | 24 hours (configurable: `identity.offline.max.window`) |
| **Revalidation** | Full OIDC re-authentication required on reconnect if token has expired |
| **PIN fallback** | 6-digit PIN allowed for intra-session terminal unlock only (does not extend token TTL) |
| **Revocation** | Revocation list synced at reconnect; revoked tokens cannot be renewed |

**Implementation requirement**: The terminal's local Identity Platform adapter must implement this capability. When Keycloak is deployed, an offline token is obtained via the Device Authorization Flow at shift start. When OpenIddict or another provider is deployed, the same capability is expected through that provider's equivalent mechanism.

Application code calls `IIdentityPlatform.GetOfflineToken()` — not a Keycloak-specific API.

---

### Future Replaceability

> **Any OIDC-compliant Identity Provider can replace Keycloak without requiring application code changes.**

The only changes required are:
1. Update the OIDC discovery URL in infrastructure configuration
2. Update the client credentials in the secrets manager
3. Update the user migration (if changing providers for an existing deployment)

Application code never references Keycloak, OpenIddict, or any other product. It references only:
- `IIdentityPlatform` — the interface in the Application Layer
- Standard JWT claims (see Claims Structure above)
- Standard OIDC discovery endpoint

Compatible providers that can replace Keycloak with zero code change:

| Provider | Type | Notes |
|---|---|---|
| Keycloak | Self-hosted OSS | Default |
| OpenIddict | Embedded .NET | Lightweight alternative |
| Authentik | Self-hosted OSS | Alternative self-hosted |
| Zitadel | Self-hosted / Cloud | Modern OIDC; strong multi-tenant |
| Microsoft Entra External ID | Managed (Azure) | Suitable for Azure deployments |
| Okta / Auth0 | Managed (Commercial) | Per-MAU pricing; commercial use |
| Dex | Self-hosted OSS | Federation-focused; lightweight |

---

## Consequences

### Positive
- Application is completely decoupled from any Identity Provider product
- Changing the IdP requires only infrastructure configuration changes — no code changes
- Sovereign cloud and regulated environments can use locally available OIDC providers
- Zero per-MAU cost with Keycloak self-hosted
- Operator owns all identity data — no data residency concerns from an external IdP
- Offline authentication is provider-neutral and configurable per deployment

### Negative
- Keycloak HA deployment requires PostgreSQL backing store and operational expertise
- The Identity Platform interface (`IIdentityPlatform`) must be carefully designed and not allow implementation-specific capabilities to leak through
- Offline token management adds complexity to terminal provisioning and shift management

### Neutral
- RBAC role definitions are a governance artifact — must be maintained in Identity Platform docs regardless of which provider is deployed

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Managed IdP (Entra External ID, Okta) convenience vs. portability | Portability wins — managed IdPs are optional substitutes, not defaults |
| Keycloak operational complexity vs. feature completeness | Keycloak — feature completeness (Device Flow, SAML federation, realm isolation) justifies the operational cost |
| Per-MAU cloud identity cost vs. self-hosted | Self-hosted Keycloak — zero per-MAU cost; operator controls the data |
| Strong online auth vs. offline availability | Offline token cache with configurable TTL — balance of security and POS operational necessity |
| External policy engine (OPA) vs. in-app policies | In-app policies (Phase 1-3) — OPA may be introduced in Phase 4 if cross-service policy management is required |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Keycloak HA failure causing auth outage | Low | Critical | Keycloak active-active cluster; health check alerting; offline tokens buffer short outages |
| IdP contract leaking — Keycloak API called from app code | Medium | High | Architecture fitness function: no Keycloak / IdP SDK imports in Application or Domain layers |
| JWT claim misconfiguration | Medium | High | Authorization integration tests covering all claim combinations; claim validation in CI |
| Privilege escalation via role misconfiguration | Low | Critical | RBAC role matrix reviewed in Architecture Board; unit-tested policies |
| Offline credential cache compromised on lost terminal | Low | High | Device encryption required (MDM); remote credential revocation on reconnect |
| Token TTL too long — stale permissions after role change | Medium | Medium | Short access token TTL (15 min); refresh token validates current roles at each renewal |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| No vendor lock-in (ADR-0006) | Identity Platform abstraction ensures zero application dependency on any IdP product |
| Infrastructure portability (ADR-0006) | Any OIDC-compliant provider satisfies the contract; provider is a deployment configuration |
| Principle 4: Multi-Tenant by Design | `tid` in JWT enforced on every request; structural tenant isolation |
| Principle 5: Security by Design | OIDC + OAuth 2.1 at API Gateway; RBAC + ABAC + Policy-based in Application Layer |
| Principle 8: Offline First | Provider-neutral offline token specification supports POS/KDS without network |
| Open standards preferred (ADR-0006) | OAuth 2.1, OIDC, JWT, PKCE — all open standards; no proprietary protocol |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Security | QAS-SEC-001: Tenant isolation via `tid` claim; QAS-SEC-002: MFA enforced at IdP level |
| Portability | Any OIDC-compliant provider can be deployed without code change |
| Availability | QAS-AVAIL-002: Offline token enables POS operation during IdP unavailability |
| Compliance | JWT stateless → no session storage; short-lived tokens reduce breach window |
| Operational Independence | Self-hosted Keycloak → no vendor relationship required for identity |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Vision** | [00-architecture-vision.md](../../docs/02-architecture/00-architecture-vision.md) |
| **Architecture Principle** | No vendor lock-in; Principle 4 (Multi-Tenant); Principle 5 (Security); Principle 8 (Offline First) |
| **Quality Attribute** | QAS-SEC-001, QAS-SEC-002, QAS-AVAIL-002 |
| **Threat Model** | TM-GW-001 (JWT validation on every request), TM-MT-001 (tenant isolation) |
| **Hard Constraint** | HC-003 (no hardcoded credentials), HC-004 (tenant filter on all queries) |
| **ADR-0006** | [Cloud Agnostic Deployment Strategy](ADR-0006-cloud-agnostic-deployment-strategy.md) — **this ADR is fully consistent with ADR-0006** |
| **ADR-0004** | [Multi-Tenant Data Isolation](../tactical/ADR-0004-multi-tenant-data-isolation.md) — `tid` claim enforced at repository layer |
| **ADR-0007** | [Technology Stack](ADR-0007-technology-stack.md) — .NET 9; IIdentityPlatform interface in Application Layer |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] Architecture Board confirms Identity Platform abstraction design
- [ ] Security Architect has reviewed JWT claims structure and TTL values
- [ ] Security Architect has reviewed offline token specification (encryption, TTL, revocation)
- [ ] RBAC role matrix reviewed by all domain leads
- [ ] Fitness function defined: no IdP SDK import in Application or Domain layer
- [ ] `IIdentityPlatform` interface designed and reviewed before implementation begins
- [ ] Policy-based authorization examples reviewed and accepted
- [ ] Keycloak HA requirements accepted by SRE Lead
- [ ] ADR-0006 cross-reference verified — no conflict between ADR-0006 and ADR-0009
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial draft — Microsoft Entra External ID as Identity Provider |
| 2026-07-09 | Architecture Board | **Superseded** — ADR-0006 approved; Entra External ID creates cloud vendor lock-in |
| 2026-07-09 | Security Architect | Complete revision — provider-neutral Identity Platform; Keycloak default; OpenIddict alternative; OAuth 2.1 + OIDC + PKCE + Device Flow; RBAC + ABAC + Policy-based + Resource-based authorization; offline auth as configurable implementation capability |
