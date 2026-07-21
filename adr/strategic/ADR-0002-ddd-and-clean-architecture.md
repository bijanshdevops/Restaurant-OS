# ADR-0002: DDD and Clean Architecture

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish the domain modelling approach and internal application architecture pattern |
| **Scope**          | All source code across all modules |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Team has or will be trained in DDD and Clean Architecture |
| **Constraints**    | All modules must follow the same layer structure (enforced by FF-008) |
| **Risks**          | Anaemic domain model; logic leaking to application or infrastructure layers |
| **References**     | Domain-Driven Design (Evans), Implementing DDD (Vernon), Clean Architecture (Martin) |
| **Related Documents** | [Architecture Principles](../../docs/02-architecture/00-architecture-principles.md), [Component View](../../docs/02-architecture/06-component-view.md) |

---

## Context

Restaurants OS is a complex domain with 10+ years target lifespan. The domain model must be rich enough to handle complex invariants (double-entry accounting, franchise royalties, offline-first kitchen operations). Without an explicit architecture pattern, business logic will drift into controllers, services, or infrastructure — making the system unmaintainable over time.

---

## Decision

> **We will use Domain-Driven Design (DDD) for the domain model and Clean Architecture for the module layer structure.**

**Module Layer Structure** (outer to inner):
1. **Infrastructure** → Persistence, messaging, external APIs
2. **Application** → Use cases, command/query handlers, application services
3. **Domain** → Aggregates, domain events, domain services, repository interfaces (pure, no infrastructure)
4. **API** → HTTP controllers, request/response mappers

**Dependency Rule**: Dependencies point inward. Infrastructure depends on Application and Domain. Application depends on Domain. Domain has zero external dependencies.

---

## Consequences

### Positive
- Domain logic is testable without infrastructure
- Clear structure guides all implementation decisions
- Domain model reflects the business, not the database schema

### Negative
- More initial setup code per module (interfaces, mappers)
- Requires training investment

### Neutral
- Fitness functions enforce the architecture continuously (FF-001, FF-002, FF-008)

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 1: Domain First (DDD); Principle 2: Clean Architecture |
| **Quality Attribute** | QAS-MAINT-001: Maintainability |
| **Fitness Functions** | FF-001, FF-002, FF-007, FF-008, FF-009 |
| **Related ADRs** | ADR-0001, ADR-0003 |
| **Related RFCs** | RFC-0001 |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
