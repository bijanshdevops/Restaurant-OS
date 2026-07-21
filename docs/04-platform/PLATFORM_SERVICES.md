# Platform Services Catalog — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Catalog all platform services, their responsibilities, ownership, and SLA targets |
| **Scope**          | All shared platform services consumed by business modules |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Platform services are consumed via well-defined APIs; not embedded in modules |
| **Constraints**    | Platform services must be domain-agnostic |
| **Risks**          | Platform SLA failures cascade to all consuming modules |
| **References**     | [README](README.md), [SRE](../07-devops/SRE.md) |
| **Related Documents** | [IDENTITY_PLATFORM](IDENTITY_PLATFORM.md), [PLUGIN_PLATFORM](PLUGIN_PLATFORM.md) |

---

## Service Catalog

| Service | Owner | SLA | Phase | API Type |
|---|---|---|---|---|
| Identity Service | Platform Lead | 99.99% | Phase 2 | REST / OIDC |
| Configuration Service | Platform Lead | 99.9% | Phase 2 | REST |
| Plugin Host | Platform Lead | 99.9% | Phase 2 | Internal API |
| Storage Service | Platform Lead | 99.99% | Phase 2 | REST / SDK |
| Audit Service | Platform Lead | 99.9% | Phase 2 | REST (write-only) |
| Notification Service | Platform Lead | 99.5% | Phase 3 | REST / Event |

---

## Service Standards

All platform services must:

1. Expose a versioned REST API with OpenAPI specification
2. Implement health probes (liveness, readiness, startup) — see [HEALTH_CHECKS.md](../07-devops/HEALTH_CHECKS.md)
3. Emit OpenTelemetry traces and metrics
4. Log in structured JSON format — see [LOGGING.md](../07-devops/LOGGING.md)
5. Have a published SLA and error budget
6. Support multi-tenant isolation natively

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial service catalog |
