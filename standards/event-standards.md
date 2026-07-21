# Event Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Prescriptive standards for domain event design, naming, schema, and lifecycle |
| **Scope**          | All domain events across all Bounded Contexts |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Events are the primary cross-module integration mechanism |
| **Constraints**    | All rules enforced by fitness function FF-004 (event naming) and CI schema validation |
| **Risks**          | Event naming inconsistency; schema evolution breaking contracts |
| **References**     | [EVENT_CONVENTIONS](../docs/05-api/EVENT_CONVENTIONS.md), [MESSAGE_CONTRACTS](../docs/05-api/MESSAGE_CONTRACTS.md) |
| **Related Documents** | [EVENT_CATALOG](../docs/05-api/EVENT_CATALOG.md) |

---

## Naming Rules

| Rule | Requirement |
|---|---|
| Event class name | `{Aggregate}{PastTenseVerb}` |
| Event type string | `{context}.{EventName}` |
| Case | PascalCase for class; lowercase.PascalCase for type string |
| Tense | Must be past tense — something that happened, not a command |

**Examples**:
- ✅ `order.OrderPlaced`
- ✅ `menu.MenuPublished`
- ❌ `order.PlaceOrder` (command, not event)
- ❌ `order.order_placed` (wrong case)

---

## Schema Rules

| Rule | Requirement |
|---|---|
| Envelope | All events include standard envelope fields (see EVENT_CONVENTIONS.md) |
| Payload completeness | Payload must contain all data needed by consumers; no ID-only events |
| Immutability | Event payload is immutable once published |
| Versioning | `eventVersion` field required; follow semver |

---

## Lifecycle Rules

| Rule | Requirement |
|---|---|
| Registration | No event published without registration in EVENT_CATALOG.md |
| Schema storage | Schema stored in `specs/events/{context}/{EventName}.vX.Y.json` |
| Consumer registration | All consumers registered in EVENT_CATALOG.md |
| Breaking changes | Major version bump required; old version supported 6 months |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial event standards |
