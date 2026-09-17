# Changelog

All notable changes to Restaurants OS documentation and architecture will be recorded here.

This document follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in [VERSION_POLICY.md](governance/VERSION_POLICY.md).

---

## [Unreleased]

### Added
- Kitchen display multi-station routing (Phase 8): a new optional `MenuItem.kitchenStation` free-text tag (set by ADMIN in menu management), and station tabs on the existing kitchen board (`/dashboard/kitchen`) computed live from what's currently active in the queue — selecting a station filters tickets to the ones containing that station's items and shows only those items within each ticket. The pre-existing single-queue PENDING/PREPARING/READY board, its elapsed-time-since-order warning, and its ADMIN+CHEF page access (with `getActiveOrders`/`updateOrderStatus` staying CASHIER-accessible as before) are all unchanged. Order status remains per-order rather than per-item, so a ticket's status buttons still advance the whole order even from a single-station view; there is no configurable prep-time target/SLA, only the existing simple elapsed-time warning.
- `tests/kitchen.test.ts` covering kitchen-station CRUD on menu items (including ADMIN-only enforcement and whitespace-only normalization to none), and multi-station order routing (an order with items across several stations reporting each item's correct station via `getActiveOrders`, plus confirming CHEF's pre-existing access to view/advance active orders is untouched).
- Full accounting & tax (Phase 7): a chart-of-accounts layer (`TransactionCategory`, six protected system categories plus custom ADMIN/ACCOUNTANT-managed ones) on top of the existing `Transaction` log, deliberately kept single-entry rather than full double-entry bookkeeping. Every automatic posting (POS order, online order after payment, purchase-order receipt, payroll run) is now categorized and linked back to its source event via `referenceType`/`referenceId`, and order income transactions carry the exact tax computed at checkout via a new persisted `Order.taxAmount` (never recomputed later). Manual income/expense entries support a tax-inclusive-amount convention (tax is backed out automatically from a category's tax rate unless entered explicitly). Transactions can be recategorized and tax-corrected after the fact, but automatic (system-linked) transactions can never be deleted — only ADMIN can delete purely manual ones. Financial reporting (`getFinancialSummary`, `getProfitAndLossReport`) computes income/expense by category, net profit, and output/input VAT over a branch/date-range filter, with an Excel (.xlsx) export and a browser print view standing in for a server-generated PDF (no PDF library exists in this project). Access stays exactly ADMIN + ACCOUNTANT as before; no true customer accounts-receivable exists, since every order in this system is paid before fulfillment.
- `tests/accounting.test.ts` covering access control, category CRUD and protection of system categories, manual entry tax math (default category fallback, tax auto-extraction, explicit-tax precedence), recategorization/deletion rules, automatic linkage from POS orders/purchase-order receipts/payroll runs, the financial summary/P&L/VAT identities, and Excel export.
- Multi-branch support: a new `Branch` model (with a protected default branch) and `User.branchId` so every staff member belongs to exactly one branch, while ADMIN accounts remain branch-exempt and see/manage every branch. Inventory stock is split into a chain-wide catalog (`InventoryItem`) plus per-branch stock levels (`BranchInventoryStock`), and tables/reservations, suppliers/purchase orders, shifts, and accounting transactions are all branch-scoped end-to-end (filtering on read, targeting on create, and ownership re-checked on every update). Online orders intentionally remain branch-less for now, with ingredient stock deducted from the default branch. A new ADMIN-only Branches page (`/dashboard/branches`) and a branch selector on staff creation round out the UI.
- `tests/branches.test.ts` covering branch CRUD (including the protected-default-branch rule), cross-branch data isolation across inventory/tables/reservations/suppliers/purchase-orders/shifts/accounting, ADMIN's cross-branch visibility, moving a staff member between branches, and the online-order default-branch stock-deduction fallback.
- CRM & marketing (Phase 6): richer customer profiles (email, tags, marketing opt-in, date of birth, and ADMIN notes) alongside the existing loyalty data; ADMIN-only customer segmentation (all customers, by loyalty tier, by tag, inactive, or a computed "upcoming birthday" set) and manual SMS campaigns sent against a segment, always honoring each customer's marketing opt-in; a referral program giving every customer a shareable referral code (from signup and from their profile) with an automatic loyalty-point bonus to the referrer on the referred customer's first completed order (guarded against double payout); and post-delivery order feedback (1-5 star rating plus an optional comment, one per order) with an ADMIN feedback dashboard showing the average rating. `getCustomers`/`createCustomer` deliberately remain open to CASHIER as before (unrelated to this phase — POS checkout depends on attaching a customer to a sale); all new CRM management, segmentation, and campaign-sending surfaces are ADMIN-only. There is no background job scheduler in this deployment, so "win-back" and birthday messages are ADMIN-triggered sends against a system-computed segment rather than true scheduled automation; only the welcome message is sent automatically, synchronously, at customer signup. Customer/CRM data remains global and unscoped by branch, consistent with Phase 5.
- `tests/crm.test.ts` covering CASHIER's continued (POS-only) customer access alongside ADMIN-only CRM management, profile editing and notes, opt-in-aware segment preview, the campaign draft→send→detail lifecycle, order feedback rules (completed-only, owner-only, once-only) with the ADMIN feedback list, the referral signup/first-order-bonus/no-double-bonus flow, and birthday-segment detection.
- Staff & shift management: shift definition and staff assignment, self-service clock-in/clock-out attendance tracking, leave and shift-swap requests with a manager approval workflow (approving a leave request frees any not-yet-worked shift assignments in that date range; approving a shift-swap transfers the assignment to the target colleague), and payroll on a fixed per-user hourly rate — computed from unpaid attendance hours, booked as an accounting EXPENSE transaction at the moment payroll is run (never speculatively), with each attendance record linked to the payment that covered it so it can never be paid twice.
- `tests/staffSchedule.test.ts` covering the shift/attendance/request/payroll flow end-to-end.
- Purchasing & supplier management: full purchase-order cycle (draft → ordered → partially/fully received, plus cancellation), supplier accounts payable with a per-supplier ledger and payment recording, low-stock reorder suggestions, and cross-supplier purchase-price history. Stock, cost, and the accounting/EXPENSE booking only ever move at actual goods receipt, never at order/draft time.
- `tests/procurement.test.ts` covering the purchasing flow end-to-end.
- Online ordering & delivery: customer accounts with SMS OTP login, public menu/cart, checkout with server-verified pricing, ZarinPal payment integration (sandbox by default), order tracking, and a staff delivery dashboard with full courier lifecycle management (assign → picked up → on the way → delivered).
- Customer loyalty club: points earned per purchase and redeemable for a discount, with an automatic lifetime-spend tier (NORMAL/BRONZE/SILVER/GOLD/VIP) shared between the POS and online ordering flows.
- `tests/onlineOrdering.test.ts` and `tests/loyalty.test.ts` covering the new flows end-to-end.
- Production-build dev fallback (`npm run dev:winfix`) documented for the Node 24/Windows `next dev` Tailwind bug.

### Changed
- POS orders (`createOrder`) with a customer attached now also earn loyalty points and can trigger a tier upgrade — previously they only updated `totalOrders`/`totalSpent`.

### Added (Phase 0 foundation)
- Initial Phase 0 repository structure
- Complete documentation governance foundation
- Architecture Decision Records (ADR-0001 through ADR-0005)
- RFC-0001 Platform Architecture Overview
- Enterprise documentation quality gate standard
- Architecture fitness functions
- Reference model library
- Governance board charter and decision process

---

## [0.1.0] — 2026-07-08

### Added
- Repository initialized
- Phase 0 foundation: all directories and governance documents created
- `docs/` narrative documentation structure established
- `architecture/` reusable architecture asset library established
- `standards/` enterprise standards library established
- `governance/` Architecture Board and policies established
- `adr/` with strategic, tactical, and operational categories
- `rfc/` with strategic, tactical, and operational categories
- `templates/` with ADR, RFC, risk, decision matrix, and document templates
- `decision-log/` chronological decision index
- `specs/MODULE_REGISTRY.md` — module registry established
- `REPOSITORY_RULES.md` — repository governance rule established

---

## Version Format

| Segment | Meaning |
|---|---|
| MAJOR | Breaking change to architecture or standards |
| MINOR | New documents, new ADRs or RFCs, new standards |
| PATCH | Corrections, clarifications, editorial changes |

---

*Maintained by the Architecture Board. See [ARCHITECTURE_BOARD.md](governance/ARCHITECTURE_BOARD.md).*
