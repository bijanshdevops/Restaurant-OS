# Context Map — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document the relationships and integration patterns between all Bounded Contexts in Restaurants OS |
| **Scope**          | All Bounded Contexts and their integration contracts |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Context boundaries are established; integration patterns are chosen based on coupling requirements |
| **Constraints**    | All cross-context integration must be documented here before implementation |
| **Risks**          | Undocumented implicit coupling; ACL complexity growing beyond what is manageable |
| **References**     | [Domain Events](05-domain-events.md), [Integration Patterns](../05-api/INTEGRATION_PATTERNS.md) |
| **Related Documents** | [Context Catalog](10-context-catalog.md), [Core Domains](01-core-domains.md) |

---

## Context Map Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RESTAURANTS OS CONTEXT MAP                         │
│                                                                             │
│  ┌───────────┐  Published Events   ┌───────────────┐                       │
│  │   MENU    │──────────────────►  │     ORDER     │                       │
│  │  Context  │◄── ACL ──────────── │    Context    │                       │
│  └───────────┘                     └───────┬───────┘                       │
│                                            │                               │
│                                    Published Events                        │
│                                            │                               │
│                              ┌─────────────▼──────────┐                   │
│                              │       KITCHEN           │                   │
│                              │       Context           │                   │
│                              └─────────────────────────┘                   │
│                                                                             │
│  ┌───────────┐  Events        ┌───────────────┐                            │
│  │   ORDER   │──────────────► │  ACCOUNTING   │                            │
│  │  Context  │                │   Context     │                            │
│  └───────────┘                └───────────────┘                            │
│                                                                             │
│  ┌───────────┐  Published Events   ┌───────────────┐                       │
│  │ INVENTORY │──────────────────►  │  PROCUREMENT  │                       │
│  │  Context  │                     │   Context     │                       │
│  └─────▲─────┘                     └───────────────┘                       │
│        │ Events                                                             │
│  ┌─────┴─────┐                                                             │
│  │  KITCHEN  │                                                             │
│  │  Context  │                                                             │
│  └───────────┘                                                             │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────┐             │
│  │                    PLATFORM (Shared Kernel)               │             │
│  │   Identity Context │ Config Context │ Plugin Context      │             │
│  └──────────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Relationships

| Upstream Context | Downstream Context | Pattern | Notes |
|---|---|---|---|
| Menu | Order | Published Language | Order uses Menu's published API/events |
| Order | Kitchen | Published Language via Events | `OrderPlaced` → `KitchenTicketCreated` |
| Order | Accounting | Published Language via Events | `OrderCompleted` → financial entry |
| Kitchen | Inventory | Published Language via Events | `ItemProduced` → inventory deduction |
| Inventory | Procurement | Published Language via Events | `StockLevelLow` → purchase order suggestion |
| Guest | Loyalty | Customer/Supplier | Guest context owns guest identity |
| Franchise | Menu | Conformist / ACL | Franchise enforces menu standards on branches |
| All Contexts | Identity | Open Host Service | Identity is a platform service |

## Integration Pattern Definitions

| Pattern | Meaning |
|---|---|
| **Published Language** | Well-defined, versioned integration contract published by upstream |
| **Anti-Corruption Layer (ACL)** | Downstream translates upstream model to its own ubiquitous language |
| **Open Host Service** | Upstream provides a standard protocol for all consumers |
| **Customer/Supplier** | Downstream negotiates requirements with upstream (bi-directional influence) |
| **Conformist** | Downstream adopts upstream model without translation |
| **Shared Kernel** | Shared model owned jointly; changes require mutual agreement |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial context map |
