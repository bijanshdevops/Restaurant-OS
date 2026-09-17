# Project Status — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Living project status tracker for Restaurants OS |
| **Scope**          | All phases |
| **Status**         | Living Document |
| **Owner**          | Architecture Board |
| **References**     | [CHANGELOG](CHANGELOG.md), [Module Registry](specs/MODULE_REGISTRY.md) |

---

## Phase 0 — Enterprise Foundation ✅ COMPLETE

**Status**: Complete  
**Date Completed**: 2026-07-08

### Deliverables Completed

| Category | Count | Status |
|---|---|---|
| Root governance files | 8 | ✅ Complete |
| docs/00-product | 7 | ✅ Complete |
| docs/01-domain | 11 | ✅ Complete |
| docs/02-architecture | 10 | ✅ Complete |
| docs/03-security | 5 | ✅ Complete |
| docs/04-platform | 6 | ✅ Complete |
| docs/05-api | 7 | ✅ Complete |
| docs/06-ui | 1 | ✅ Complete |
| docs/07-devops | 9 | ✅ Complete |
| docs/08-quality | 5 | ✅ Complete |
| docs/09-decisions | 1 | ✅ Complete |
| ADRs (strategic) | 3 | ✅ Draft |
| ADRs (tactical) | 2 | ✅ Draft |
| RFCs (strategic) | 1 | ✅ Open for Comment |
| Architecture Reference Models | 6 | ✅ Complete |
| Standards | 7 | ✅ Complete |
| Governance | 4 | ✅ Complete |
| Templates | 8 | ✅ Complete |
| GitHub templates | 4 | ✅ Complete |
| **Total** | **~120 files** | ✅ Complete |

---

## Phase 0 → Phase 1 Gate ✅ APPROVED

Before Phase 1 implementation begins, the following must be Approved:

- [x] ADR-0001 (Modular Monolith First)
- [x] ADR-0002 (DDD and Clean Architecture)
- [x] ADR-0003 (Event-Driven Integration)
- [x] ADR-0004 (Multi-Tenant Data Isolation)
- [x] ADR-0005 (CQRS and Event Sourcing Readiness)
- [x] RFC-0001 (Platform Architecture Overview)
- [x] ADR-0016 (Cloud Provider and Deployment)
- [x] ADR-0014 (Programming Language and Ecosystem)
- [x] ADR-0015 (Database and ORM Strategy)
- [x] Architecture Board formally constituted

---

## Phase 1 — Core Operations ✅ COMPLETED

**Target**: Order, Menu, Kitchen, Table modules (Modular Monolith)  
**Status**: ✅ Complete.
**Details**:
- Full vertical slice (Menu -> Order -> Payment Event -> Kitchen) is implemented and event-driven.
- DDD-based Aggregates, strict repository ports, and clean data mappers deployed.
- Robust Multi-Tenancy isolation enforced across all database queries.

---

## Phase 2 — Platform Services ✅ COMPLETED

**Target**: Identity, Config, Plugin, Storage platform services  
**Status**: ✅ Complete.
**Details**:
- Established a secure, multi-tenant modular monolith.
- Edge-secured identity with cryptographic JWT verification mapped to Next.js middleware.
- Cascading configuration domain with global platform fallbacks and Infrastructure caching.

---

## Phase 3 — Integration & Ecosystem ⏳ IN PROGRESS

**Target**: Plugin integrations, Webhooks, Outbox Pattern
**Status**: ⏳ In Progress.
**Details**:
- Phase 1 & 2 established a secure, multi-tenant modular monolith with an event-driven core, edge-secured identity, and cascading configuration.
- Phase 3 will focus on external connectivity via the Outbox Pattern and Webhooks.

---

## Phase 4 — Finance (Not Started)

**Target**: Accounting, Tax, full financial engine  
**Gate**: Phase 3 complete + financial architecture ADRs Approved

---

## Phase 5 — Franchise (Not Started)

