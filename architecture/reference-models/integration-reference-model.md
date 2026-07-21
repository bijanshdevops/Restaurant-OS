# Integration Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for all cross-module and external integration |
| **Scope**          | All integrations |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Event-driven is the default; REST for user-initiated flows |
| **Constraints**    | No direct cross-module DB access; no in-process synchronous calls between bounded contexts |
| **Risks**          | Wrong pattern applied; implicit coupling created |
| **References**     | [Integration Patterns](../../docs/05-api/INTEGRATION_PATTERNS.md), [ADR-0003](../../adr/strategic/ADR-0003-event-driven-integration.md) |
| **Related Documents** | [Event Conventions](../../docs/05-api/EVENT_CONVENTIONS.md), [Message Contracts](../../docs/05-api/MESSAGE_CONTRACTS.md) |

---

## Integration Decision Tree

```
Is this a user-initiated request requiring immediate response?
  YES → REST API (synchronous)
  NO  → Domain Event (asynchronous)

Is this within the same Bounded Context?
  YES → Direct call within the module (application or domain layer)
  NO  → Domain Event only

Does the downstream context need to translate the upstream model?
  YES → Anti-Corruption Layer (ACL) in downstream
  NO  → Published Language (consume event directly)
```

---

## Outbox Pattern (Required for Event Publishing)

```
Transaction:
  1. Save domain state change to database
  2. Save domain event to outbox table
  (same transaction — atomic)

Background relay:
  1. Read outbox table
  2. Publish to event bus
  3. Mark as published
```

This guarantees event is published even if event bus is temporarily unavailable.

---

## Idempotency Requirement

All event consumers **must** be idempotent:
- Check if event has already been processed (`event_id`)
- Store processed event IDs with TTL
- Replay the same event N times = same result

---

## External Integration Patterns

| External Type | Pattern | Example |
|---|---|---|
| Payment Gateway | Synchronous REST + webhook | Stripe: charge → webhook confirmation |
| Delivery Platform | Webhook inbound + REST outbound | Uber Eats orders arrive via webhook |
| Identity Provider | OIDC federation | Keycloak OIDC |
| Accounting Export | Batch file / REST push | Periodic export to QuickBooks |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial integration reference model |
