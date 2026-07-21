# Context Catalog — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Provide a one-page description for every Bounded Context in Restaurants OS |
| **Scope**          | All current and planned Bounded Contexts |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | New contexts are registered here before implementation begins |
| **Constraints**    | A context may not be implemented until it appears in this catalog with Draft status |
| **Risks**          | New contexts created without registration; catalog becomes stale |
| **References**     | [Domain Ownership](09-domain-ownership.md), [Module Registry](../../specs/MODULE_REGISTRY.md) |
| **Related Documents** | [Context Map](03-context-map.md), [Core Domains](01-core-domains.md) |

---

## CTX-001: Menu Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 1 |
| **Owner** | Menu Domain Lead |
| **Classification** | Core |
| **Summary** | Manages the full lifecycle of menus — creation, versioning, pricing, availability, and publication to branches. The authoritative source of what can be ordered. |
| **Key Aggregates** | Menu, MenuItem, MenuModifierGroup |
| **Key Events Published** | MenuPublished, MenuItemPriceChanged, MenuItemAvailabilityChanged |
| **Key Events Consumed** | — |
| **Integration Pattern** | Published Language (downstream: Order, Kitchen) |
| **Language** | TBD |

---

## CTX-002: Order Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 1 |
| **Owner** | Order Domain Lead |
| **Classification** | Core |
| **Summary** | Manages the complete order lifecycle from placement through payment and completion. The central workflow context. |
| **Key Aggregates** | Order, Payment, Refund |
| **Key Events Published** | OrderPlaced, OrderSentToKitchen, OrderCompleted, OrderCancelled, PaymentProcessed |
| **Key Events Consumed** | MenuPublished, KitchenTicketCompleted |
| **Integration Pattern** | Published Language (upstream: Menu; downstream: Kitchen, Accounting) |
| **Language** | TBD |

---

## CTX-003: Kitchen Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 1 |
| **Owner** | Kitchen Domain Lead |
| **Classification** | Core |
| **Summary** | Manages kitchen production — routing orders to stations, tracking production state, supporting offline-first operation. |
| **Key Aggregates** | KitchenTicket |
| **Key Events Published** | KitchenTicketCompleted, ItemProduced |
| **Key Events Consumed** | OrderSentToKitchen, MenuItemAvailabilityChanged |
| **Integration Pattern** | Published Language (upstream: Order; downstream: Inventory) |
| **Language** | TBD |

---

## CTX-004: Table Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 1 |
| **Owner** | Table Domain Lead |
| **Classification** | Core |
| **Summary** | Manages floor plan, table assignment, turn time tracking, and occupancy. |
| **Key Aggregates** | Table, FloorPlan, TableSession |
| **Key Events Published** | TableOpened, TableClosed, TableAssigned |
| **Key Events Consumed** | OrderPlaced, OrderCompleted |
| **Integration Pattern** | Customer/Supplier (with Reservation) |
| **Language** | TBD |

---

## CTX-005: Accounting Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 4 |
| **Owner** | Finance Domain Lead |
| **Classification** | Core |
| **Summary** | Double-entry ledger, chart of accounts, period management, revenue recognition, and financial reporting. |
| **Key Aggregates** | JournalEntry, AccountingPeriod, LedgerAccount |
| **Key Events Published** | JournalEntryPosted, PeriodClosed, RevenueRecognized |
| **Key Events Consumed** | OrderCompleted, OrderCancelled, PaymentProcessed, InventoryReceived |
| **Integration Pattern** | Conformist (downstream of Order, Inventory) |
| **Language** | TBD |

---

## CTX-006: Inventory Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 3 |
| **Owner** | Supply Domain Lead |
| **Classification** | Supporting |
| **Summary** | Tracks ingredient stock levels, records adjustments and waste, and triggers reorder events. |
| **Key Aggregates** | InventoryItem, InventoryLot, WasteEntry |
| **Key Events Published** | StockLevelLow, InventoryAdjusted, WasteRecorded |
| **Key Events Consumed** | ItemProduced, InventoryReceived |
| **Integration Pattern** | Published Language (downstream: Procurement, Accounting) |
| **Language** | TBD |

---

## CTX-007: Franchise Context

| Field | Value |
|---|---|
| **Status** | Planned |
| **Phase** | 5 |
| **Owner** | Franchise Domain Lead |
| **Classification** | Core |
| **Summary** | Manages franchisee onboarding, brand standard enforcement, territory management, and royalty calculation. |
| **Key Aggregates** | Franchisee, FranchiseAgreement, Territory, BrandAudit |
| **Key Events Published** | FranchiseeOnboarded, RoyaltyCalculated, BrandStandardViolationDetected |
| **Key Events Consumed** | PeriodClosed, OrderCompleted |
| **Integration Pattern** | Open Host Service (provides franchise APIs) |
| **Language** | TBD |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial context catalog with 7 contexts |
