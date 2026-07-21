# Event Conventions — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the event naming convention, envelope structure, and schema evolution rules |
| **Scope**          | All domain events published in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | Events are the primary integration mechanism between modules |
| **Constraints**    | Event names must follow PastTense convention (FF-004) |
| **Risks**          | Event schema breaking changes; event name collisions across contexts |
| **References**     | [Domain Events](../01-domain/05-domain-events.md), [MESSAGE_CONTRACTS](MESSAGE_CONTRACTS.md) |
| **Related Documents** | [EVENT_CATALOG](EVENT_CATALOG.md), [INTEGRATION_PATTERNS](INTEGRATION_PATTERNS.md) |

---

## Event Naming Convention

Format: `{Context}.{Aggregate}{PastTenseVerb}`

| ✅ Correct | ❌ Incorrect |
|---|---|
| `order.OrderPlaced` | `order.PlaceOrder` |
| `menu.MenuPublished` | `menu.PublishMenu` |
| `kitchen.KitchenTicketCompleted` | `kitchen.TicketDone` |
| `accounting.JournalEntryPosted` | `accounting.PostEntry` |

---

## Event Envelope

Every domain event must include:

```json
{
  "eventId": "uuid-v4",
  "eventType": "order.OrderPlaced",
  "eventVersion": "1.0",
  "timestamp": "2026-07-08T21:00:00.000Z",
  "tenantId": "acme-group",
  "correlationId": "uuid-v4",
  "causationId": "uuid-v4",
  "source": "order-module",
  "payload": {
    // event-specific data
  }
}
```

| Field | Required | Description |
|---|---|---|
| `eventId` | Yes | Globally unique event identifier |
| `eventType` | Yes | `{context}.{EventName}` |
| `eventVersion` | Yes | Semantic version of the event schema |
| `timestamp` | Yes | UTC ISO-8601 |
| `tenantId` | Yes | Tenant that owns this event |
| `correlationId` | Yes | Trace correlation across services |
| `causationId` | No | ID of event or command that caused this event |
| `source` | Yes | Publishing module identifier |
| `payload` | Yes | Event-specific data |

---

## Schema Evolution Rules

1. Adding optional fields to payload: **backward compatible** — no version bump
2. Making optional fields required: **breaking** — major version bump
3. Renaming fields: **breaking** — major version bump
4. Removing fields: **breaking** — major version bump
5. Consumers **must** ignore unknown fields (Postel's Law)

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial event conventions |
