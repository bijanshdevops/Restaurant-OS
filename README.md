# Restaurants OS

> **Enterprise Restaurant Operating System**

[![Status](https://img.shields.io/badge/status-Phase%207%20%E2%80%94%20Production%20Ready-green)]()
[![Architecture](https://img.shields.io/badge/architecture-Modular%20Monolith%20%E2%86%92%20Platform-green)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey)]()

---

## What Is Restaurants OS?

**Restaurants OS** is an enterprise-grade Restaurant Operating System designed to run the full operational, financial, and strategic lifecycle of food-service businesses at any scale.

This is **not a POS application**. Restaurants OS is a platform.

| Deployment Model | Supported |
|---|---|
| Single Restaurant | ✅ |
| Restaurant Chain | ✅ |
| Franchise | ✅ |
| Cloud Kitchen | ✅ |
| Multi-Brand | ✅ |
| Multi-Country | ✅ |
| Enterprise | ✅ |

---

## Architecture Philosophy

Restaurants OS is built on the following non-negotiable foundations:

- **Domain-Driven Design** — the business domain drives every technical decision
- **Clean Architecture** — dependency direction is always inward toward the domain
- **Modular Monolith First** — start cohesive, decompose when justified
- **Event-Driven** — integration through events, not direct calls
- **Multi-Tenant by Design** — tenant isolation is a first-class concern
- **Cloud Native** — Kubernetes, OpenTelemetry, infrastructure as code
- **Offline-First POS** — operational continuity without network dependency
- **Plugin Architecture** — extensibility without core modification

> **Governance Rule**: No source code, project, solution, infrastructure, API contract, or database artifact may be created before the corresponding Product, Domain, Architecture, ADR, and RFC documentation reaches **Approved** status.

---

## Repository Structure

```
Restaurant-OS/
├── docs/                   # Narrative documentation
│   ├── 00-product/         # Product vision, charter, capabilities
│   ├── 01-domain/          # Domain model, DDD artifacts
│   ├── 02-architecture/    # Architecture views and decisions
│   ├── 03-security/        # Security model and threat analysis
│   ├── 04-platform/        # Platform engineering
│   ├── 05-api/             # API and integration contracts
│   ├── 06-ui/              # UI platform
│   ├── 07-devops/          # DevOps, SRE, observability
│   ├── 08-quality/         # Quality gates and fitness functions
│   └── 09-decisions/       # Decision log
├── architecture/           # Reusable architecture assets
│   ├── principles/         # Architecture principles (authoritative)
│   ├── constraints/        # Architecture constraints
│   ├── decisions/          # Decision assets
│   └── reference-models/   # Canonical reference models
├── adr/                    # Architecture Decision Records
│   ├── strategic/
│   ├── tactical/
│   └── operational/
├── rfc/                    # Requests for Comment
│   ├── strategic/
│   ├── tactical/
│   └── operational/
├── governance/             # Architecture Board and policies
├── standards/              # Enterprise standards (naming, API, events)
├── specs/                  # Feature and module specifications
├── templates/              # Document templates
├── decision-log/           # Chronological decision index
├── prompts/                # AI-assisted authoring prompts
├── tools/                  # Tooling guides
├── scripts/                # Automation scripts
└── .github/                # GitHub workflow and templates
```

---

## Quick Navigation

| I want to... | Go to |
|---|---|
| Read the Master Architecture Decisions | [Top-Level ADR](ADR.md) |
| Read the Operations & Runbook | [Operations Manual](OPERATIONS.md) |
| Understand the product | [Product Vision](docs/00-product/00-product-vision.md) |
| Explore the domain | [Domain Landscape](docs/01-domain/00-domain-landscape.md) |
| Review architecture | [Architecture Vision](docs/02-architecture/00-architecture-vision.md) |
| Find detailed architecture decisions | [ADR Index](adr/) |
| Find RFCs | [RFC Index](rfc/) |
| Read standards | [Standards](standards/) |
| Understand governance | [Governance](governance/DECISION_PROCESS.md) |
| Find all documents | [Master Index](docs/INDEX.md) |
| Read the glossary | [Glossary](docs/GLOSSARY.md) |

---

## Current Status

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the historical phases, milestones, and risk register.

**Current Phase**: Phase 7 — Production Ready
**Phase Goal**: Ensure all architectural boundaries are secured, load-tested, documented, and wrapped in Docker containers for enterprise deployment.

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:3000
```

**Known issue (Windows + Node 24)**: on some Windows machines running Node.js 24.x, `next dev` fails to compile `globals.css` (`Module parse failed: Unexpected character '@'`) because Next.js 14's dev-mode webpack/PostCSS pipeline doesn't apply the CSS loader correctly under Node 24. Production builds (`next build` + `next start`) are unaffected — the app, Tailwind config, and PostCSS setup are all correct; this is strictly a dev-server compilation issue on this Node version.

If you hit this, use the production-mode fallback instead of `next dev`:

```bash
npm run dev:winfix   # runs `next build && next start`
```

This gives you a fully working, correctly styled app for local testing, without hot-reload. The real fix is to run local dev on Node 20 LTS (via [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 20 && nvm use 20`) once that download is reachable from your network — some networks block direct downloads from `nodejs.org`. `npm run dev` remains the default script since this bug is specific to this Node/OS combination, not the codebase.

---

## Online Ordering, Delivery & Loyalty Club (Phase 2)

The customer-facing feature set added on top of the core POS/back-office system:

- **Customer accounts** — SMS OTP login (`/order/login`), no password. In non-production environments (and whenever `ENABLE_TEST_ROUTES=1`, e.g. CI/E2E tests), the OTP code is echoed back in the response as `devCode` since no real SMS gateway is wired in yet; this is never leaked in a real production deployment. See `src/lib/sms.ts` for the pluggable provider interface — replace `ConsoleSmsProvider` with a real gateway (Kavenegar, ippanel, etc.) before accepting real customers.
- **Online menu & ordering** — `/order` (browse + cart), `/order/checkout` (address, loyalty-point redemption, price breakdown), `/order/orders/[id]` (live tracking), `/order/profile` (points balance, tier, order history).
- **Payment** — integrated with ZarinPal (`src/lib/zarinpal.ts`), defaulting to **sandbox mode** (`ZARINPAL_SANDBOX=false` + `ZARINPAL_MERCHANT_ID=<real id>` to go live). Orders are created in `AWAITING_PAYMENT` with no inventory/income/points side effects; those are only applied once the gateway confirms payment (`finalizeOnlineOrderAfterPayment`), so an abandoned or failed checkout never depletes stock or books fake income.
- **Delivery management** — `/dashboard/delivery` (staff-only): courier roster, delivery board, and a per-order pipeline (`PENDING_ASSIGNMENT → ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED`).
- **Loyalty club** — points earned per purchase and redeemable for a discount at checkout, with an automatic tier (`NORMAL/BRONZE/SILVER/GOLD/VIP`) based on lifetime spend (`src/lib/loyalty.ts`). This same engine now also applies to in-person POS orders placed with a customer attached — POS orders previously only updated `totalOrders`/`totalSpent`, they now also earn points and can upgrade tier. The lifetime-spend thresholds for each tier are a first-pass default and not yet exposed in any settings UI — adjust them in `TIER_THRESHOLDS` in `src/lib/loyalty.ts` if the business wants different breakpoints.

Covered by `tests/onlineOrdering.test.ts` and `tests/loyalty.test.ts` (OTP login, order-ownership isolation, server-side price/points verification, payment finalization idempotency, full courier/delivery lifecycle, payment-failure cancellation, points-redemption clamping).

---

## Purchasing & Supplier Management (Phase 3)

Full purchase-order cycle for buying inventory from suppliers, at `/dashboard/purchase-orders` and `/dashboard/suppliers` (staff with ADMIN, INVENTORY_MANAGER, or ACCOUNTANT):

- **Purchase orders** — `DRAFT → ORDERED → PARTIALLY_RECEIVED/RECEIVED`, plus `CANCELLED` (only while nothing has been received yet). Stock, cost, accounting, and the supplier's balance only change at the moment goods are actually received (`receivePurchaseOrderItems`), never when a PO is merely drafted or ordered — so a PO that's cancelled or never delivered has zero effect on inventory or the books. Receiving supports partial batches and can be called repeatedly as more of an order arrives; it's clamped so a batch can never receive more than what's still outstanding.
- **Supplier accounts payable** — each received PO increases `Supplier.balanceOwed` by the real cost of goods received (and books the matching EXPENSE transaction); `recordSupplierPayment` reduces that balance without booking a second expense, since the cost was already recognized at receipt — a payment only settles the payable. `/dashboard/suppliers` shows each supplier's balance and a per-supplier ledger (orders + payments).
- **Low-stock reorder suggestions** — any inventory item at or below its existing `minStockLevel` (the same "reorder point" field already used for restocking) surfaces at the top of `/dashboard/purchase-orders` with a suggested reorder quantity (a simple "top back up to 2× the reorder point" heuristic — freely editable before submitting).
- **Purchase price history** — `getItemPriceHistory` / the price-history panel on the purchase-orders page shows every past order line for an item (date, supplier, quantity, unit cost), for comparing suppliers or spotting price drift.

Covered end-to-end by `tests/procurement.test.ts` (low-stock detection, PO creation and totals, rejecting receipt on a draft, partial and completing receipt with correct stock/cost/expense/balance updates, over-receipt clamping, payment reducing the balance, price history, and cancellation rules).

---

## Staff & Shift Management (Phase 4)

Shift scheduling, attendance, staff requests, and payroll, at `/dashboard/staff` (every logged-in user, for the self-service tabs; ADMIN for shift/request management; ADMIN or ACCOUNTANT for payroll):

- **Shifts & assignment** — ADMIN defines shifts (date, start/end time, optional role label) and assigns staff to them. A shift can only be cancelled, and an assignment can only be removed, while no attendance has been clocked against it yet — once someone has actually shown up, the record is kept.
- **Attendance (clock-in/clock-out)** — any staff member clocks in/out on their own shift assignments from `/dashboard/staff`; the action verifies the assignment belongs to the caller, and rejects a second clock-in or clock-out without the matching prior step.
- **Leave & shift-swap requests** — staff submit a `LEAVE` request (date range) or a `SHIFT_SWAP` request (hand a not-yet-worked shift assignment to a named colleague); ADMIN reviews and approves/rejects. Approving a `LEAVE` request frees any of that user's shift assignments falling in the date range that have no attendance yet, so ADMIN can reassign them. Approving a `SHIFT_SWAP` transfers the assignment's ownership to the target colleague — rejected upfront (even before ADMIN reviews it) if that colleague is already assigned to the same shift, or if attendance has already started on the source assignment.
- **Payroll (fixed hourly rate)** — each `User` has an `hourlyRate` (editable by ADMIN from the payroll tab). `getPayrollPreview`/`runPayroll` sum a user's unpaid attendance hours (clock-in/clock-out pairs not yet attached to a prior payroll run) over a date range, multiply by their hourly rate, and — only on `runPayroll` — create a `PayrollPayment` record, link the covered `Attendance` rows to it (so they can never be paid twice), and book the amount as an accounting `EXPENSE` transaction. Nothing is booked at preview time.

Covered end-to-end by `tests/staffSchedule.test.ts` (role gating on shift/request management, assignment and duplicate-assignment rejection, cross-user clock-in protection, double clock-in/out rejection, blocking removal of an attended assignment, leave approval freeing an unattended shift, shift-swap approval transferring ownership and rejecting a same-shift conflict, self-cancellation of a pending request, and the full payroll preview → run → double-run-rejected → history cycle including the accounting EXPENSE booking).

---

## Multi-Branch Support (Phase 5)

Restaurant-OS now supports operating multiple physical branches (شعبه‌ها) from a single deployment.

### Data model

- **`Branch`**: name, address, phone, `isActive`, `isDefault` (exactly one branch is always the default; it cannot be deactivated).
- **`User.branchId`**: every staff member belongs to exactly one branch. `ADMIN` users are branch-exempt: they see and manage every branch.
- **`BranchInventoryStock`**: per-branch stock levels (`currentStock`, `minStockLevel`, `costPerUnit`, `lastRestocked`), unique per `(branchId, inventoryItemId)`. The `InventoryItem` model itself stays a chain-wide catalog (name/category/unit) shared by all branches.
- **`Table`, `Reservation`, `Supplier`, `PurchaseOrder`, `Shift`, `Transaction`, `Order`** all carry a `branchId` (nullable on `Order`/`Transaction` for online orders — see below).

### Access rules

- Non-admin staff only ever see and act on data belonging to their own branch. Server actions enforce this with `resolveBranchFilter` (reads) and `resolveBranchForCreate` (writes), and explicitly re-check ownership before any update on an existing record (e.g. a cashier cannot change another branch's table status, reservation, purchase order, or shift assignment).
- `ADMIN` accounts are exempt from branch scoping everywhere and can pass an explicit `branchId` to filter or target a specific branch.
- Assigning a staff member to a shift validates that the staff member belongs to the shift's branch.

### Known limitations (by design, for this phase)

- **Online ordering stays branch-less.** `Order.branchId` / `Transaction.branchId` remain `null` for online/delivery orders; ingredient stock for these orders is deducted from the chain's default branch (`getDefaultBranchId()`). This keeps the public ordering flow simple until a future phase adds branch selection to the online storefront.
- **Menu, recipes, customers, couriers, and global settings remain shared** across all branches — only inventory *stock levels*, tables/reservations, suppliers/purchase orders, shifts, and accounting transactions are branch-scoped.

### UI

- A new ADMIN-only **"شعبه‌ها" (Branches)** page (`/dashboard/branches`) for creating, editing, activating/deactivating, and setting the default branch.
- The user-management screen gained a branch selector when creating staff, and a "شعبه" column in the staff table.
- All other existing pages are unchanged visually — branch scoping happens transparently in the underlying server actions.

Covered end-to-end by `tests/branches.test.ts`.

---

## CRM & Marketing (Phase 6)

A full customer-relationship and marketing layer on top of the Phase 2 loyalty club.

### Customer profiles

Beyond the loyalty fields (`totalOrders`, `totalSpent`, `loyaltyTier`, `pointsBalance`), each `Customer` now also carries `email`, free-form `tags`, a `marketingOptIn` flag, and an optional `dateOfBirth`. ADMIN can edit these from the CRM dashboard and attach internal, timestamped `CustomerNote`s (staff-visible only — never shown to the customer).

### Segmentation & campaigns

A `Campaign` targets one segment — all opted-in customers, a loyalty tier, a tag, or customers inactive for N days (win-back) — and is created as a `DRAFT` with a live audience preview (`getCustomerSegmentPreview`) before anything is sent. Sending (`sendCampaign`) re-resolves the segment, respects `marketingOptIn` (an opted-out customer is never contacted), and records a `CampaignRecipient` row per customer with its own delivery status — so a campaign can only be sent once and always leaves an audit trail of who actually received it.

### Automated-style messages

There is no job scheduler in this deployment (no cron, no background worker), so "automated" messages here are computed segments an ADMIN triggers manually rather than something that fires on its own overnight:

- **Welcome message** — sent immediately, once, when a customer is first created (either by staff at the POS or via online OTP self-registration) — a transactional message, sent regardless of `marketingOptIn`.
- **Win-back** — the `INACTIVE` campaign segment (configurable "no visit in N days").
- **Birthday greeting** — `getUpcomingBirthdayCustomers` computes customers whose birthday (month/day, any year) falls in the next N days; the CRM campaign composer offers it as a one-click segment that resolves to those customers under the hood.

### Order feedback

A customer can rate (1–5) and comment on any of their own orders once it reaches `COMPLETED`, from the online customer portal (`/order/orders/[id]`) — works for an order from any channel (POS or online), as long as it's linked to their customer account. ADMIN sees every review and the overall average rating in the CRM dashboard's feedback tab.

### Referral program

Every customer gets a shareable `referralCode` (generated lazily on first use for pre-Phase-6 customers). Entering someone else's code at OTP sign-up links the new customer to their referrer (`referredByCustomerId`); on that new customer's very first order (POS or online), the referrer is credited a one-time bonus (`RestaurantSettings.referralBonusPoints`, default 50) as a loyalty-point transaction — guarded by a `referralRewardGranted` flag so it can never be paid out twice, even if the same order is re-processed.

### Access & scope

- **CRM management is ADMIN-only**: customer notes/profile editing, segmentation, campaigns, and the feedback dashboard all require the `ADMIN` role. This is narrower than `getCustomers`/`createCustomer`, which stay open to `CASHIER` too — those two actions are shared with the POS checkout flow (attaching a customer to a sale for loyalty points) and were deliberately left untouched.
- Customers, and therefore all of CRM, remain global/shared across branches — consistent with the Phase 5 multi-branch design, which already keeps the customer base unscoped.

Covered end-to-end by `tests/crm.test.ts`.

---

## Full Accounting & Tax (Phase 7)

A practical accounting layer on top of the original flat `Transaction` log: categorization (chart of accounts), tax tracking, financial reporting, and export — deliberately **single-entry**, not full double-entry/debit-credit bookkeeping.

### Data model

- **`TransactionCategory`**: `name`, `type` (`INCOME`/`EXPENSE`), optional `taxRatePercent`, `isSystem`. Six system categories are seeded and cannot be renamed or deleted: فروش حضوری (POS), فروش آنلاین, سایر درآمدها, خرید کالا و مواد اولیه, حقوق و دستمزد, سایر هزینه‌ها. ADMIN/ACCOUNTANT can add, edit, or delete their own custom categories (a category with any linked transactions cannot be deleted).
- **`Transaction`** gained `categoryId`, `taxAmount`, `referenceType`/`referenceId` (linking an automatic transaction back to the real event that created it — an `Order`, `PurchaseOrder`, or `PAYROLL` payment), and `createdByUserId`.
- **`Order.taxAmount`** is now persisted at order-creation time (POS and online), so the income transaction booked when an order is paid always carries the *exact* tax computed at checkout — never recomputed or estimated later.

### Automatic bookkeeping

Every order, purchase-order receipt, and payroll run already booked a `Transaction` before this phase; Phase 7 only adds categorization and tax to those same automatic postings — no new manual step for staff:

- POS order → INCOME, category «فروش حضوری», exact checkout tax.
- Online order (after payment) → INCOME, category «فروش آنلاین», exact checkout tax.
- Purchase-order receipt → EXPENSE, category «خرید کالا و مواد اولیه» (tax 0 unless a human edits it — no input-VAT is invented).
- Payroll run → EXPENSE, category «حقوق و دستمزد».

### Manual entries, editing, and tax

- ADMIN/ACCOUNTANT can record a manual `createIncome`/`createExpense` against any category. If the category has a `taxRatePercent` and no explicit tax is given, the entered amount is treated as **tax-inclusive**, and the tax portion is backed out automatically (`amount − amount / (1 + rate/100)`).
- `updateTransactionCategory` lets a transaction be recategorized or have its tax corrected after the fact (including automatic ones) — but never changes its `amount`/`type`, and a new category must match the transaction's existing income/expense type.
- **Deletion is ADMIN-only and manual-transactions-only**: any transaction with a `referenceType` (i.e. generated automatically from a real order/purchase/payroll event) can be recategorized but never deleted, so the accounting trail always matches what actually happened operationally.

### Reporting & export

- `getFinancialSummary` / `getProfitAndLossReport` compute income/expense by category, net profit, and a VAT-style summary (output tax from income, input tax from expenses, net payable) over a branch/date-range filter.
- The dashboard's **"چاپ گزارش"** button opens the browser's native print view (no server-side PDF generation exists in this project); a genuine downloadable file is provided via **Excel (.xlsx) export** (`exportTransactionsToExcel`), which was already a project dependency.

### Known limitations (by design, for this phase)

- **Single-entry, not double-entry.** There is no debit/credit ledger, no journal entries, and no trial balance/balance sheet — this was an explicit scope choice over full enterprise bookkeeping.
- **No true customer accounts-receivable.** Every order in this system is paid at the POS or via the online gateway before fulfillment — there is no credit-sale/unpaid-order mechanism anywhere to hang an AR ledger off of. Supplier accounts-payable (from Phase 3's `getSupplierLedger`) already covers the AP side.
- **"PDF export" is a print view, not a generated file** — see Reporting & export above.

### Access & scope

- Kept identical to the pre-existing model: all accounting functions require `ADMIN` or `ACCOUNTANT`, except transaction deletion, which is `ADMIN`-only.
- Transactions remain branch-scoped exactly like Phase 5 (non-exempt staff only see their own branch's transactions; `ADMIN` sees all and can filter by branch).

Covered end-to-end by `tests/accounting.test.ts`.

---

## Kitchen Display System — Multi-Station Routing (Phase 8)

A basic single-queue kitchen display (a 3-column PENDING → PREPARING → READY board with an elapsed-time-since-order warning) already existed from an earlier phase. Phase 8 adds multi-station routing on top of it, without changing that underlying board or its access model.

### Data model

- **`MenuItem.kitchenStation`**: an optional free-text label (e.g. «گریل», «سرد», «دسر») set per menu item by ADMIN. It is deliberately just a tag on the existing menu item — not a new managed "Station" entity/table. An item left without one falls back to a catch-all «عمومی» (general) station.

### Station routing on the KDS

- The kitchen page (`/dashboard/kitchen`) now shows a row of station tabs above the existing board: "همه ایستگاه‌ها" (all) plus one tab per station that currently has at least one active item — tabs are computed live from what's actually in the queue, not from a fixed configured list, so an unused station simply has no tab.
- Selecting a station tab filters the board to tickets containing at least one item for that station, and within each ticket only that station's items are shown (all items are shown, with a small station badge per item, under "همه ایستگاه‌ها").
- The existing elapsed-time warning (a ticket highlighted once it's been waiting too long) and the PENDING/PREPARING/READY flow are unchanged and apply the same way inside a filtered station view.

### Known limitations (by design, for this phase)

- **Order status is still per-order, not per-item.** A ticket's "شروع پخت"/"آماده تحویل" buttons always advance the *whole* order, even when a chef is looking at a single-station tab that only shows that station's items — there is no independent per-item ready state. Splitting an order's kitchen workflow per item would require a real per-item status column, which was out of scope for this pass.
- **No configurable prep-time targets or formal SLAs.** As scoped, stations only add routing/filtering; the "late ticket" warning stays the same simple elapsed-time threshold that existed before this phase, not a per-item/per-station configurable target time.

### Access & scope

- Unchanged: the `/dashboard/kitchen` route was already restricted to `ADMIN` and `CHEF`, and the underlying `getActiveOrders`/`updateOrderStatus` actions remain also open to `CASHIER` as before (shared with other parts of the app). Editing a menu item's kitchen station is part of menu management and stays `ADMIN`-only.

Covered end-to-end by `tests/kitchen.test.ts`.

---

## Sales Analytics / BI Dashboard (Phase 9)

A reporting dashboard (`/dashboard/analytics`) that turns the order history already collected by the app (POS + online, across branches) into sales KPIs, trends and comparisons — no new data-entry surface, purely derived reporting.

### What counts as a sale

- **"Real sales" definition (fixed, not user-configurable):** an order counts if its status is anything other than `CANCELLED` or `AWAITING_PAYMENT`. This deliberately mirrors the exact moment the accounting module (Phase 7) books income — POS orders synchronously at `PENDING`, online orders only once payment is confirmed — so the two modules never disagree about what a "sale" is.
- **Default reporting window:** if no date range is chosen, the dashboard shows the last 30 days (inclusive of today). Date range and branch are the only user-facing filters; the sale-status definition above is not.

### Reports included

- **KPI cards**: total revenue, total order count, average order value for the selected period/branch.
- **Daily revenue trend**: revenue and order count per day across the selected range.
- **Best/worst-selling menu items**: top 10 by revenue and bottom 10 by quantity sold, computed only among items that had at least one sale in the period.
- **Branch comparison**: revenue and order count per branch (ADMIN sees every branch side-by-side; a branch-scoped role only ever sees its own branch's row, plus branch-less online orders — see below).
- **Peak hours**: order count/revenue for each of the 24 hours of the day.
- **Sales channel mix**: order count/revenue split by `DINE_IN` / `TAKEAWAY` / `ONLINE_DELIVERY`.

### Branch scoping

Reuses the exact multi-branch pattern from Phases 5/7: `ADMIN` sees and can filter across every branch; `ACCOUNTANT` (the other role with access) is always scoped to their own branch, regardless of any `branchId` sent from the client. As in the accounting module, branch-less online orders (`branchId = null` — online ordering doesn't have a branch picker yet, a known limitation carried over from Phase 5) are visible under **any** branch filter, including a non-admin's own-branch view — they simply don't have a "real" branch to attribute to yet.

### Known limitations (by design, for this phase)

- **"Worst-selling" is not "never sold."** The bottom-10 list only ranks items that sold at least once in the period; comparing against the full menu to find items with *zero* sales was out of scope for this pass.
- **No export.** Unlike the accounting module's Excel export, this dashboard has no export feature in this pass.
- **No forecasting/cohort/staff-performance analytics.** This phase is limited to descriptive sales/menu/branch reporting — no predictive or customer-cohort analysis.

Covered end-to-end by `tests/analytics.test.ts`.

---

## Refunds & Returns (Phase 10)

An `ADMIN`-only module (`/dashboard/refunds`) for reversing a `COMPLETED` order — partially (specific item/quantity lines) or fully (whatever balance of the order hasn't been refunded yet) — with the reversal propagated automatically to accounting, inventory, and (if the order has a customer) loyalty.

### Eligibility and how refund state is tracked

- **Only `COMPLETED` orders can be refunded.** An order still in the kitchen/delivery pipeline (`PENDING`/`PREPARING`/`READY`/`AWAITING_PAYMENT`) must be advanced or cancelled first — out of scope for this phase.
- **No new `Order` status.** Refund history lives entirely in two new tables (`Refund`, `RefundItem`) plus a new `OrderItem.refundedQuantity` counter (capped at that item's original quantity). `Order.status` stays `COMPLETED` forever, even after a full refund — this was a deliberate choice to avoid a fragile Postgres enum migration and to avoid touching the existing exhaustive `status`-based filters in `getActiveOrders`/the kitchen board.
- **Access is `ADMIN`-only** (the recommended, simplest option), so none of the Phase 5 branch-scoping logic applies here — an `ADMIN` can already see and act on every branch.

### What a refund does

- **Accounting**: books a brand-new `EXPENSE` transaction (system category "مرجوعی و استرداد") linked to the refund via `referenceType`/`referenceId`. The original `INCOME` transaction from the order is never touched or deleted, per the Phase 7 rule that a reference-backed transaction is permanent — the net effect (lower net profit, lower net VAT payable) falls out of `getFinancialSummary`/`getProfitAndLossReport` automatically.
- **Inventory**: restocks `BranchInventoryStock` for the refunded quantity of each item, via that item's recipe (BOM) — always assumed sellable, with no damaged/spoiled-goods distinction.
- **Tax**: reversed proportionally to the refunded items' share of the order's total item subtotal (not a flat per-item tax rate, since only one order-level `taxAmount` is stored).
- **Packaging cost**: refunded only on a *full* refund, using the restaurant's *current* packaging-cost setting — `Order` never persisted the packaging cost actually charged at checkout, so this is the closest available approximation, and it is a known, disclosed imprecision if that setting changed since the order was placed.
- **Delivery fee**: never refunded, in either mode — the delivery service is assumed rendered regardless of a food refund.
- **Loyalty & customer stats** (only if the order has a customer): points earned on the order are clawed back and points redeemed are returned, both proportional to the same refunded-share ratio; `totalSpent` is decremented (floored at zero) and the loyalty tier recomputed; `totalOrders` is decremented by one only when the refund is explicitly a full refund, not as a side effect of several partial refunds happening to add up to the whole order.

### A pre-existing fix bundled with this phase

`Order.pointsEarned` was only ever persisted by the online-order flow — POS orders (`createOrder`) awarded the points to the customer but never wrote the amount onto the order itself, so it silently stayed `0`. This would have made the new points-clawback logic above a no-op for the majority of orders. It's now stored at order-creation time using the same calculation `awardLoyaltyForOrder` performs internally.

### Known limitations (by design, for this phase)

- **Sales analytics (Phase 9) is not refund-aware.** A refunded order keeps `status = COMPLETED`, so its original revenue keeps appearing, unadjusted, in the analytics dashboard — reworking analytics to net out refunds was out of scope here.
- **No manager-approval workflow.** Any `ADMIN` can create a refund outright; there is no request/approve/reject step.

Covered end-to-end by `tests/refund.test.ts`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, review process, and branching model.

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md) and pass the [Documentation Quality Gate](DOCUMENTATION_STANDARD.md).

---

## License

[MIT License](LICENSE) — Copyright © 2026 Restaurants OS Project
