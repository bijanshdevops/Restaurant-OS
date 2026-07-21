# Core Domains — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Identify and describe the core (strategic) domains of Restaurants OS |
| **Scope**          | Core domains only — domains that provide competitive advantage |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Core domains must be built, not bought |
| **Constraints**    | Core domain investment must be proportional to strategic value |
| **Risks**          | Misclassifying a generic subdomain as core wastes resources |
| **References**     | [Domain Landscape](00-domain-landscape.md), [Business Capability Map](../00-product/06-business-capability-map.md) |
| **Related Documents** | [Subdomains](02-subdomains.md), [Context Map](03-context-map.md) |

---

## Core Domain 1: Menu Management

**Why Core**: Multi-brand, multi-branch menu management with versioning and a pricing engine is not available in commodity software. It is a direct differentiator.

**Strategic Capabilities**: Menu construction, modifier trees, pricing rules, availability windows, menu versioning and publishing, multi-brand isolation.

**Bounded Context**: Menu Context

---

## Core Domain 2: Order Management

**Why Core**: The order is the central entity around which all operations pivot. Multi-channel, multi-tender, split-pay, void/refund management with a robust state machine is the product's heartbeat.

**Strategic Capabilities**: Order lifecycle, order routing, split orders, refunds, order history.

**Bounded Context**: Order Context

---

## Core Domain 3: Kitchen Operations

**Why Core**: Offline-first kitchen operation with intelligent routing and production tracking is a direct differentiator for reliability-critical restaurant environments.

**Strategic Capabilities**: Kitchen Display System (KDS), station routing, production tracking, prep time management, offline resilience.

**Bounded Context**: Kitchen Context

---

## Core Domain 4: Financial Management

**Why Core**: Double-entry accounting with multi-currency, multi-tax-jurisdiction support, and royalty calculation for franchise models is not found in commodity restaurant software.

**Strategic Capabilities**: Double-entry ledger, revenue recognition, multi-currency, tax, cash management, royalty calculation.

**Bounded Context**: Accounting Context, Tax Context

---

## Core Domain 5: Franchise Management

**Why Core**: Managing brand compliance, territory rights, royalty calculation, and franchisee performance at scale is the top differentiator for the enterprise market segment.

**Strategic Capabilities**: Franchisee onboarding, brand standard enforcement, royalty calculation, agreement management, territory management.

**Bounded Context**: Franchise Context

---

## Core Domain 6: Table Management

**Why Core**: Floor plan management with turn optimization and real-time occupancy intelligence directly impacts revenue per seat.

**Strategic Capabilities**: Floor plan, table assignment, turn time optimization, occupancy reporting.

**Bounded Context**: Table Context

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial core domain identification |
