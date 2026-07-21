# Aggregates — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document all aggregate roots, their invariants, identity strategy, and lifecycle |
| **Scope**          | All Bounded Contexts in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Aggregates are the unit of consistency; their boundaries are drawn around business invariants |
| **Constraints**    | Aggregates must be small; FF-006 enforces max 10 child entities |
| **Risks**          | Overly large aggregates cause contention; too-small aggregates cause distributed transaction complexity |
| **References**     | Implementing Domain-Driven Design (Vernon), [Domain Events](05-domain-events.md) |
| **Related Documents** | [Domain Services](07-domain-services.md), [Context Map](03-context-map.md) |

---

## Aggregate Template

Each aggregate is documented with:
- **Identity**: How the aggregate is identified
- **Invariants**: Business rules enforced by the aggregate root
- **Children**: Child entities contained within the boundary
- **Events Raised**: Domain events the aggregate can raise
- **Lifecycle**: States the aggregate can be in

---

## Menu Context

### Menu

| Field | Value |
|---|---|
| **Identity** | `MenuId` (globally unique, per-tenant, per-brand) |
| **Invariants** | Must have at least one active category; cannot publish without items; price must be positive |
| **Children** | `MenuCategory`, `MenuItem`, `MenuModifierGroup` |
| **Events Raised** | `MenuDrafted`, `MenuPublished`, `MenuArchived` |
| **Lifecycle** | Draft → Published → Archived |

---

## Order Context

### Order

| Field | Value |
|---|---|
| **Identity** | `OrderId` (globally unique, per-tenant, per-branch) |
| **Invariants** | Cannot add lines to a submitted order; cannot complete without payment; total must equal sum of lines; cannot be voided without a reason |
| **Children** | `OrderLine`, `OrderModifier`, `Payment`, `Discount` |
| **Events Raised** | `OrderPlaced`, `OrderModified`, `OrderSentToKitchen`, `OrderCompleted`, `OrderCancelled` |
| **Lifecycle** | Open → SentToKitchen → Completed / Cancelled |

---

## Kitchen Context

### KitchenTicket

| Field | Value |
|---|---|
| **Identity** | `KitchenTicketId` linked to `OrderId` |
| **Invariants** | Cannot complete until all items are produced; items cannot be removed after started |
| **Children** | `KitchenTicketItem` |
| **Events Raised** | `KitchenTicketCreated`, `KitchenTicketItemStarted`, `KitchenTicketItemCompleted`, `KitchenTicketCompleted` |
| **Lifecycle** | Created → InProgress → Completed |

---

## Accounting Context

### JournalEntry

| Field | Value |
|---|---|
| **Identity** | `JournalEntryId` (sequential per accounting period) |
| **Invariants** | Debit sum must equal credit sum (double-entry invariant); cannot be modified after posting; must have at least two lines |
| **Children** | `JournalLine` |
| **Events Raised** | `JournalEntryPosted` |
| **Lifecycle** | Draft → Posted (immutable) |

---

## Inventory Context

### InventoryItem

| Field | Value |
|---|---|
| **Identity** | `InventoryItemId` per tenant per branch |
| **Invariants** | Quantity cannot go below zero without explicit waste recording; reorder level must be positive |
| **Children** | `InventoryTransaction` |
| **Events Raised** | `InventoryAdjusted`, `StockLevelLow`, `WasteRecorded` |
| **Lifecycle** | Active → Discontinued |

---

## Franchise Context

### Franchisee

| Field | Value |
|---|---|
| **Identity** | `FranchiseeId` per franchisor tenant |
| **Invariants** | Must have an active agreement; territory must not overlap with another franchisee |
| **Children** | `FranchiseAgreement`, `Territory`, `FranchisedBranch` |
| **Events Raised** | `FranchiseeOnboarded`, `TerritoryAssigned` |
| **Lifecycle** | Applicant → Active → Suspended → Terminated |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial aggregate catalog |
