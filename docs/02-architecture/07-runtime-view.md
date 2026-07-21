# Runtime View — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Describe key runtime scenarios showing how components collaborate at runtime |
| **Scope**          | Critical runtime flows for Phase 1 |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Sequence descriptions are technology-agnostic; technology choices recorded in ADRs |
| **Constraints**    | All cross-module interaction must go through the event bus |
| **Risks**          | Runtime scenarios drift from implementation without regular review |
| **References**     | [Component View](06-component-view.md), [Domain Events](../01-domain/05-domain-events.md) |
| **Related Documents** | [Domain Policies](../01-domain/08-domain-policies.md), [Integration Patterns](../05-api/INTEGRATION_PATTERNS.md) |

---

## Scenario 1: Place Order

```
Waiter → API Gateway → Order Module (API Layer)
  → PlaceOrderCommandHandler
    → Order Aggregate: Order.Place(lines, branch, channel)
      → Validates: lines not empty, branch active, menu version valid
      → Raises: OrderPlaced domain event
    → OrderRepository.Save(order)
    → EventPublisher.Publish(OrderPlaced)
      → Kitchen Module receives OrderPlaced
        → Creates KitchenTicket, routes to stations
      → Accounting Module receives OrderPlaced
        → Defers: posts entry on completion
  → Returns OrderId to Waiter
```

**Total hops**: 2 (API → Application → Domain)  
**Cross-module communication**: via Event Bus (OrderPlaced)

---

## Scenario 2: Complete Order with Payment

```
Waiter → Order Module: CompleteOrder(orderId, payments)
  → Order Aggregate: Order.Complete(payments)
    → Validates: all lines produced (from KitchenTicketCompleted event)
    → Validates: payments balance to order total
    → Raises: PaymentProcessed, OrderCompleted
  → OrderRepository.Save(order)
  → EventPublisher.Publish(OrderCompleted)
    → Accounting Module:
      → JournalEntryFactory.Create(OrderCompleted)
      → JournalEntry Aggregate: validates debit=credit
      → Posts: JournalEntryPosted
    → Loyalty Module:
      → Awards loyalty points to guest
```

---

## Scenario 3: Offline Order Entry (Network Partition)

```
POS Terminal (offline mode):
  → Local event store: stores OrderPlaced event locally
  → Local KDS: creates KitchenTicket from local event store
  → Operation continues: all order entry functions available
  → Local sync queue: accumulates events during partition

Network restored:
  → Sync service: replays local event queue to central event bus
  → Conflict resolver: applies deterministic conflict resolution
  → Central state: updated; no data loss
```

---

## Scenario 4: Menu Published to Branch

```
Manager → Menu Module: PublishMenu(menuId, branchIds)
  → Menu Aggregate: Menu.Publish(branchIds)
    → Validates: menu has items, prices set, no draft items
    → Raises: MenuPublished(menuId, version, branchIds)
  → EventPublisher.Publish(MenuPublished)
    → Order Module: updates cached menu version for branches
    → POS Terminals: receive invalidation signal; reload menu
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial runtime scenarios |
