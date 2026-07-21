# Domain Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for domain modelling across all Bounded Contexts |
| **Scope**          | All modules |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | All domain models conform to this reference model |
| **Constraints**    | Technology-agnostic; implementations in language-specific coding standards |
| **Risks**          | Reference model not consulted; inconsistent domain models |
| **References**     | Domain-Driven Design (Evans), Implementing DDD (Vernon) |
| **Related Documents** | [Aggregates](../../docs/01-domain/06-aggregates.md), [ADR-0002](../../adr/strategic/ADR-0002-ddd-and-clean-architecture.md) |

---

## Building Blocks

### Aggregate Root
- Owns a consistency boundary
- All access to children goes through the root
- Raises domain events on state changes
- Identified by a strongly-typed ID value object

### Entity
- Has identity within the aggregate
- Mutable; mutated only via aggregate root
- No public setters

### Value Object
- Immutable
- Identified by its value, not identity
- Always valid — validated in constructor

### Domain Event
- Immutable record of something that happened
- Named in past tense: `{Aggregate}{PastVerb}`
- Contains full data needed by consumers (no ID-only events)

### Domain Service
- Stateless
- Operates on one or more aggregates or value objects
- Not a CRUD service; performs domain operations with domain meaning

### Repository Interface
- Defined in domain layer
- Implemented in infrastructure layer
- Single responsibility: persist and retrieve aggregates only

---

## Canonical Layer Diagram

```
API Layer
  ↓ commands / queries
Application Layer
  ↓ operates on
Domain Layer (pure)
  ↑ implemented by
Infrastructure Layer
```

---

## Identity Convention

All aggregate IDs must be strongly typed:

```
// ✅ Correct
class OrderId(Guid value)

// ❌ Incorrect  
Guid orderId
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial domain reference model |
