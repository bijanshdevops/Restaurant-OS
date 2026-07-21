# ADR-0005: CQRS and Event Sourcing Readiness

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish the CQRS pattern adoption and event sourcing readiness strategy |
| **Scope**          | All modules — write and read model separation |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Full event sourcing is NOT adopted initially; CQRS write/read separation is adopted |
| **Constraints**    | Read models must be projections; no direct query of write model from read paths |
| **Risks**          | Read model staleness; projection rebuild complexity |
| **References**     | CQRS (Fowler), Event Sourcing (Young), [Architecture Principles](../../docs/02-architecture/00-architecture-principles.md) |
| **Related Documents** | [ADR-0003](ADR-0002-ddd-and-clean-architecture.md), [Component View](../../docs/02-architecture/06-component-view.md) |

---

## Context

High-read operations (dashboards, reports, menu display) will dominate read traffic versus write traffic (order placement). Query-optimized read models improve performance significantly. Event sourcing for the Accounting Context provides the immutable audit trail required for financial integrity.

---

## Decision

> **We adopt CQRS (Command Query Responsibility Segregation) across all modules. Event sourcing is adopted only for the Accounting Context in Phase 4+; all other modules are event-sourcing-ready (domain events raised on every state change) but use traditional persistence.**

**CQRS rules**:
1. Commands are handled by command handlers; they operate on aggregates
2. Queries are handled by query handlers; they read from optimized read models (projections)
3. Read models are updated by projecting domain events
4. Read models may be denormalized; they are not the source of truth

**Event Sourcing Readiness**:
- All aggregates raise domain events on every state change
- Domain events contain sufficient information to reconstruct state
- This allows Accounting Context to adopt event sourcing in Phase 4 without changing domain models

---

## Consequences

### Positive
- Query performance improved via optimized read models
- Path to event sourcing for Accounting is clear
- Domain events serve dual purpose: integration + state reconstruction

### Negative
- Additional read model infrastructure
- Eventual consistency between write and read model

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 9: CQRS and Event Sourcing Ready |
| **Quality Attribute** | QAS-PERF-001: Performance, QAS-REL-001: Reliability |
| **Related ADRs** | ADR-0002, ADR-0003 |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
