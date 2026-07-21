# Security Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for security across the platform |
| **Scope**          | All security concerns — identity, authorization, data protection, secrets, audit |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | Security is structural, not bolted-on |
| **Constraints**    | Tenant isolation is always structural; not filter-only |
| **Risks**          | Security model not consulted during module implementation |
| **References**     | [ThreatModel](../../docs/03-security/ThreatModel.md), [Authentication](../../docs/03-security/Authentication.md) |
| **Related Documents** | [Authorization](../../docs/03-security/Authorization.md), [Audit](../../docs/03-security/Audit.md) |

---

## Security Model Summary

```
┌─────────────────────────────────────────────────┐
│  Every Request Must Pass:                       │
│                                                  │
│  1. Authentication (JWT validated at Gateway)   │
│  2. Authorization  (RBAC + tenant scope)        │
│  3. Tenant Isolation (repo-layer enforced)      │
│  4. Audit (written on sensitive operations)     │
│                                                  │
│  Plus:                                          │
│  5. Secrets in vault only                       │
│  6. No PII in logs                              │
│  7. TLS everywhere (transit)                    │
│  8. Encryption at rest (storage)                │
└─────────────────────────────────────────────────┘
```

---

## Defense in Depth Layers

| Layer | Controls |
|---|---|
| Network | TLS 1.2+, HTTPS enforced, HSTS |
| Perimeter | API Gateway, rate limiting, WAF |
| Identity | JWT validation, short expiry, MFA for admins |
| Authorization | RBAC, tenant scope enforcement |
| Data | Row-level tenant ID, encryption at rest |
| Audit | Immutable audit trail, 7-year retention |
| Secrets | Vault, rotation, least-privilege |
| Code | SAST, dependency scanning, secret scanning |

---

## Security Fitness Functions

| FF | Check |
|---|---|
| FF-010 | No hardcoded secrets, tenant IDs, or credentials |
| TM-GW-001 | JWT validated on every request |
| TM-MT-001 | All repository queries include tenant filter |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial security reference model |
