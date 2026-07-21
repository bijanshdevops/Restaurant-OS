# Architecture Decisions Registry — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Cross-cutting decision registry within the architecture assets layer |
| **Scope**          | All reusable architecture decisions surfaced for module teams |
| **Status**         | Living Document |
| **Owner**          | Architecture Board |
| **Assumptions**    | This supplements the formal ADR index; it surfaces decisions relevant to module implementation teams |
| **Constraints**    | Decisions here reference Approved ADRs; they do not supersede them |
| **Risks**          | Divergence from the ADR index |
| **References**     | [ADR Index](../../adr/README.md), [Architecture Principles](../principles/README.md) |

---

## Cross-Cutting Decisions Summary

A quick reference for module teams implementing their contexts.

| Topic | Decision | Reference |
|---|---|---|
| Architecture style | Modular Monolith in Phase 1-2; selective extraction in Phase 3+ | ADR-0001 |
| Domain modelling | DDD — Aggregates, Value Objects, Domain Events, Domain Services | ADR-0002 |
| Module structure | Clean Architecture: API → Application → Domain ← Infrastructure | ADR-0002 |
| Cross-module integration | Domain events only; outbox pattern for reliability | ADR-0003 |
| Tenant isolation | Row-level with repository-layer enforcement; tenant ID in all queries | ADR-0004 |
| Read models | CQRS — separate read models (projections) from write models | ADR-0005 |
| API design | REST, OpenAPI, versioned from v1, RFC 7807 errors | API Standards |
| Events | PastTense naming, standard envelope, registered in EVENT_CATALOG | Event Standards |
| Observability | OpenTelemetry traces + RED metrics + structured JSON logs | Observability Ref Model |
| Security | JWT at gateway, RBAC + tenant scope, vault for secrets | Security Ref Model |
| Offline | POS and KDS: offline-first, local event store, sync on reconnect | Deployment Ref Model |

---

## Decisions Pending (for Phase 1 Implementation)

| Decision Needed | Blocking | Target Date |
|---|---|---|
| Cloud provider | Phase 1 infrastructure setup | TBD |
| Programming language / framework | Phase 1 code | TBD |
| Database technology | Phase 1 implementation | TBD |
| UI technology | Phase 1 UI | TBD |
| Event bus technology (Phase 3) | Phase 3 extraction | TBD (not blocking Phase 1) |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial decisions registry |
