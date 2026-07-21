# Architecture Vision — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the architectural north star — what the system must become and why. This document is the foundation for all RFCs and ADRs. |
| **Scope**          | Entire system architecture across all phases |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Business requirements are stable at the domain level; implementation evolves |
| **Constraints**    | Architecture must support offline-first, multi-tenant, multi-country from day one |
| **Risks**          | Vision too abstract to guide decisions; vision too detailed and becomes a constraint |
| **References**     | [Product Vision](../00-product/00-product-vision.md), [Architecture Principles](00-architecture-principles.md) |
| **Related Documents** | [Architecture Goals](00-architecture-goals.md), [Evolution Roadmap](09-evolution-roadmap.md) |

---

## Architectural North Star

> **Restaurants OS must be a platform that is simultaneously simple enough to run a single café and powerful enough to run a global enterprise franchise — without architectural compromise at either end.**

This is not aspirational. It is a hard constraint. Every architecture decision must be evaluated against both ends of this spectrum.

---

## The Five Architectural Bets

### Bet 1: Domain Integrity Over Technical Convenience
The business domain is the primary organizing principle. No technical convenience — not performance, not familiarity, not tooling preference — justifies violating domain integrity. If the domain says "an order belongs to one branch", the architecture enforces it, even if it is technically simpler not to.

### Bet 2: Modular Monolith First, Decompose When Proven
We start with a single deployable unit with strong module boundaries. We decompose into independent services only when:
- A module has demonstrated need for independent scaling
- A module requires independent deployment cadence
- A team boundary has proven to justify separation

We do **not** decompose speculatively.

### Bet 3: Events as the System's Memory
Every significant state change is a domain event. Events are not an integration mechanism bolted on — they are how the system remembers what happened. Audit trails, projections, and integrations are all derived from events.

### Bet 4: Tenant and Brand Isolation is Structural
Multi-tenancy is not a permission check on a shared database. Tenant isolation is implemented at the architecture level — in data partitioning, in event routing, in configuration scoping, and in plugin execution.

### Bet 5: Offline is a Feature, Not a Fallback
The POS layer is designed to operate completely without network connectivity. When connectivity is restored, the system synchronizes deterministically. Connectivity is a convenience, not a requirement.

---

## Target Architecture State (Phase 5)

```
                    ┌──────────────────────────────────┐
                    │         API Gateway               │
                    └──────────┬───────────────────────┘
                               │
          ┌────────────────────┼───────────────────────┐
          │                    │                       │
  ┌───────▼──────┐   ┌────────▼───────┐   ┌───────────▼────┐
  │  Core Modules │   │ Platform Layer │   │ Analytics Layer│
  │  (Modular     │   │ Identity       │   │ Reporting      │
  │   Monolith /  │   │ Plugin         │   │ BI             │
  │   Selective   │   │ Config         │   │ Dashboards     │
  │   µServices)  │   │ Storage        │   └────────────────┘
  └───────────────┘   └────────────────┘
          │                    │
          └────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │    Event Bus        │
        │  (Domain Events)    │
        └─────────────────────┘
```

---

## Architecture Qualities Prioritized

In order of priority:

1. **Correctness** — The system produces correct results per the domain model
2. **Reliability** — The system is available and consistent when needed
3. **Maintainability** — The system is understandable and modifiable for 10+ years
4. **Scalability** — The system grows with the business without architectural rework
5. **Security** — Tenant and data isolation are enforced structurally
6. **Performance** — Sufficient performance for the use case; not premature optimization
7. **Extensibility** — New capabilities can be added without modifying core

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial vision |
