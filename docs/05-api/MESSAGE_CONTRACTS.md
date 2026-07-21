# Message Contracts — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define message contract versioning, schema registry strategy, and backward compatibility rules |
| **Scope**          | All domain events and command message schemas |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | Consumers must tolerate additive changes; schema registry is used |
| **Constraints**    | Breaking changes require a new event version; consumers on old version must be supported for 6 months |
| **Risks**          | Schema evolution breaking consumers; schema registry not consulted |
| **References**     | [EVENT_CONVENTIONS](EVENT_CONVENTIONS.md), [VERSIONING](VERSIONING.md) |
| **Related Documents** | [EVENT_CATALOG](EVENT_CATALOG.md) |

---

## Schema Registry Strategy

All event schemas are stored in a centralized schema registry:

```
specs/
  events/
    order/
      OrderPlaced.v1.0.json
      OrderPlaced.v1.1.json
    menu/
      MenuPublished.v1.0.json
    kitchen/
      KitchenTicketCompleted.v1.0.json
```

Each schema file is immutable after publication.

---

## Compatibility Rules

| Change Type | Classification | Action Required |
|---|---|---|
| Add optional field | Backward compatible | Increment minor version (1.0 → 1.1) |
| Remove optional field | Breaking | Major version bump; migration plan required |
| Add required field | Breaking | Major version bump |
| Change field type | Breaking | Major version bump |
| Rename field | Breaking | Major version bump |

---

## Consumer Contract

All consumers must:

1. **Tolerate unknown fields** — Ignore fields not in their schema (Postel's Law)
2. **Pin to a version** — Consume events at a declared version
3. **Test with contract tests** — Pact or equivalent consumer-driven contract tests

---

## Producer Obligations

1. Maintain old version support for minimum 6 months
2. Announce deprecation via `Deprecated` header in event metadata
3. Notify all registered consumers of deprecation

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial message contract rules |
