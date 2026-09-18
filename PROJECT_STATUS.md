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
| 2026-09-17 | Engineering | Delivered the product "Phase 10" feature set (refunds & returns): a new ADMIN-only module (`getRefunds`/`findOrderForRefund`/`createRefund`, `/dashboard/refunds`) for partially or fully reversing a `COMPLETED` order, tracked via new `Refund`/`RefundItem` tables and an `OrderItem.refundedQuantity` counter rather than a new `Order` status (`Order.status` stays `COMPLETED` forever). Each refund books an offsetting `EXPENSE` transaction (never touching the original `INCOME` transaction, per the Phase 7 permanence rule), restocks inventory via the item's recipe (always assumed sellable), reverses tax proportionally to the refunded items' subtotal share, refunds packaging cost only on a full refund (at the current settings rate), never refunds delivery fee, and — when the order has a customer — reverses loyalty points/lifetime stats proportionally, decrementing `totalOrders` only on a full refund. Also fixed a pre-existing gap where POS orders never persisted `Order.pointsEarned` (only the online-order flow did), which the new points-clawback logic depends on. Sales analytics (Phase 9) is not updated to reflect refunds in this pass. See [CHANGELOG](CHANGELOG.md) and the "Refunds & Returns" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 11" feature set (audit log): a new ADMIN-only activity log (`getAuditLogs`/`getAuditActionList`, `/dashboard/audit-log`) recording sensitive events only — login success/failure, user create/delete, financial-transaction delete/recategorize, refund creation, restaurant/Modian settings updates, and payroll runs — backed by a new `AuditLog` table and a single non-throwing `logAudit()` helper (`src/lib/auditLog.ts`) that joins the caller's own `prisma.$transaction` where one exists, so a log row for a payroll run or refund commits/rolls back atomically with the operation it describes. Role changes are explicitly not logged because no role-update action exists anywhere in this codebase (roles are only set once, at user creation) — confirmed before finalizing this phase's event list. Every ordinary read and every normal POS/online order remains unlogged by design. See [CHANGELOG](CHANGELOG.md) and the "Audit Log" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 12" feature set (waitlist & reservation deposits): a new `WaitlistEntry` table for walk-in guests (`WAITING`/`SEATED`/`CANCELLED`) with `getWaitlist`/`joinWaitlist`/`seatFromWaitlist`/`cancelWaitlistEntry` (`ADMIN` + `CASHIER`, matching the existing reservation access model, and deliberately a separate model from `Reservation` since a walk-in has neither a future time nor a pre-assigned table); `seatFromWaitlist` mirrors `updateReservationStatus`'s SEATED table-sync logic. Separately, `Reservation` gained an optional staff-collected `depositAmount`/`depositRefundedAt`: a deposit books a real `INCOME` transaction at creation time, and refunding it (`refundReservationDeposit`) is a new, separate, explicit action — never automatic on any status change — that always refunds the full amount at any time (including after cancellation/no-show, per the confirmed policy), booking an offsetting `EXPENSE` transaction while never touching the original `INCOME` transaction (per the Phase 7/10 permanence rule). Deposit/refund events are not added to the Phase 11 audit log (out of that phase's locked-in scope). See [CHANGELOG](CHANGELOG.md) and the "Waitlist & Reservation Deposits" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-17 | Engineering | Delivered the product "Phase 13" feature set (precise recipe/BOM), ADMIN-only (matching the existing recipe/BOM access model): yield %/waste per recipe line (`quantity / (yieldPercent/100)` effective deduction); nested sub-recipes (`SubRecipe`/`SubRecipeItem`) with cycle detection and a depth cap; and menu-item modifiers/add-ons (`ModifierGroup`/`Modifier`) with price deltas, signed (zero-floored) inventory effects, and server-enforced `minSelect`/`maxSelect`. All formula expansion runs through one shared library (`src/lib/recipeExpansion.ts`) used by both order-time stock deduction and cost analysis (which still excludes modifier effects). Fixed a pre-existing latent bug where refund restocking recomputed from the *live* recipe instead of what was actually consumed at order time — fixed by snapshotting per-unit ingredient usage and selected modifiers once, at order creation (`OrderItemIngredientUsage`/`OrderItemModifier`), and having both stock deduction and refund restocking read that snapshot. Also fixed an unplanned reliability bug found during this phase's own test development: `recipeExpansion.ts` calling the shared (non-transactional) database client from inside a `prisma.$transaction` could intermittently starve the connection pool; fixed by threading an explicit client parameter through the library. See [CHANGELOG](CHANGELOG.md) and the "Precise Recipe/BOM (Phase 13)" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-18 | Engineering | Delivered the product "Phase 14" feature set (gift cards & discount coupons), both sub-features shipped together, management ADMIN-only (matching Phase 13's access model): a `GiftCard`/`GiftCardTransaction` ledger (unique code, initial/current balance, optional expiry/note/customer link, full ISSUE/REDEEM history) and a `Coupon` model (PERCENT/FIXED discount, optional minimum order and use-count cap, optional expiry, active toggle). Both POS (`createOrder`) and online (`createOnlineOrder`) checkout accept an optional coupon and/or gift-card code and apply them inside the same order-creation transaction — an invalid/expired/exhausted/deactivated code rolls back the whole order rather than being silently ignored. Calculation order: gross subtotal → tax on the gross subtotal (unchanged) → coupon discount → loyalty-points discount (online only, post-coupon) → gift card applied last, capped at the remaining balance due. The order snapshots exactly what happened at checkout, so later edits to a coupon/gift card never retroactively change a past order, consistent with Phase 13's snapshot pattern. Two new unauthenticated preview actions (`checkGiftCardBalance`/`checkCouponForOrder`) power a live discount/balance preview on the online checkout page. Deliberately out of scope: no accounting transaction on gift-card issuance (only redemption produces income); a refund does not restore gift-card balance or coupon use-count; no customer-picker in the admin issuance UI. See [CHANGELOG](CHANGELOG.md) and the "Gift Cards & Discount Coupons (Phase 14)" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-18 | Engineering | Delivered the product "Phase 15" feature set (combo meals & Happy Hour scheduled pricing), both sub-features shipped together, management ADMIN-only (matching Phases 13/14): a `Combo` (fixed-price bundle) is represented by a dedicated, hidden shadow `MenuItem` (`isCombo: true`) kept in sync by `src/app/actions/combo.ts`, so the cart, POS, online menu, kitchen board, printer/receipts, refund flow, and sales analytics need zero code changes — only `src/lib/recipeExpansion.ts` was extended to expand a combo's ingredient usage from its `ComboItem` components instead of `RecipeItem` rows. A combo cannot contain another combo and does not support modifiers in this phase; a new `OrderItemComboComponent` table snapshots each combo's components at order time; deleting a never-ordered combo removes it outright, deleting one already used deactivates it instead (`deactivatedInstead: true`), mirroring Phase 14's coupon-deletion pattern. Separately, a new `HappyHourRule` (PERCENT/FIXED) targets non-combo menu items on a set of days within a start/end-minute window (with correct midnight-crossing handling), with the pure calculation logic living in a new database-free `src/lib/happyHour.ts`; when multiple active rules match an item, the largest discount wins. `order.ts` computes and snapshots the Happy-Hour-adjusted price per line on `OrderItem` at order-creation time, immune to later rule edits/deletion, consistent with the Phase 13/14 snapshot pattern. Deliberately out of scope: Happy Hour never applies to combos (enforced server-side); no overlap detection between Happy Hour rules in the admin UI; Happy Hour matching uses the server's own clock with no explicit restaurant-timezone concept; the combo-component snapshot is captured but not yet shown on the kitchen ticket or receipt; and the POS/online browsing screens do not show a live Happy-Hour-discounted price (only the real checkout charge is discounted). See [CHANGELOG](CHANGELOG.md) and the "Combo Meals & Happy Hour Pricing (Phase 15)" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-18 | Engineering | Delivered the product "Phase 16" feature set (QR-code table self-ordering): customers scan a QR code at their table and place their own order, with login via OTP required (no guest ordering) and payment online at order-creation time through the same Zarinpal gateway as online delivery — both per the user's confirmed scope. A new `OrderChannel` value, `QR_DINE_IN`, keeps self-ordered QR orders distinguishable from POS-entered dine-in orders; `createDineInQrOrder` is the first real consumer of the pre-existing but previously-unused `Order.tableId`/`Table.orders` relation. The flow reuses existing online-ordering infrastructure unmodified (OTP auth, server-trusted cart pricing, the recipe-usage and coupon/gift-card snapshot patterns from Phases 13/14, and the channel-agnostic Zarinpal payment flow). Unlike an `ONLINE_DELIVERY` order (still branch-less until fulfillment), a QR order carries a real `branchId`/`tableId` from creation; `finalizeOnlineOrderAfterPayment` was made channel-aware so stock deduction and the booked income transaction are attributed to the table's actual branch for `QR_DINE_IN` orders, with the previous default-branch behavior for `ONLINE_DELIVERY` orders completely unchanged, and `deliveryStatus` is only ever set for `ONLINE_DELIVERY`. New customer-facing pages mirror the existing online menu/checkout (minus delivery address and packaging/delivery fees); each table's QR code is generated client-side on the admin Reservations page and simply encodes the table's existing UUID, with no new schema field or server-issued token. Deliberately out of scope: `Table.status` is not auto-managed by QR orders; the cart is shared between the online-delivery and QR dine-in flows; no packaging cost is charged on QR dine-in orders. See [CHANGELOG](CHANGELOG.md) and the "QR-Code Table Self-Ordering (Phase 16)" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
| 2026-09-18 | Engineering | Delivered the product "Phase 17" feature set (third-party delivery/courier integration): `ONLINE_DELIVERY` orders are now dispatched automatically to a third-party courier provider immediately after payment, added alongside the existing manual/internal courier workflow rather than replacing it — per the user's confirmed scope (automatic dispatch, not staff-triggered). Since no real courier-aggregator account or API access exists, a generic `DeliveryProviderAdapter` abstraction (`src/lib/deliveryProviders.ts`) ships with one simulated adapter, `MOCK_EXPRESS`, mirroring how `src/lib/zarinpal.ts` defaults to a sandbox that always succeeds. `finalizeOnlineOrderAfterPayment` calls the new `dispatchOrderToThirdPartyProvider` after its transaction commits; on success `Order` gains `deliveryProvider`/`externalDeliveryId`/`externalTrackingUrl` and `deliveryStatus` becomes `ASSIGNED`; on failure the order is left untouched and simply falls back to the pre-existing manual delivery board. Status progression mirrors the ZarinPal payment-callback pattern: `receiveDeliveryProviderStatusUpdate` is the webhook handler (`src/app/api/delivery-provider/webhook/route.ts` is the real HTTP entrypoint, optionally shared-secret-guarded), and two new staff-facing "simulate" actions drive the same handler from the delivery board UI since no real provider exists to send a real webhook. The admin delivery board now shows tracking info and simulate-status controls for dispatched orders while leaving the original manual courier-assignment controls untouched for orders still on the internal workflow. Deliberately out of scope: no per-restaurant/per-order toggle to disable automatic dispatch; no real provider integration beyond the one simulated adapter; no manual "retry dispatch" action. See [CHANGELOG](CHANGELOG.md) and the "Third-Party Delivery/Courier Integration (Phase 17)" section in [README.md](README.md). This is a feature-delivery milestone tracked separately from the architecture-governance phases above. |
