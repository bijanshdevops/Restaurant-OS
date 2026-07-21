# Architecture Decision Records — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Index of all Architecture Decision Records |
| **Scope**          | All ADRs across strategic, tactical, and operational categories |
| **Status**         | Living Document |
| **Owner**          | Architecture Board |
| **References**     | [DECISION_PROCESS](../governance/DECISION_PROCESS.md), [ADR_TEMPLATE](../templates/ADR_TEMPLATE.md) |
| **Related Documents** | [RFC Index](../rfc/README.md), [Decision Log](../decision-log/README.md) |

---

## How to Use ADRs

1. Use [`templates/ADR_TEMPLATE.md`](../templates/ADR_TEMPLATE.md) to create a new ADR
2. Place in the appropriate category directory
3. Submit a PR — Architecture Board will review
4. No implementation may begin until the ADR is Approved

---

## Strategic ADRs

High-level, long-lived decisions that affect the entire system.

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-0001](strategic/ADR-0001-modular-monolith-first.md) | Modular Monolith First | Draft | 2026-07-08 |
| [ADR-0002](strategic/ADR-0002-ddd-and-clean-architecture.md) | DDD and Clean Architecture | Draft | 2026-07-08 |
| [ADR-0003](strategic/ADR-0003-event-driven-integration.md) | Event-Driven Integration | Draft | 2026-07-08 |
| [ADR-0006](strategic/ADR-0006-cloud-agnostic-deployment-strategy.md) | Cloud Agnostic Deployment Strategy | **Approved** | 2026-07-09 |
| [ADR-0007](strategic/ADR-0007-technology-stack.md) | Technology Stack (.NET 9 / React) | Draft | 2026-07-08 |
| [ADR-0008](strategic/ADR-0008-data-platform-strategy.md) | Data Platform Strategy | Draft | 2026-07-08 |
| [ADR-0009](strategic/ADR-0009-identity-and-access-management.md) | Identity and Access Management | Draft | 2026-07-08 |
| [ADR-0010](strategic/ADR-0010-plugin-architecture.md) | Plugin Architecture | Draft | 2026-07-08 |
| [ADR-0011](strategic/ADR-0011-observability-strategy.md) | Observability Strategy | Draft | 2026-07-08 |
| [ADR-0012](strategic/ADR-0012-failure-recovery-model.md) | Failure Recovery Model | Draft | 2026-07-08 |
| [ADR-0013](strategic/ADR-0013-production-operability-model.md) | Production Operability Model | Draft | 2026-07-08 |

## Tactical ADRs

Module-level or pattern-level decisions that affect implementation.

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-0004](tactical/ADR-0004-multi-tenant-data-isolation.md) | Multi-Tenant Data Isolation | Draft | 2026-07-08 |
| [ADR-0005](tactical/ADR-0005-cqrs-and-event-sourcing-readiness.md) | CQRS and Event Sourcing Readiness | Draft | 2026-07-08 |

## Operational ADRs

Tooling, infrastructure, and environment decisions.

*None yet — add as needed*

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial ADR index |
