# ADR-0001: Modular Monolith First

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish the architectural style for the initial system implementation |
| **Scope**          | All source code implementation — Phase 1 and 2 |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Team size is small to medium (< 20 developers); single primary cloud region at launch |
| **Constraints**    | Cloud-native target (Kubernetes); modules must maintain independent deployability readiness |
| **Risks**          | Architecture drift to distributed monolith; premature decomposition |
| **References**     | Building Microservices (Newman), Software Architecture: The Hard Parts (Richards & Ford) |
| **Related Documents** | [Architecture Vision](../../docs/02-architecture/00-architecture-vision.md), [Evolution Roadmap](../../docs/02-architecture/09-evolution-roadmap.md) |

---

## Context

Restaurants OS must eventually support independent scaling of certain modules (e.g., Kitchen runs on edge devices, Analytics requires heavy read scaling). The question is: should we start as a Modular Monolith or directly as Microservices?

**Forces at play**:
- Team is new to this codebase; strong module boundaries are more important than deployment independence initially
- Distributed systems introduce significant operational complexity (distributed tracing, service mesh, network partitions)
- DDD requires well-understood domain boundaries before decomposition
- Premature extraction creates the worst of both worlds: distributed monolith

---

## Decision

> **We will implement Restaurants OS as a Modular Monolith in Phase 1-2.**

Modules share a deployment unit but maintain strict internal boundaries:
- Each module has its own data namespace (schema or table prefix)
- Modules communicate only via published domain events (in-process)
- No direct cross-module method calls
- Module public API is the only entry point

---

## Alternatives Considered

### Option A: Microservices from Day One

**Pros**: Independent scaling; independent deployment  
**Cons**: Premature; distributed tracing complexity; service mesh overhead; domain boundaries not yet proven; team productivity significantly reduced

### Option B: Modular Monolith (Selected)

**Pros**: Domain boundary learning; team productivity; simpler operations; easy path to extraction  
**Cons**: Cannot independently scale initially; single deployment unit

### Option C: Traditional Monolith (No Module Boundaries)

**Pros**: Simplest to start  
**Cons**: Unmaintainable at scale; no path to extraction; Big Ball of Mud

---

## Consequences

### Positive
- Domain boundaries are learned and proven before extraction
- Single CI/CD pipeline for Phase 1-2 (simpler operations)
- Module interfaces are well-defined before deployment splits

### Negative
- Cannot independently scale individual modules in Phase 1-2
- All modules must be deployed together

### Neutral
- Phase 3 extraction requires effort; planned from the beginning

---

## Traceability

| Dimension | Link |
|---|---|
| **Product Vision** | [00-product-vision.md](../../docs/00-product/00-product-vision.md) |
| **Business Capability** | BD-006: 10+ year maintainability |
| **Architecture Principle** | Principle 6: Modular Monolith First |
| **Quality Attribute** | QAS-MAINT-001: Maintainability |
| **Evolution Roadmap** | [09-evolution-roadmap.md](../../docs/02-architecture/09-evolution-roadmap.md) |
| **Related ADRs** | ADR-0002 (DDD and Clean Architecture) |
| **Related RFCs** | RFC-0001 (Platform Architecture) |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
