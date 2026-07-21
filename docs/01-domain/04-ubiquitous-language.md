# Ubiquitous Language — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the ubiquitous language per Bounded Context — the shared vocabulary used by domain experts and developers within each context |
| **Scope**          | All Bounded Contexts |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Language is agreed upon with domain experts; code reflects these exact terms |
| **Constraints**    | Terms are context-specific; the same word may mean different things in different contexts |
| **Risks**          | Language drift between contexts; code using different names than domain experts |
| **References**     | [GLOSSARY](../GLOSSARY.md), Domain-Driven Design (Evans) |
| **Related Documents** | [Context Map](03-context-map.md), [Context Catalog](10-context-catalog.md) |

---

## Menu Context

| Term | Definition within this context |
|---|---|
| **Menu** | A versioned collection of categories and items available at one or more branches |
| **Category** | A named group of items within a menu (e.g., "Starters", "Mains") |
| **Item** | A sellable product with a name, description, and price |
| **Modifier Group** | A set of options that can be applied to an item (e.g., "Choose sauce") |
| **Modifier** | A single option within a modifier group |
| **Publication** | The act of making a menu version live for a set of branches |
| **Price Rule** | A conditional pricing override (time-based, channel-based) |

---

## Order Context

| Term | Definition within this context |
|---|---|
| **Order** | The central transaction — a collection of lines placed by a guest at a branch |
| **Line** | A single item in an order with its quantity and applied modifiers |
| **Cover** | A guest at a table (used for per-cover reporting) |
| **Tender** | A payment method applied to an order |
| **Void** | Cancellation of an order after payment with a full reversal |
| **Refund** | Return of payment for a completed order, partial or full |
| **Split** | Division of an order's total across multiple payers |
| **Channel** | The source of an order (Dine-In, Takeaway, Delivery) |

---

## Kitchen Context

| Term | Definition within this context |
|---|---|
| **Ticket** | The kitchen's view of an order — items to produce, not financial details |
| **Station** | A preparation area (e.g., Grill, Fryer, Cold Prep) |
| **Course** | A sequence grouping of items for production timing |
| **Bump** | The act of marking an item or ticket as completed on the KDS |
| **Recall** | Retrieving a previously bumped ticket for correction |
| **Fire** | Command to begin immediate production of a course |

---

## Accounting Context

| Term | Definition within this context |
|---|---|
| **Journal Entry** | A balanced record of a financial event — debits equal credits |
| **Ledger Account** | A categorized account in the chart of accounts |
| **Period** | A defined accounting period (daily, weekly, monthly) |
| **Close** | Finalizing a period so no further entries can be posted |
| **Revenue** | Income from sales operations |
| **COGS** | Cost of Goods Sold — the direct cost of producing sold items |
| **Royalty** | A fee paid by a franchisee to the franchisor as a percentage of revenue |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial ubiquitous language per context |
