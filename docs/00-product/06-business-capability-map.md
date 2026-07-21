# Business Capability Map — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the complete business capability hierarchy for Restaurants OS. This is the primary reference for Bounded Context discovery and domain decomposition. |
| **Scope**          | All business capabilities of a food-service enterprise from single location to global franchise |
| **Status**         | Draft |
| **Owner**          | Product Owner + Domain Architects |
| **Assumptions**    | Capabilities are stable; processes and technology implementing them will change |
| **Constraints**    | Capabilities must map to real business value; no technology-derived capabilities |
| **Risks**          | Capability gaps discovered during domain discovery; capability ownership conflicts |
| **References**     | Business Capability Mapping (Ulrich & McWhorter), [Domain Landscape](../01-domain/00-domain-landscape.md) |
| **Related Documents** | [Context Catalog](../01-domain/10-context-catalog.md), [Core Domains](../01-domain/01-core-domains.md) |

---

## Capability Classification

| Type | Definition |
|---|---|
| **Core** | Strategic differentiator — builds competitive advantage; must be built, not bought |
| **Supporting** | Necessary but not differentiating; can be built or purchased |
| **Generic** | Commodity; buy or use off-the-shelf |

---

## Capability Hierarchy

### 1. Menu Management *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-01-01 | Menu Construction | Core | Menu Domain Team |
| CAP-01-02 | Item & Modifier Management | Core | Menu Domain Team |
| CAP-01-03 | Pricing Engine | Core | Pricing Domain Team |
| CAP-01-04 | Menu Availability & Scheduling | Core | Menu Domain Team |
| CAP-01-05 | Multi-Brand Menu Isolation | Core | Platform Team |
| CAP-01-06 | Menu Versioning & Publishing | Core | Menu Domain Team |

### 2. Order Management *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-02-01 | Order Creation & Modification | Core | Order Domain Team |
| CAP-02-02 | Order Routing | Core | Order Domain Team |
| CAP-02-03 | Order State Machine | Core | Order Domain Team |
| CAP-02-04 | Split Orders & Multi-Pay | Core | Order Domain Team |
| CAP-02-05 | Void & Refund Processing | Core | Order Domain Team |
| CAP-02-06 | Order History & Search | Supporting | Order Domain Team |

### 3. Kitchen Operations *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-03-01 | Kitchen Display System (KDS) | Core | Kitchen Domain Team |
| CAP-03-02 | Station Routing | Core | Kitchen Domain Team |
| CAP-03-03 | Production Tracking | Core | Kitchen Domain Team |
| CAP-03-04 | Prep Time Management | Core | Kitchen Domain Team |
| CAP-03-05 | Offline Kitchen Operation | Core | Platform Team |

### 4. Table & Reservation Management *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-04-01 | Floor Plan Management | Core | Table Domain Team |
| CAP-04-02 | Table Assignment | Core | Table Domain Team |
| CAP-04-03 | Reservation Booking | Supporting | Guest Domain Team |
| CAP-04-04 | Waitlist Management | Supporting | Guest Domain Team |
| CAP-04-05 | Turn Time Optimization | Core | Table Domain Team |

### 5. Financial Management *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-05-01 | Double-Entry Ledger | Core | Finance Domain Team |
| CAP-05-02 | Revenue Recognition | Core | Finance Domain Team |
| CAP-05-03 | Multi-Currency Support | Core | Finance Domain Team |
| CAP-05-04 | Tax Calculation & Compliance | Core | Finance Domain Team |
| CAP-05-05 | Invoicing | Supporting | Finance Domain Team |
| CAP-05-06 | Cash Management | Core | Finance Domain Team |
| CAP-05-07 | Period Close | Core | Finance Domain Team |
| CAP-05-08 | Royalty Management | Core | Franchise Domain Team |

### 6. Inventory & Supply Chain *(Supporting)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-06-01 | Ingredient Inventory | Supporting | Supply Domain Team |
| CAP-06-02 | Waste Tracking | Supporting | Supply Domain Team |
| CAP-06-03 | Purchase Order Management | Supporting | Supply Domain Team |
| CAP-06-04 | Supplier Management | Supporting | Supply Domain Team |
| CAP-06-05 | Recipe & Yield Management | Core | Menu Domain Team |
| CAP-06-06 | Stock Count & Reconciliation | Supporting | Supply Domain Team |

### 7. Staff Management *(Supporting)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-07-01 | Staff Scheduling | Supporting | Staff Domain Team |
| CAP-07-02 | Role & Permission Management | Supporting | Identity Platform |
| CAP-07-03 | Attendance & Clock-In | Supporting | Staff Domain Team |
| CAP-07-04 | Payroll Integration | Generic | Integration (3rd party) |
| CAP-07-05 | Performance Tracking | Supporting | Staff Domain Team |

### 8. Guest Experience *(Supporting)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-08-01 | Guest Profile Management | Supporting | Guest Domain Team |
| CAP-08-02 | Loyalty & Rewards | Supporting | Guest Domain Team |
| CAP-08-03 | Feedback & Reviews | Supporting | Guest Domain Team |
| CAP-08-04 | Marketing Campaigns | Generic | Integration (3rd party) |

### 9. Reporting & Business Intelligence *(Supporting)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-09-01 | Operational Reporting | Supporting | Analytics Team |
| CAP-09-02 | Financial Reporting | Core | Finance Domain Team |
| CAP-09-03 | Cross-Location Benchmarking | Core | Analytics Team |
| CAP-09-04 | Franchise Performance Reporting | Core | Franchise Domain Team |
| CAP-09-05 | Real-Time Dashboard | Supporting | Analytics Team |

### 10. Platform Services *(Generic)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-10-01 | Identity & Access Management | Generic | Platform Team |
| CAP-10-02 | Plugin Management | Core | Platform Team |
| CAP-10-03 | Configuration Management | Generic | Platform Team |
| CAP-10-04 | Storage Management | Generic | Platform Team |
| CAP-10-05 | Notification & Messaging | Generic | Platform Team |
| CAP-10-06 | Audit & Compliance Logging | Core | Platform Team |

### 11. Franchise Management *(Core)*

| ID | Capability | Type | Owner |
|---|---|---|---|
| CAP-11-01 | Franchisee Onboarding | Core | Franchise Domain Team |
| CAP-11-02 | Brand Standard Enforcement | Core | Franchise Domain Team |
| CAP-11-03 | Royalty Calculation | Core | Franchise Domain Team |
| CAP-11-04 | Franchise Agreement Management | Core | Franchise Domain Team |
| CAP-11-05 | Territory Management | Core | Franchise Domain Team |

---

## Capability to Bounded Context Mapping

> This mapping will be refined during domain discovery. It represents initial alignment only.

| Capability Group | Candidate Bounded Context |
|---|---|
| Menu Management | Menu Context |
| Order Management | Order Context |
| Kitchen Operations | Kitchen Context |
| Table & Reservation | Table Context, Reservation Context |
| Financial Management | Accounting Context, Tax Context |
| Inventory & Supply Chain | Inventory Context, Procurement Context |
| Staff Management | Staff Context |
| Guest Experience | Guest Context, Loyalty Context |
| Reporting & BI | Analytics Context |
| Platform Services | Identity, Plugin, Configuration, Storage (cross-cutting) |
| Franchise Management | Franchise Context |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial capability map |
