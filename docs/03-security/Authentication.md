# Authentication — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the authentication strategy for all users and services in Restaurants OS |
| **Scope**          | Human users, service accounts, edge devices, external integrations |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | External Identity Provider (IdP) is used; Restaurants OS does not manage passwords |
| **Constraints**    | Must support multi-tenant; each tenant may use their own IdP |
| **Risks**          | Token expiry management on edge devices; offline authentication without IdP connectivity |
| **References**     | OAuth2 RFC 6749, OIDC Core 1.0, [ThreatModel](ThreatModel.md) |
| **Related Documents** | [Authorization](Authorization.md), [Identity Platform](../04-platform/IDENTITY_PLATFORM.md) |

---

## Authentication Strategy

### Human Users

| Aspect | Approach |
|---|---|
| **Protocol** | OpenID Connect (OIDC) over OAuth2 |
| **Token Format** | JWT (RS256 signed) |
| **Token Expiry** | Access: 15 minutes; Refresh: 24 hours |
| **MFA** | Required for Manager and Admin roles |
| **SSO** | Supported via OIDC federation with corporate IdPs |
| **Session** | Stateless; token validated on every request |

### Service-to-Service

| Aspect | Approach |
|---|---|
| **Protocol** | OAuth2 Client Credentials |
| **Token Format** | JWT with service identity claims |
| **Token Expiry** | 60 minutes; auto-renewed |
| **Mutual TLS** | Required in Phase 3+ (microservices) |

### Edge Devices (Kitchen / POS)

| Aspect | Approach |
|---|---|
| **Registration** | Device certificate issued during provisioning |
| **Online Auth** | OIDC with device-bound refresh token |
| **Offline Auth** | Pre-issued offline token; limited TTL (8 hours); re-authentication on reconnect |
| **Token Revocation** | Device can be remotely deregistered via platform |

---

## Token Claims

All tokens issued by the Identity Platform must include:

| Claim | Description |
|---|---|
| `sub` | Subject (user or service identity) |
| `tid` | Tenant ID |
| `bid` | Brand IDs (array) |
| `roles` | Role list for RBAC |
| `sid` | Session ID for audit correlation |
| `iat`, `exp` | Issued at / Expiry |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial authentication strategy |
