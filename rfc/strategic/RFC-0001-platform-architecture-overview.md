# RFC-0001: Platform Architecture Overview

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Propose and open for comment the overall platform architecture for Restaurants OS |
| **Scope**          | All architecture decisions spanning the full system |
| **Status**         | Open for Comment |
| **Owner**          | Principal Architect |
| **Assumptions**    | RFC-0001 spawns multiple ADRs; it is a high-level framing document |
| **Constraints**    | Must be consistent with Product Vision and Phase 0 requirements |
| **Risks**          | RFC too broad to get actionable feedback; architecture gaps not caught early |
| **References**     | [Architecture Vision](../../docs/02-architecture/00-architecture-vision.md), [Architecture Principles](../../docs/02-architecture/00-architecture-principles.md) |
| **Related Documents** | [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md), [ADR-0002](../../adr/strategic/ADR-0002-ddd-and-clean-architecture.md), [ADR-0003](../../adr/strategic/ADR-0003-event-driven-integration.md) |
| **Comment Period** | Opens: 2026-07-08 | Closes: 2026-07-15 |

---

## Summary

This RFC proposes the overall platform architecture for Restaurants OS: Modular Monolith first, DDD with Clean Architecture, event-driven cross-module integration, multi-tenant with row-level isolation, and a plugin-extensible platform layer. It serves as the umbrella framing for ADR-0001 through ADR-0005.

---

## Motivation

Before any module implementation begins (Phase 0 governance gate), the architecture community must reach consensus on the foundational architectural decisions that will shape 10+ years of development. This RFC opens those decisions for comment before they are formalized as ADRs.

---

## Proposal

### Architecture Style
Modular Monolith → Selective Microservices (see ADR-0001, Evolution Roadmap).

### Domain Model
DDD (Bounded Contexts, Aggregates, Domain Events) with Clean Architecture layers (see ADR-0002).

### Integration
Event-driven, domain events only between modules (see ADR-0003). REST for user-initiated actions.

### Multi-Tenancy
Row-level isolation with repository-layer enforcement (see ADR-0004).

### Persistence Pattern
CQRS with event-sourcing readiness (see ADR-0005).

### Platform Services
Identity, Configuration, Plugin, Storage (see docs/04-platform/).

### Observability
OpenTelemetry standard across all modules (see docs/07-devops/).

---

## Alternatives Considered

| Alternative | Reason Not Selected |
|---|---|
| Microservices from Day 1 | Premature; domain boundaries not proven |
| Anemic domain model + rich services | Unmaintainable; business logic scattered |
| Direct cross-module DB access | Prohibited; violates isolation principle |

---

## Open Questions

- [ ] Cloud provider selection (AWS / Azure / GCP) — requires separate ADR
- [ ] Programming language / framework selection — requires separate ADR
- [ ] Event bus technology (Kafka / RabbitMQ / Azure Service Bus) — requires separate ADR for Phase 3
- [ ] Database technology — requires separate ADR

---

## Resolution

> *Populated when RFC is closed*

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial RFC opened |
