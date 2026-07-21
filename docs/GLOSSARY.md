# Glossary — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define all canonical terms used across Restaurants OS documentation. Every document must reference terms defined here. |
| **Scope**          | All terminology in product, domain, architecture, platform, and operational documents |
| **Status**         | Draft |
| **Owner**          | Architecture Board + Domain Architects |
| **Assumptions**    | Terms are agreed upon by domain experts and architects |
| **Constraints**    | Terms must be stable; changes require Architecture Board review |
| **Risks**          | Term drift across documents leads to inconsistency and miscommunication |
| **References**     | Domain-Driven Design (Evans, 2003), Implementing DDD (Vernon, 2013) |
| **Related Documents** | [Ubiquitous Language](01-domain/04-ubiquitous-language.md), [Context Catalog](01-domain/10-context-catalog.md) |

---

## How to Use This Glossary

- Link to terms using `[Term](../docs/GLOSSARY.md#term)` syntax
- If a term is bounded-context-specific, it belongs in [04-ubiquitous-language.md](01-domain/04-ubiquitous-language.md)
- If a term is universal across the system, it belongs here
- Propose new terms via Pull Request with Architecture Board review

---

## A

### Aggregate
A cluster of domain objects treated as a single unit for data changes. Has an **Aggregate Root** as the entry point. See [06-aggregates.md](01-domain/06-aggregates.md).

### Aggregate Root
The single entity within an [Aggregate](#aggregate) that external objects may hold a reference to. Enforces invariants for the entire cluster.

### Anti-Corruption Layer (ACL)
A translation layer between two [Bounded Contexts](#bounded-context) that prevents the domain model of one context from being polluted by the model of another.

### API (Application Programming Interface)
A defined contract through which modules or external systems communicate. See [API Guidelines](05-api/API_GUIDELINES.md).

---

## B

### Bounded Context
An explicit boundary within which a domain model is valid and consistent. Each Bounded Context has its own [Ubiquitous Language](#ubiquitous-language). See [Context Catalog](01-domain/10-context-catalog.md).

### Brand
A named food service identity operating under a Tenant. A Tenant may operate multiple Brands (e.g., a franchise group owning multiple restaurant chains).

### Branch
A physical or virtual operational unit within a Brand. A Branch has its own menu configuration, staff, and operating parameters.

---

## C

### Clean Architecture
An architectural style where dependencies point inward: Infrastructure depends on Application, Application depends on Domain. The Domain has no external dependencies.

### Cloud Kitchen
A Tenant operating delivery-only kitchens without a physical dining room.

### Context Map
A diagram showing the relationships and integration patterns between [Bounded Contexts](#bounded-context). See [03-context-map.md](01-domain/03-context-map.md).

### CQRS (Command Query Responsibility Segregation)
An architectural pattern that separates the write model (Commands) from the read model (Queries). See [ADR-0005](../adr/tactical/ADR-0005-cqrs-and-event-sourcing-readiness.md).

---

## D

### Domain
The subject area to which the user applies the software. In Restaurants OS, the domain is food-service operations.

### Domain Event
A record of something that happened in the domain that other parts of the system may need to know about. Domain events are named in the past tense. See [05-domain-events.md](01-domain/05-domain-events.md).

### Domain Service
A stateless operation in the domain layer that does not naturally belong to any single [Entity](#entity) or [Value Object](#value-object). See [07-domain-services.md](01-domain/07-domain-services.md).

### DDD (Domain-Driven Design)
A software development approach that centers design on the business domain. Involves [Bounded Contexts](#bounded-context), [Aggregates](#aggregate), [Domain Events](#domain-event), and [Ubiquitous Language](#ubiquitous-language).

### Double-Entry Accounting
An accounting system where every financial transaction affects at least two accounts — debit and credit — keeping the accounting equation balanced.

---

## E

### Entity
A domain object with a unique identity that persists over time. Entities are distinguished by identity, not by attribute values.

### Event Sourcing
A persistence pattern where state is derived from a sequence of [Domain Events](#domain-event) rather than stored as a current snapshot.

### Event Store
A specialized data store optimized for storing and replaying [Domain Events](#domain-event) in sequence.

---

## F

### Fitness Function
A measurable constraint on the architecture that can be evaluated programmatically. See [ARCHITECTURE_FITNESS_FUNCTIONS.md](08-quality/ARCHITECTURE_FITNESS_FUNCTIONS.md).

### Franchise
A business model where an operator (Franchisee) runs a restaurant under a Brand owned by another party (Franchisor) under a contractual relationship.

---

## I

### Invariant
A business rule that must always be true for an [Aggregate](#aggregate). The Aggregate Root is responsible for enforcing invariants.

---

## M

### Modular Monolith
A single deployable application composed of strongly separated modules with explicit contracts. The first target architecture for Restaurants OS. See [ADR-0001](../adr/strategic/ADR-0001-modular-monolith-first.md).

### Multi-Tenant
An architecture where a single instance of the system serves multiple independent Tenants, each with isolated data and configuration.

---

## O

### Offline-First
An architectural approach where the system is designed to function fully without a network connection. Synchronization occurs when connectivity is restored.

### OpenTelemetry
An open standard for collecting traces, metrics, and logs from distributed systems. The observability standard for Restaurants OS.

---

## P

### Plugin
An extension to the system that adds functionality without modifying core code. See [PLUGIN_PLATFORM.md](04-platform/PLUGIN_PLATFORM.md).

### Policy
A business rule that triggers a [Domain Event](#domain-event) or action in response to another event. Implemented as a Saga or Process Manager. See [08-domain-policies.md](01-domain/08-domain-policies.md).

---

## R

### Repository
A domain pattern that provides collection-like access to [Aggregates](#aggregate), abstracting persistence concerns.

---

## S

### Saga
A sequence of local transactions coordinated through [Domain Events](#domain-event) to achieve a distributed business process.

### SLI (Service Level Indicator)
A quantitative measure of service performance (e.g., request latency p99 < 200ms).

### SLO (Service Level Objective)
A target value for an [SLI](#sli-service-level-indicator) (e.g., 99.9% of requests < 200ms over 30 days).

### Subdomain
A portion of the overall domain. May be Core, Supporting, or Generic.

---

## T

### Tenant
The top-level organizational unit in the multi-tenant model. A Tenant owns one or more Brands, which own one or more Branches.

---

## U

### Ubiquitous Language
A shared vocabulary agreed upon by domain experts and developers within a [Bounded Context](#bounded-context). See [04-ubiquitous-language.md](01-domain/04-ubiquitous-language.md).

---

## V

### Value Object
A domain object with no identity, defined entirely by its attributes. Value objects are immutable.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial glossary created |
