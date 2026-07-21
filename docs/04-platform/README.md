# Platform Engineering — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Overview of Platform Engineering for Restaurants OS — the internal developer platform |
| **Scope**          | All platform services: Identity, Plugin, Configuration, Storage |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Platform services are shared infrastructure consumed by all business modules |
| **Constraints**    | Platform services must not contain business logic; they are pure infrastructure |
| **Risks**          | Platform becoming a bottleneck; platform team becoming a dependency blocker |
| **References**     | Team Topologies (Skelton & Pais), [Architecture Principles](../02-architecture/00-architecture-principles.md) |
| **Related Documents** | [PLATFORM_SERVICES](PLATFORM_SERVICES.md), [PLUGIN_PLATFORM](PLUGIN_PLATFORM.md) |

---

## Platform Philosophy

The Platform Team operates as an **enabling team**. Its purpose is to reduce cognitive load for business domain teams by providing:

1. **Self-service infrastructure** — Domain teams provision resources without involving the platform team
2. **Golden paths** — Opinionated, well-documented patterns for common tasks
3. **Paved roads** — Pre-built integrations that make the right thing the easy thing
4. **Platform APIs** — Well-documented, versioned APIs for all platform capabilities

The Platform does not own business logic. It owns the infrastructure on which business logic runs.

---

## Platform Services

| Service | Description | Phase |
|---|---|---|
| Identity Platform | Multi-tenant identity, authentication, authorization | Phase 2 |
| Plugin Platform | Extension point management, plugin lifecycle | Phase 2 |
| Configuration Platform | Per-tenant/branch/environment configuration and feature flags | Phase 2 |
| Storage Platform | Structured, blob, and event storage abstractions | Phase 2 |
| Notification Service | Email, SMS, push notification delivery | Phase 3 |
| Audit Platform | Structured audit trail collection and querying | Phase 2 |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial platform overview |
