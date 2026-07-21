# Event Catalog — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Master catalog of all domain events published across Restaurants OS — including version, producer, consumers, and payload schema reference |
| **Scope**          | All published domain events |
| **Status**         | Draft |
| **Owner**          | API Guild Lead + Domain Architects |
| **Assumptions**    | Events are the canonical integration mechanism; this catalog is the schema registry reference |
| **Constraints**    | No event may be published in production before it appears in this catalog |
| **Risks**          | Catalog becoming stale; undocumented events bypassing governance |
| **References**     | [Domain Events](../01-domain/05-domain-events.md), [EVENT_CONVENTIONS](EVENT_CONVENTIONS.md) |
| **Related Documents** | [MESSAGE_CONTRACTS](MESSAGE_CONTRACTS.md), [INTEGRATION_PATTERNS](INTEGRATION_PATTERNS.md) |

---

## Catalog Format

| Field | Description |
|---|---|
| Event Type | Fully qualified event type |
| Version | Current schema version |
| Producer | Bounded Context that publishes this event |
| Consumers | Known consuming Bounded Contexts |
| Schema | Reference to JSON Schema file |
| Status | `Draft` / `Stable` / `Deprecated` |

---

## Order Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `order.OrderPlaced` | 1.0 | Order Context | Kitchen, Accounting, Analytics | Draft |
| `order.OrderModified` | 1.0 | Order Context | Kitchen | Draft |
| `order.OrderSentToKitchen` | 1.0 | Order Context | Kitchen | Draft |
| `order.OrderCompleted` | 1.0 | Order Context | Accounting, Loyalty, Analytics | Draft |
| `order.OrderCancelled` | 1.0 | Order Context | Kitchen, Accounting, Inventory | Draft |
| `order.PaymentProcessed` | 1.0 | Order Context | Accounting | Draft |
| `order.RefundIssued` | 1.0 | Order Context | Accounting | Draft |

---

## Menu Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `menu.MenuPublished` | 1.0 | Menu Context | Order, POS Terminals | Draft |
| `menu.MenuArchived` | 1.0 | Menu Context | Order | Draft |
| `menu.MenuItemPriceChanged` | 1.0 | Menu Context | Order | Draft |
| `menu.MenuItemAvailabilityChanged` | 1.0 | Menu Context | Order, Kitchen | Draft |

---

## Kitchen Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `kitchen.KitchenTicketCreated` | 1.0 | Kitchen Context | KDS | Draft |
| `kitchen.KitchenTicketCompleted` | 1.0 | Kitchen Context | Order | Draft |
| `kitchen.ItemProduced` | 1.0 | Kitchen Context | Inventory | Draft |

---

## Accounting Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `accounting.JournalEntryPosted` | 1.0 | Accounting Context | Analytics, Franchise | Draft |
| `accounting.PeriodClosed` | 1.0 | Accounting Context | Franchise, Analytics | Draft |
| `accounting.RevenueRecognized` | 1.0 | Accounting Context | Analytics | Draft |

---

## Inventory Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `inventory.StockLevelLow` | 1.0 | Inventory Context | Procurement | Draft |
| `inventory.InventoryAdjusted` | 1.0 | Inventory Context | Accounting, Analytics | Draft |
| `inventory.WasteRecorded` | 1.0 | Inventory Context | Accounting | Draft |

---

## Franchise Context Events

| Event Type | Version | Producer | Consumers | Status |
|---|---|---|---|---|
| `franchise.FranchiseeOnboarded` | 1.0 | Franchise Context | Identity, Menu | Draft |
| `franchise.RoyaltyCalculated` | 1.0 | Franchise Context | Accounting | Draft |
| `franchise.BrandStandardViolationDetected` | 1.0 | Franchise Context | Notification | Draft |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial event catalog |
