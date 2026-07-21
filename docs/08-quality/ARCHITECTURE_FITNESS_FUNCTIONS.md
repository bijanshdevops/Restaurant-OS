# Architecture Fitness Functions — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define measurable architectural constraints that can be evaluated programmatically. These will become automated tests in the CI pipeline. |
| **Scope**          | All modules and layers of Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Principal Architect + Architecture Board |
| **Assumptions**    | Fitness functions are enforced in CI from Phase 1 onwards |
| **Constraints**    | Every fitness function must have an automated implementation path |
| **Risks**          | Functions not automated remain aspirational only |
| **References**     | Building Evolutionary Architectures (Ford, Parsons, Kua), [Architecture Principles](00-architecture-principles.md) |
| **Related Documents** | [Architecture Metrics](ARCHITECTURE_METRICS.md), [Quality Gate](QUALITY_GATE.md) |

---

## FF-001: No Cross-Module Direct Database Access

**Principle**: [Principle 3 — Modular Monolith First]

**Rule**: No module may query the data store of another module directly.

**Measurement**: Static analysis of data access patterns. Each module's data store is accessible only to that module's repository implementations.

**Threshold**: Zero violations.

**Implementation**: Dependency analysis in CI pipeline. Namespace/package boundary enforcement.

---

## FF-002: Domain Layer Has No External Dependencies

**Principle**: [Principle 2 — Dependencies Point Inward]

**Rule**: The domain layer may not contain references to infrastructure namespaces (ORM, messaging, HTTP, etc.)

**Measurement**: Static import/dependency analysis of the domain project.

**Threshold**: Zero infrastructure imports in any domain class.

**Implementation**: Automated dependency check — fails build if domain project references infrastructure packages.

---

## FF-003: Maximum Synchronous Call Depth

**Principle**: Performance, Coupling

**Rule**: No synchronous call chain may exceed 5 levels deep within a single request.

**Measurement**: Runtime call stack depth sampling; static call graph analysis.

**Threshold**: Max depth = 5.

**Implementation**: Configurable static analysis rule.

---

## FF-004: Event Naming Convention Compliance

**Principle**: [Principle 4 — Integration Through Events]

**Rule**: All domain events must be named in PastTense (e.g., `OrderPlaced`, `PaymentProcessed`). No present-tense or imperative event names.

**Measurement**: Static analysis of all event class names.

**Threshold**: Zero non-compliant event names.

**Implementation**: Naming convention linting rule in CI.

---

## FF-005: No Business Logic in Infrastructure Layer

**Principle**: [Principle 2 — Dependencies Point Inward]

**Rule**: Infrastructure classes (repositories, message handlers, API controllers) may not contain business rules or domain decisions.

**Measurement**: Code complexity analysis of infrastructure classes; review of any branching logic.

**Threshold**: Infrastructure classes have cyclomatic complexity ≤ 3 (orchestration only, no decisions).

---

## FF-006: Aggregate Size Constraint

**Principle**: DDD Aggregate Design

**Rule**: No aggregate may contain more than 10 child entities. Large aggregates signal incorrect boundary design.

**Measurement**: Static analysis of aggregate root child collections.

**Threshold**: Max 10 child entities per aggregate.

---

## FF-007: Module Dependency Direction

**Principle**: [Principle 3 — Modular Monolith]

**Rule**: Module dependencies must be acyclic. No circular dependencies between modules are permitted.

**Measurement**: Dependency graph cycle detection in CI.

**Threshold**: Zero circular module dependencies.

---

## FF-008: Allowed Reference Architecture

**Principle**: [Principle 2 — Clean Architecture]

**Rule**: Allowed reference directions are:
- `API / Presentation` → `Application`
- `Application` → `Domain`
- `Infrastructure` → `Application` (implementing interfaces)
- `Infrastructure` → `Domain` (implementing interfaces)

Prohibited:
- `Domain` → `Application`
- `Domain` → `Infrastructure`
- `Application` → `Infrastructure`

**Measurement**: Package dependency direction analysis.

**Threshold**: Zero violations.

---

## FF-009: Test Coverage on Domain Layer

**Principle**: Maintainability, Correctness

**Rule**: Domain layer (entities, aggregates, value objects, domain services) must maintain test coverage above threshold.

**Threshold**: ≥ 90% line coverage on domain layer.

**Implementation**: Coverage report gate in CI pipeline.

---

## FF-010: No Hardcoded Tenant Identifiers

**Principle**: [Principle 6 — Multi-Tenancy Structural]

**Rule**: No tenant ID, brand ID, or branch ID may appear as a hardcoded literal in source code.

**Measurement**: Regex scan of source files for known tenant ID patterns.

**Threshold**: Zero occurrences.

---

## FF-011: OpenTelemetry Instrumentation Required

**Principle**: [Principle 8 — Observability Structural]

**Rule**: Every module that handles a request must emit a trace span. Every public API must emit RED metrics (Rate, Errors, Duration).

**Measurement**: Integration test that verifies trace spans are emitted for all endpoints.

**Threshold**: Zero untraced endpoints in any module.

---

## FF-012: Event Fan-Out Limit

**Principle**: Performance, Coupling

**Rule**: A single domain event may not be consumed by more than 8 direct subscribers.

**Rationale**: High fan-out is a coupling smell. If many things respond to one event, that event is likely too coarse.

**Measurement**: Event subscriber count analysis.

**Threshold**: Max 8 subscribers per event type.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial 12 fitness functions defined |
