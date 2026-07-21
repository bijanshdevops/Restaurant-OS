# Decision Log — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Living log of all decisions — a chronological record separate from the ADR/RFC files themselves |
| **Scope**          | All architectural decisions — formal and informal |
| **Status**         | Living Document |
| **Owner**          | Architecture Board |
| **Assumptions**    | Formal decisions have ADRs; informal discussions are captured here |
| **Constraints**    | All formal decisions must have an ADR; this log supplements, not replaces |
| **Risks**          | Log becomes stale; decisions made informally not captured |
| **References**     | [DECISION_PROCESS](../governance/DECISION_PROCESS.md), [docs/09-decisions/README.md](../docs/09-decisions/README.md) |

---

## Phase 0 — Foundation Decisions

| Date | Decision | Type | Status | Document |
|---|---|---|---|---|
| 2026-07-08 | Modular Monolith First | Strategic | Draft | [ADR-0001](../adr/strategic/ADR-0001-modular-monolith-first.md) |
| 2026-07-08 | DDD + Clean Architecture | Strategic | Draft | [ADR-0002](../adr/strategic/ADR-0002-ddd-and-clean-architecture.md) |
| 2026-07-08 | Event-Driven Integration | Strategic | Draft | [ADR-0003](../adr/strategic/ADR-0003-event-driven-integration.md) |
| 2026-07-08 | Multi-Tenant Row-Level Isolation | Tactical | Draft | [ADR-0004](../adr/tactical/ADR-0004-multi-tenant-data-isolation.md) |
| 2026-07-08 | CQRS + Event Sourcing Readiness | Tactical | Draft | [ADR-0005](../adr/tactical/ADR-0005-cqrs-and-event-sourcing-readiness.md) |
| 2026-07-09 | Cloud Agnostic Deployment Strategy (revised — Rejected Azure) | Strategic | Draft | [ADR-0006](../adr/strategic/ADR-0006-cloud-agnostic-deployment-strategy.md) |
| 2026-07-08 | Technology Stack: .NET 9 / React PWA | Strategic | Draft | [ADR-0007](../adr/strategic/ADR-0007-technology-stack.md) |
| 2026-07-08 | Data Platform: PostgreSQL + SQLite edge | Strategic | Draft | [ADR-0008](../adr/strategic/ADR-0008-data-platform-strategy.md) |
| 2026-07-09 | Identity: Provider-neutral Identity Platform (Keycloak default) | Strategic | Draft | [ADR-0009](../adr/strategic/ADR-0009-identity-and-access-management.md) |
| 2026-07-08 | Plugin Architecture: in-process hooks + webhooks | Strategic | Draft | [ADR-0010](../adr/strategic/ADR-0010-plugin-architecture.md) |
| 2026-07-08 | Observability: OTEL + Grafana stack | Strategic | Draft | [ADR-0011](../adr/strategic/ADR-0011-observability-strategy.md) |
| 2026-07-08 | Failure Recovery: outbox + circuit breakers + saga | Strategic | Draft | [ADR-0012](../adr/strategic/ADR-0012-failure-recovery-model.md) |
| 2026-07-08 | Operability: GitOps + ArgoCD + runbook framework | Strategic | Draft | [ADR-0013](../adr/strategic/ADR-0013-production-operability-model.md) |

---

## Pending Decisions (Open Questions for Phase 1)

| Question | Raised By | Date | Status |
|---|---|---|---|
| Cloud provider selection | Principal Architect | 2026-07-08 | ✅ Resolved — ADR-0006 (Azure) |
| Programming language / framework | Principal Architect | 2026-07-08 | ✅ Resolved — ADR-0007 (.NET 9 / React) |
| Event bus technology (Phase 3) | Principal Architect | 2026-07-08 | ⏳ Deferred — ADR required before Phase 3 extraction |
| Database technology | Principal Architect | 2026-07-08 | ✅ Resolved — ADR-0008 (PostgreSQL) |
| UI technology stack | UI Lead | 2026-07-08 | ✅ Resolved — ADR-0007 (React PWA) |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial decision log |