**Target**: Franchise management, royalties, brand compliance  
**Gate**: Phase 4 complete + franchise architecture ADRs Approved

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Phase 0 foundation initiated |
| 2026-07-08 | Architecture Board | Phase 0 complete — ~120 files created |
| 2026-07-20 | Architecture Board | Phase 1 complete — Core Operations slice built |
| 2026-07-20 | Architecture Board | Phase 2 complete — Platform Services built, Phase 3 initiated |
| 2026-09-17 | Engineering | Delivered the product "Phase 2" feature set (online ordering/delivery + real customer loyalty club): customer OTP accounts, public ordering flow, ZarinPal payment integration, courier/delivery management, and a shared points/tier loyalty engine (POS + online). See [CHANGELOG](CHANGELOG.md) and the "Online Ordering, Delivery & Loyalty Club" section in [README.md](README.md). Note: this is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 3" feature set (purchasing & supplier management): full purchase-order lifecycle, supplier accounts-payable ledger and payments, low-stock reorder suggestions, and cross-supplier purchase-price history. See [CHANGELOG](CHANGELOG.md) and the "Purchasing & Supplier Management" section in [README.md](README.md). |
| 2026-09-17 | Engineering | Delivered the product "Phase 4" feature set (staff & shift management): shift definition and assignment, self-service clock-in/clock-out attendance, leave and shift-swap requests with manager approval, and fixed-hourly-rate payroll booked as an accounting expense. See [CHANGELOG](CHANGELOG.md) and the "Staff & Shift Management" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 5" feature set (multi-branch support): a `Branch` model with a protected default branch, per-branch staff assignment (ADMIN exempt), a chain-wide inventory catalog split from per-branch stock levels, and branch scoping enforced end-to-end across tables/reservations, suppliers/purchase orders, shifts, and accounting — with online ordering intentionally kept branch-less for now. See [CHANGELOG](CHANGELOG.md) and the "Multi-Branch Support" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above (unrelated to the governance "Phase 5 — Franchise" entry below). |
| 2026-09-17 | Engineering | Delivered the product "Phase 6" feature set (CRM & marketing): richer customer profiles (email, tags, marketing opt-in, birthday, ADMIN notes), ADMIN-only segmentation (tier/tag/inactive/upcoming-birthday) and manual SMS campaigns, a referral program with an automatic first-order loyalty bonus, and post-delivery order feedback with an ADMIN ratings dashboard. `getCustomers`/`createCustomer` remain CASHIER-accessible for POS as before; all new CRM/campaign surfaces are ADMIN-only; win-back and birthday messages are ADMIN-triggered (no job scheduler exists in this deployment); customers stay global/unscoped by branch. See [CHANGELOG](CHANGELOG.md) and the "CRM & Marketing" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 7" feature set (full accounting & tax): a chart-of-accounts layer (`TransactionCategory`, six protected system categories plus custom ones) on the existing `Transaction` log, kept single-entry rather than full double-entry bookkeeping; automatic categorized postings for POS orders, online orders, purchase-order receipts, and payroll, each linked back to its source event; exact checkout tax carried via a new `Order.taxAmount`; manual entries with a tax-inclusive-amount convention; recategorization allowed but automatic transactions can never be deleted (manual deletion is ADMIN-only); financial/P&L/VAT reporting with Excel export and a browser print view (no PDF library exists in this project). Access stays ADMIN + ACCOUNTANT as before; no true customer accounts-receivable exists since every order is paid before fulfillment. See [CHANGELOG](CHANGELOG.md) and the "Full Accounting & Tax" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 8" feature set (kitchen display multi-station routing): a new optional `MenuItem.kitchenStation` free-text tag (ADMIN-set in menu management) and live-computed station tabs on the pre-existing single-queue kitchen board (`/dashboard/kitchen`), filtering tickets and their items to the selected station. The underlying PENDING/PREPARING/READY board, its elapsed-time warning, and its ADMIN+CHEF page access (with `getActiveOrders`/`updateOrderStatus` staying CASHIER-accessible as before) are unchanged; order status remains per-order (not per-item), so status actions still advance the whole ticket even in a single-station view, and there is no configurable prep-time target/SLA. See [CHANGELOG](CHANGELOG.md) and the "Kitchen Display System — Multi-Station Routing" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 9" feature set (sales analytics / BI dashboard): a new read-only reporting module (`getSalesAnalytics`, `/dashboard/analytics`) computed purely from existing order data — KPI cards, a daily revenue trend, top/bottom-10 menu items, a per-branch comparison, a 24-hour peak-hours breakdown, and a sales-channel mix, all over a date-range/branch filter. "Real sales" are fixed as any order not `CANCELLED`/`AWAITING_PAYMENT` (matching exactly when Phase 7's accounting module books income) and default to the last 30 days when no range is chosen. Access is ADMIN + ACCOUNTANT, reusing the Phase 5/7 branch-scoping pattern (ACCOUNTANT locked to their own branch; branch-less online orders stay visible under any branch filter). No export and no forecasting/cohort analytics in this pass. See [CHANGELOG](CHANGELOG.md) and the "Sales Analytics / BI Dashboard" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
