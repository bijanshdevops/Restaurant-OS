# ADR-0003: Event-Driven Integration Between Modules

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish the cross-module integration mechanism |
| **Scope**          | All integration between Bounded Contexts |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | In-process event bus in Phase 1; durable event bus from Phase 3 |
| **Constraints**    | No direct cross-module method calls; no shared database tables between modules |
| **Risks**          | Event ordering issues; at-least-once delivery creating duplicate processing |
| **References**     | Enterprise Integration Patterns (Hohpe & Woolf), [Context Map](../../docs/01-domain/03-context-map.md) |
| **Related Documents** | [Integration Patterns](../../docs/05-api/INTEGRATION_PATTERNS.md), [Event Conventions](../../docs/05-api/EVENT_CONVENTIONS.md) |

---

## Context

Restaurants OS modules (Bounded Contexts) must collaborate: an Order triggers Kitchen ticket creation, a Kitchen completion triggers financial posting, a Kitchen production triggers inventory deduction. These collaborations must be decoupled so that modules can evolve independently.

---

## Decision

> **All cross-module integration in Restaurants OS uses domain events. Direct method calls between module application layers are prohibited.**

**Phase 1 (Modular Monolith)**: In-process event bus with transactional outbox pattern for reliability.  
**Phase 3+ (Extracted Modules)**: Durable event bus (e.g., Kafka, RabbitMQ, Azure Service Bus) — specific technology requires a separate ADR.

**Rules**:
1. Events are published only from application layer (after domain events raised)
2. Consumers react to events; they do not query the producer's data store
3. All consumers must be idempotent (safe to replay)
4. Event schema follows [Event Conventions](../../docs/05-api/EVENT_CONVENTIONS.md)

---

## Consequences

### Positive
- Modules are decoupled; can evolve independently
- Events provide a natural audit trail
- Easy path to distributed deployment (just change the bus)

### Negative
- Eventual consistency must be designed for
- Cross-module transactions require Saga pattern
- Debugging requires distributed tracing

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 3: Event-Driven Integration |
| **Quality Attribute** | QAS-REL-001: Reliability |
| **Fitness Functions** | FF-001 (No cross-module DB access) |
| **Related ADRs** | ADR-0001, ADR-0002 |
| **Related RFCs** | RFC-0001 |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
