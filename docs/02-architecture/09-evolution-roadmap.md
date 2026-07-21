# Architecture Evolution Roadmap — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define how the architecture evolves from Modular Monolith to Enterprise Platform, with explicit criteria for each transition |
| **Scope**          | All architectural phases from Phase 0 to Phase 5 |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Architecture evolution is driven by proven need, not speculation |
| **Constraints**    | Each transition requires an ADR; no transition without demonstrated justification |
| **Risks**          | Premature decomposition; evolution blocked by undocumented implicit coupling |
| **References**     | [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md), [Architecture Vision](00-architecture-vision.md) |
| **Related Documents** | [Product Roadmap](../00-product/05-roadmap.md), [Architecture Drivers](03-architecture-drivers.md) |

---

## Evolution Path

```
PHASE 0                    PHASE 1-2                    PHASE 3
Enterprise Foundation  →   Modular Monolith         →   Modular Deployment
(Documentation)            (Single deployable,           (Extract high-scale
                           strong boundaries)             modules)
                                │
                                ▼
                           PHASE 4-5
                      Selective Microservices
                      (Where scale demands it)
                                │
                                ▼
                        Enterprise Platform
                      (Full platform model,
                       plugin ecosystem)
```

---

## Stage 1: Modular Monolith (Phase 1–2)

**Target**: Single deployable unit with strongly isolated modules.

**Characteristics**:
- All modules in one deployment unit
- Each module has its own data boundary (schema-per-module or separate tables with strict access control)
- Modules communicate only through published domain events (in-process)
- API layer is a thin shell over application services
- Single CI/CD pipeline for the entire system

**Exit Criteria for Stage 1**:
- At least one module has demonstrated need for independent scaling (sustained load difference > 10x)
- A team boundary has been formally established that justifies independent deployments
- All module interfaces have been formalized as explicit contracts

---

## Stage 2: Modular Deployment (Phase 3)

**Target**: High-scale modules extracted into independently deployable services, while core remains a monolith.

**Characteristics**:
- Kitchen Context extracted first (offline-first requirement; edge deployment)
- Analytics Context extracted (read-heavy, independent scaling)
- Remaining modules still co-deployed
- Event bus becomes a durable, infrastructure-hosted service (not in-process)
- API Gateway introduces routing to extracted services

**Transition Triggers** (require ADR):
- A module requires deployment at the edge (Kitchen/POS)
- A module's team needs independent release cadence
- A module's resource profile differs significantly from the monolith

---

## Stage 3: Selective Microservices (Phase 4)

**Target**: Contexts that require independent scale or deployment are fully extracted.

**Characteristics**:
- Order Context may be extracted if multi-channel volume demands
- Payment integration becomes a fully independent service
- Service mesh for inter-service communication
- Distributed tracing mandatory (OpenTelemetry)
- Each service has its own CI/CD pipeline

**Transition Triggers** (require ADR):
- Demonstrated need for independent scaling not achievable in monolith
- Need for different technology stack per service (e.g., real-time kitchen needs)
- Regulatory isolation requirement (e.g., financial data separation)

---

## Stage 4: Enterprise Platform (Phase 5)

**Target**: Full platform model with a plugin ecosystem, marketplace, and enterprise-grade operational tooling.

**Characteristics**:
- Plugin Platform enables third-party extensions without core modification
- Franchise Engine operates as a platform on top of core services
- API Marketplace for certified integration partners
- Multi-region active-active deployment for global enterprise customers
- Full event sourcing for audit-critical modules (Accounting, Franchise)

---

## Architecture Invariants Across All Stages

These never change, regardless of stage:

| Invariant | Description |
|---|---|
| **Domain Integrity** | Domain model invariants are enforced at every stage |
| **Tenant Isolation** | Structural isolation maintained through all transitions |
| **Event-Driven Integration** | Cross-context events are the only integration mechanism |
| **Offline-First POS** | Kitchen/POS always supports network partition |
| **Double-Entry Accounting** | Financial model is never compromised for convenience |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial evolution roadmap |
