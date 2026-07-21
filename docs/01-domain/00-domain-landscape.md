# Domain Landscape — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Provide a high-level overview of the Restaurants OS problem domain and strategic domain decomposition |
| **Scope**          | All domain areas from menu to franchise management |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Domain boundaries will be refined through event storming sessions |
| **Constraints**    | Must map to real business operations; no technology-driven boundaries |
| **Risks**          | Incorrect domain boundaries create coupling that is expensive to fix |
| **References**     | Domain-Driven Design (Evans), [Business Capability Map](../00-product/06-business-capability-map.md) |
| **Related Documents** | [Core Domains](01-core-domains.md), [Context Map](03-context-map.md), [GLOSSARY](../GLOSSARY.md) |

---

## The Food-Service Domain

The food-service industry operates across several interrelated domains:

```
┌─────────────────────────────────────────────────────┐
│                 RESTAURANTS OS DOMAIN               │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Menu   │  │  Order   │  │     Kitchen      │  │
│  │ Context  │  │ Context  │  │     Context      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Table   │  │ Inventory│  │    Accounting    │  │
│  │ Context  │  │ Context  │  │     Context      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Guest   │  │  Staff   │  │    Franchise     │  │
│  │ Context  │  │ Context  │  │     Context      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         PLATFORM (Cross-Cutting)            │   │
│  │  Identity │ Plugin │ Config │ Storage       │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Domain Classification

| Domain Area | Classification | Strategic Value |
|---|---|---|
| Menu Management | **Core** | Differentiator — multi-brand, versioning, pricing engine |
| Order Management | **Core** | Central workflow — everything flows from an order |
| Kitchen Operations | **Core** | Differentiator — offline-first, routing intelligence |
| Table Management | **Core** | Differentiator — turn optimization, floor planning |
| Accounting / Finance | **Core** | Differentiator — double-entry, multi-currency, royalties |
| Inventory | **Supporting** | Necessary; commodity-adjacent but needs deep integration |
| Staff Management | **Supporting** | Necessary; payroll integrates with 3rd parties |
| Guest Experience | **Supporting** | Loyalty and reservations support core |
| Franchise Management | **Core** | Differentiator — brand compliance, royalty engine |
| Analytics | **Supporting** | Cross-cutting; built on top of domain data |
| Platform Services | **Generic** | Infrastructure; use proven patterns |

---

## Key Domain Relationships

- **Menu → Order**: Orders are placed against a published Menu version
- **Order → Kitchen**: Orders produce Kitchen Tickets
- **Order → Accounting**: Orders produce Financial Transactions
- **Inventory → Kitchen**: Kitchen consumption drives Inventory deductions
- **Inventory → Procurement**: Low stock triggers Purchase Orders
- **Guest → Loyalty**: Guest purchases earn and redeem Loyalty points
- **Franchise → Menu**: Franchise enforces brand menu standards across Branches

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial domain landscape |
