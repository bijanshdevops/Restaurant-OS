# Architecture Principles — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the binding architecture principles that govern every design decision in Restaurants OS |
| **Scope**          | All components, modules, and layers of the system |
| **Status**         | Draft |
| **Owner**          | Principal Architect + Architecture Board |
| **Assumptions**    | Principles are agreed upon before implementation begins |
| **Constraints**    | Principles must be testable via fitness functions where possible |
| **Risks**          | Principles ignored under time pressure; conflicts between principles not resolved |
| **References**     | [Architecture Vision](00-architecture-vision.md), [Architecture Goals](00-architecture-goals.md) |
| **Related Documents** | [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md), [ADR-0002](../../adr/strategic/ADR-0002-ddd-and-clean-architecture.md) |

---

## Principle 1: Domain Integrity Is Inviolable

**Statement**: The domain model is the source of truth. No technical concern may violate a domain invariant.

**Rationale**: The domain model represents decades of accumulated business understanding. Technical shortcuts that bypass invariants create hidden bugs that manifest as incorrect financial reports, data corruption, or audit failures.

**Implication**: All business rules live in the domain layer. Application and infrastructure layers orchestrate; they do not decide.

**Fitness Test**: No business rule exists outside the domain layer. Automated tests enforce invariants at the aggregate boundary.

---

## Principle 2: Dependencies Point Inward

**Statement**: Infrastructure depends on Application. Application depends on Domain. Domain depends on nothing external.

**Rationale**: Clean Architecture. The domain model must be portable, testable, and independent of frameworks, databases, and delivery mechanisms.

**Implication**: All database, messaging, and framework dependencies are in the infrastructure layer behind interfaces defined by the application layer.

**Fitness Test**: No `using` statement (or equivalent import) in the domain layer may reference an infrastructure namespace.

---

## Principle 3: Modular Monolith First, Decompose When Proven

**Statement**: The system starts as a Modular Monolith. Decomposition into microservices requires explicit ADR approval with demonstrated business justification.

**Rationale**: Premature decomposition creates distributed system complexity before the domain is proven. Modular monolith provides team agility without the operational overhead of services.

**Implication**: Each module has explicit contracts (interfaces, events) that make decomposition safe when it is justified.

**Fitness Test**: No cross-module database access. All cross-module communication is through published interfaces or events.

---

## Principle 4: Integration Through Events, Not Direct Calls

**Statement**: Modules communicate through domain events. Direct synchronous calls between modules are prohibited.

**Rationale**: Event-driven integration reduces coupling, enables audit trails, and makes the system resilient to module unavailability.

**Implication**: All cross-module side effects are triggered by published domain events, not by direct method calls.

**Fitness Test**: No direct module-to-module method call across bounded context boundaries in the dependency graph.

---

## Principle 5: API First

**Statement**: Every capability is exposed via a defined API contract before implementation begins. Implementation follows the contract.

**Rationale**: API contracts define the integration surface. Contract-first enables parallel development, prevents breaking changes, and supports test-driven development.

**Implication**: API contracts are reviewed and approved before any implementation starts. Breaking changes require versioning and ADR.

---

## Principle 6: Multi-Tenancy Is Structural, Not a Feature Flag

**Statement**: Tenant isolation is enforced at the architecture level, not through application-level permission checks.

**Rationale**: Application-level tenant filtering is fragile. A missing filter exposes all tenant data. Structural isolation eliminates this class of failure.

**Implication**: Data partitioning, event routing, and configuration scoping all enforce tenant boundaries by default.

---

## Principle 7: Offline First for Operational Contexts

**Statement**: The POS and kitchen modules must function fully without network connectivity.

**Rationale**: Network outages in a restaurant environment cannot stop operations. Revenue and guest experience cannot depend on connectivity.

**Implication**: Core operational data is synchronized locally. Conflicts are resolved deterministically on reconnection.

---

## Principle 8: Observability Is Structural

**Statement**: Every module emits structured logs, metrics, and traces using OpenTelemetry from the first line of code.

**Rationale**: Observability cannot be added after the fact. Instrumentation is a first-class concern.

**Implication**: All modules implement health probes, emit RED metrics, and propagate trace context. No observability gaps are accepted.

---

## Principle 9: Security by Design

**Statement**: Security controls are designed into the architecture, not added as a layer on top.

**Rationale**: Security bolted on is security that can be bypassed. Structural security is verifiable.

**Implication**: Authentication and authorization are enforced at every API boundary. Secrets are never in code. Audit trails are structural.

---

## Principle 10: Evolutionary Architecture

**Statement**: Architecture decisions must be reversible or explicitly acknowledged as irreversible in the ADR.

**Rationale**: Business requirements evolve. Architecture that cannot evolve becomes a liability.

**Implication**: Prefer patterns that allow change (interfaces, events, configuration). Document irreversible decisions with explicit ADRs. Apply fitness functions to detect when architectural assumptions are violated.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial 10 binding principles |
