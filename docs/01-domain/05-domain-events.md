# Domain Events — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Catalog all domain events across Restaurants OS Bounded Contexts |
| **Scope**          | All domain events — past-tense facts that the business cares about |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Event list will grow as domain discovery progresses; this is a seed catalog |
| **Constraints**    | All event names must be in PastTense; enforced by FF-004 |
| **Risks**          | Missing events discovered during implementation; event payload changes causing breaking contracts |
| **References**     | [Event Catalog](../05-api/EVENT_CATALOG.md), [Message Contracts](../05-api/MESSAGE_CONTRACTS.md) |
| **Related Documents** | [Aggregates](06-aggregates.md), [Domain Policies](08-domain-policies.md), [Context Map](03-context-map.md) |

---

## Event Naming Convention

`{Aggregate}{PastTenseVerb}` — e.g., `OrderPlaced`, `MenuPublished`, `InventoryAdjusted`

---

## Menu Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `MenuDrafted` | Menu | A new menu version was created in draft | — |
| `MenuPublished` | Menu | A menu version was published to branches | Order Context |
| `MenuArchived` | Menu | A menu version was archived | — |
| `MenuItemAdded` | Menu | An item was added to a menu | — |
| `MenuItemPriceChanged` | MenuItem | An item's price was changed | Order Context |
| `MenuItemAvailabilityChanged` | MenuItem | An item was made available or unavailable | Order Context, Kitchen Context |

---

## Order Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `OrderPlaced` | Order | A new order was placed | Kitchen, Accounting, Inventory |
| `OrderLineAdded` | Order | A line item was added to an open order | Kitchen |
| `OrderLineRemoved` | Order | A line item was removed | Kitchen |
| `OrderModified` | Order | Order was changed before send to kitchen | Kitchen |
| `OrderSentToKitchen` | Order | Order was submitted for production | Kitchen |
| `OrderCompleted` | Order | Order was fully served and closed | Accounting, Loyalty |
| `OrderCancelled` | Order | Order was cancelled | Accounting, Kitchen, Inventory |
| `OrderVoided` | Order | Order was voided after payment | Accounting |
| `PaymentProcessed` | Payment | Payment was received against an order | Accounting |
| `RefundIssued` | Refund | A refund was issued | Accounting |

---

## Kitchen Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `KitchenTicketCreated` | KitchenTicket | Production ticket created from order | Kitchen Display |
| `KitchenTicketItemStarted` | KitchenTicket | An item started production | — |
| `KitchenTicketItemCompleted` | KitchenTicket | An item completed production | — |
| `KitchenTicketCompleted` | KitchenTicket | All items on a ticket completed | Order Context |
| `ItemProduced` | KitchenTicket | A menu item was produced and consumed ingredients | Inventory |

---

## Accounting Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `JournalEntryPosted` | JournalEntry | A double-entry journal entry was posted | Reporting |
| `PeriodClosed` | AccountingPeriod | An accounting period was closed | Reporting, Franchise |
| `RevenueRecognized` | Revenue | Revenue was recognized for a period | Reporting |
| `TaxFilingGenerated` | TaxFiling | A tax filing was generated | Compliance |

---

## Inventory Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `InventoryReceived` | InventoryLot | Goods received from a supplier | Accounting |
| `InventoryAdjusted` | InventoryItem | Stock level manually adjusted | Reporting |
| `StockLevelLow` | InventoryItem | Stock fell below reorder threshold | Procurement |
| `WasteRecorded` | WasteEntry | Waste was recorded for a period | Accounting, Reporting |

---

## Franchise Context

| Event | Producer Aggregate | Description | Key Consumers |
|---|---|---|---|
| `FranchiseeOnboarded` | Franchisee | New franchisee completed onboarding | Identity, Menu |
| `RoyaltyCalculated` | RoyaltyStatement | Monthly royalty calculated for franchisee | Accounting |
| `BrandStandardViolationDetected` | BrandAudit | A branch violated a brand standard | Notification |
| `TerritoryAssigned` | Territory | Territory rights assigned to franchisee | — |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial domain event catalog |
