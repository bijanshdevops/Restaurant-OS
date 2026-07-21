# Domain Ownership — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Register explicit ownership for every Bounded Context. Each context must have an accountable owner. |
| **Scope**          | All Bounded Contexts in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Ownership is assigned at the role level; named individuals are tracked in a separate HR system |
| **Constraints**    | Every context must have exactly one owner; ownership may not be shared |
| **Risks**          | Ownership gaps lead to undocumented contexts; ownership conflicts lead to inconsistent models |
| **References**     | [Context Catalog](10-context-catalog.md), [CODEOWNERS](../../.github/CODEOWNERS) |
| **Related Documents** | [Core Domains](01-core-domains.md), [Stakeholders](../00-product/03-stakeholders.md) |

---

## Ownership Registry

| Bounded Context | Owner Role | Upstream Contexts | Downstream Contexts | Phase |
|---|---|---|---|---|
| Menu Context | Menu Domain Lead | — | Order, Kitchen | Phase 1 |
| Order Context | Order Domain Lead | Menu | Kitchen, Accounting, Loyalty | Phase 1 |
| Kitchen Context | Kitchen Domain Lead | Order | Inventory | Phase 1 |
| Table Context | Table Domain Lead | — | Order, Reservation | Phase 1 |
| Accounting Context | Finance Domain Lead | Order, Franchise | Reporting | Phase 4 |
| Tax Context | Finance Domain Lead | Order | Accounting | Phase 4 |
| Inventory Context | Supply Domain Lead | Kitchen | Procurement | Phase 3 |
| Procurement Context | Supply Domain Lead | Inventory | Accounting | Phase 3 |
| Guest Context | Guest Domain Lead | — | Loyalty, Reservation | Phase 3 |
| Loyalty Context | Guest Domain Lead | Guest, Order | — | Phase 3 |
| Reservation Context | Guest Domain Lead | Table, Guest | Order | Phase 3 |
| Staff Context | Staff Domain Lead | Identity | Accounting | Phase 3 |
| Franchise Context | Franchise Domain Lead | All | Accounting, Menu, Identity | Phase 5 |
| Analytics Context | Analytics Lead | All (read) | — | Phase 3 |
| Identity Platform | Platform Lead | — | All | Phase 2 |
| Plugin Platform | Platform Lead | — | All | Phase 2 |
| Config Platform | Platform Lead | — | All | Phase 2 |
| Storage Platform | Platform Lead | — | All | Phase 2 |

---

## Ownership Responsibilities

The Context Owner is responsible for:

1. **Documentation** — keeping all context documentation current
2. **Model Integrity** — preventing model pollution from other contexts
3. **Event Contracts** — publishing and versioning events from this context
4. **Breaking Change Communication** — notifying downstream consumers of changes
5. **Architecture Review** — participating in Architecture Board reviews affecting this context
6. **Ubiquitous Language** — enforcing correct language within the context

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial ownership registry |
