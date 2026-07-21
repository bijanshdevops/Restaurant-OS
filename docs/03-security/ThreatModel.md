# Threat Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document the STRIDE threat model for Restaurants OS, identifying threats per component and their mitigations |
| **Scope**          | All components: API Gateway, Core Modules, Platform Services, Edge Nodes |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | STRIDE methodology; threat model reviewed per phase |
| **Constraints**    | All identified threats must have an explicit mitigation or accepted risk |
| **Risks**          | Threat model not kept current as architecture evolves |
| **References**     | STRIDE (Microsoft), OWASP Top 10, [Authentication](Authentication.md), [Authorization](Authorization.md) |
| **Related Documents** | [Audit](Audit.md), [SecretsManagement](SecretsManagement.md) |

---

## STRIDE Categories

| Category | Description |
|---|---|
| **S**poofing | Attacker impersonates a legitimate user or service |
| **T**ampering | Attacker modifies data in transit or at rest |
| **R**epudiation | Actor denies performing an action |
| **I**nformation Disclosure | Sensitive data exposed to unauthorized parties |
| **D**enial of Service | Service made unavailable |
| **E**levation of Privilege | Actor gains unauthorized access level |

---

## API Gateway Threats

| ID | Category | Threat | Mitigation |
|---|---|---|---|
| TM-GW-001 | Spoofing | Forged JWT tokens to impersonate users | Validate JWT signature and claims on every request; short token expiry (15 min) |
| TM-GW-002 | DoS | Request flooding overwhelms the gateway | Rate limiting per tenant and per endpoint; circuit breakers |
| TM-GW-003 | Information Disclosure | Error responses reveal internal structure | Standardized error responses; no stack traces in production |
| TM-GW-004 | Tampering | Request body tampering in transit | HTTPS enforced; HSTS headers; TLS 1.2+ minimum |

---

## Multi-Tenant Data Threats

| ID | Category | Threat | Mitigation |
|---|---|---|---|
| TM-MT-001 | Information Disclosure | Cross-tenant data access via misconfigured query | Structural tenant ID enforcement at storage layer; automated security tests |
| TM-MT-002 | Elevation of Privilege | Tenant admin escalates to platform admin | Separate admin roles; privileged access requires MFA and audit log |
| TM-MT-003 | Information Disclosure | Tenant data in shared caches | Cache keys always prefixed with tenant ID; cache TTL aligned with session |

---

## Domain Event Bus Threats

| ID | Category | Threat | Mitigation |
|---|---|---|---|
| TM-EVT-001 | Tampering | Event payload modified in transit | Event signing; consumer validates signature |
| TM-EVT-002 | Repudiation | Event publisher denies publishing | Event store with immutable append; correlation IDs; audit trail |
| TM-EVT-003 | Spoofing | Rogue module publishes events impersonating another | Service-to-service authentication on event bus; publisher identity claim |

---

## Edge Node (Kitchen / POS) Threats

| ID | Category | Threat | Mitigation |
|---|---|---|---|
| TM-EDGE-001 | Tampering | Local event store modified on-device | Local storage encryption; integrity checksums |
| TM-EDGE-002 | Spoofing | Rogue device joins the system | Device certificate authentication; device registration process |
| TM-EDGE-003 | Information Disclosure | Unencrypted sync traffic | All sync over TLS; local data encrypted at rest |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial threat model |
