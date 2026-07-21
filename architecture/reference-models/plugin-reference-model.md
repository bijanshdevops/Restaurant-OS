# Plugin Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for plugin development and extension point design |
| **Scope**          | All plugin extension points across the platform |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Plugin architecture is established before Phase 2 module implementation |
| **Constraints**    | Plugins cannot break core domain invariants; extension points are explicit |
| **Risks**          | Extension points not designed upfront; retroactive plugin support difficult |
| **References**     | [PLUGIN_PLATFORM](../../docs/04-platform/PLUGIN_PLATFORM.md), [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md) |
| **Related Documents** | [Architecture Principles](../../docs/02-architecture/00-architecture-principles.md) |

---

## Extension Point Design Rules

1. Extension points are defined at the **Application Layer** boundary
2. Extension points must not expose domain internals (aggregates, value objects)
3. Extension point contracts are versioned and must not change within a major version
4. Extension points always have a **default implementation** — plugins replace, not patch
5. Plugin execution failures must be isolated — core operation continues even if plugin fails

---

## Extension Point Contract

```typescript
// Example extension point definition
interface IOrderCreatedHook {
  name: string;
  version: string;
  onOrderCreated(context: OrderCreatedContext): Promise<void>;
}

interface OrderCreatedContext {
  orderId: string;        // Public identifiers only
  tenantId: string;
  branchId: string;
  totalAmount: Money;
  channel: OrderChannel;
  lineCount: number;
}
// Note: Domain aggregate is NOT exposed
```

---

## Plugin Isolation Guarantee

```
Plugin execution is:
  1. Wrapped in try/catch
  2. Subject to timeout (configurable per hook, default 500ms)
  3. Logged on failure
  4. Never allowed to roll back core transaction
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial plugin reference model |
