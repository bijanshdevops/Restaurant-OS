# Product Roadmap — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the phase-by-phase delivery roadmap for Restaurants OS |
| **Scope**          | All delivery phases from Foundation through Enterprise Platform |
| **Status**         | Draft |
| **Owner**          | Product Owner |
| **Assumptions**    | Phases are sequential; no phase begins before the prior phase gate is passed |
| **Constraints**    | Governance rule: no code before documentation is Approved |
| **Risks**          | Phase scope underestimated; domain discovery reveals unexpected complexity |
| **References**     | [Product Charter](01-product-charter.md), [PROJECT_STATUS.md](../../PROJECT_STATUS.md) |
| **Related Documents** | [Architecture Evolution Roadmap](../02-architecture/09-evolution-roadmap.md) |

---

## Phase Overview

```
Phase 0: Enterprise Foundation        ← CURRENT
Phase 1: Core Domain Kernel
Phase 2: Platform Foundation
Phase 3: Operations
Phase 4: Financial Engine
Phase 5: Enterprise Platform
```

---

## Phase 0 — Enterprise Foundation

**Objective**: Complete documentation, governance, and architecture foundation.

**Exit Criteria**:
- All product, domain, and architecture documents Approved
- Architecture Board constituted
- ADR-0001 through ADR-0005 Approved
- RFC-0001 Approved

**Deliverables**: This repository.

---

## Phase 1 — Core Domain Kernel

**Objective**: Implement the core ordering, kitchen, and menu modules as a Modular Monolith.

**Key Capabilities**: Menu Management, Order Management, Kitchen Operations, Basic Table Management

**Architecture Target**: Modular Monolith with Clean Architecture + DDD

---

## Phase 2 — Platform Foundation

**Objective**: Build the platform services that all modules depend on.

**Key Capabilities**: Identity Platform, Plugin Platform, Configuration Platform, Storage Platform

---

## Phase 3 — Operations

**Objective**: Add inventory, staff, and operational reporting.

**Key Capabilities**: Inventory Management, Staff Scheduling, Supply Chain, Operational Reporting

---

## Phase 4 — Financial Engine

**Objective**: Add complete financial management with double-entry accounting.

**Key Capabilities**: Double-Entry Ledger, Multi-Currency, Tax, Invoicing, Cash Management

---

## Phase 5 — Enterprise Platform

**Objective**: Add franchise management and enterprise-scale capabilities.

**Key Capabilities**: Franchise Management, Multi-Country, Multi-Brand, Enterprise BI, Royalty Engine

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Product Owner | Initial roadmap |
