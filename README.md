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

## Audit Log (Phase 11)

An `ADMIN`-only activity log (`/dashboard/audit-log`) that records **sensitive events only** — deliberately not a full request/read audit trail, and not a change-log for every write in the system.

### What is logged (and what deliberately isn't)

Only these events write an `AuditLog` row: user login (both success and failure), user creation and deletion, financial-transaction deletion and recategorization/edit, refund creation, restaurant-settings and Modian (tax-authority) settings updates, and running payroll. Everything else — every read/list action, every normal POS/online order, menu/inventory/reservation/CRM changes, and so on — is intentionally never logged, per the explicit "sensitive events only" scope decision for this phase. This keeps the log small and genuinely worth reading, at the cost of not being a complete forensic trail of the system.

**Role changes are not a logged event because no such action exists in this codebase.** A user's roles are set once, at `createUser` time (`roles: Role[]`), and there is no `updateUserRoles`/`updateRoles` action anywhere to change them afterward — this was confirmed by re-reading `src/app/actions/user.ts` while scoping this phase. If that capability is added in a future phase, it should log a `ROLE_CHANGED`-style event alongside it.

### How it's recorded

- A single `logAudit()` helper (`src/lib/auditLog.ts`) is the only place that writes to the `AuditLog` table. It never throws — any failure writing the log row (e.g. a transient DB hiccup) is swallowed and only printed to the server console, so a logging problem can never break the real operation (deleting a transaction, running payroll, etc.) it's attached to.
- Call sites inside an existing `prisma.$transaction` (payroll runs, refund creation) pass that transaction's client into `logAudit()`, so the log row commits or rolls back atomically with the business operation it describes — a payroll run that fails partway through never leaves behind a log entry for a payment that was never actually made.
- A failed login is logged with `actorUserId = null` (or the real user's id, if the username matched but the password didn't) and `actorName` set to the attempted username — the password itself is never logged, anywhere.
- Deleting a user never fails or is blocked because of that user's own audit history: the `AuditLog.actorUserId` foreign key uses `onDelete: SetNull`.

### Access

`/dashboard/audit-log` and the underlying `getAuditLogs`/`getAuditActionList` actions are `ADMIN`-only (the recommended, simplest option) — there is no per-branch scoping here, since audit visibility isn't tied to the multi-branch model.

### Known limitations (by design, for this phase)

- **No export and no retention/archival policy.** Log rows accumulate indefinitely; pruning old entries was out of scope for this pass.
- **No IP address capture.** This is a Next.js Server Actions app without a straightforward, framework-native way to read the caller's IP from inside a Server Action; `AuditLog.ipAddress` was left out of the schema entirely rather than shipping an always-empty column.
- **Not a full audit trail.** As covered above, this is a fixed, curated list of sensitive events — not a generic "log every mutation" system.

Covered end-to-end by `tests/auditLog.test.ts`.

---

## Waitlist & Reservation Deposits (Phase 12)

Two related, but deliberately separate, additions on top of the existing table/reservation model, both scoped to `ADMIN` + `CASHIER` access — the same access model as reservations already had.

### Waitlist

A new `WaitlistEntry` model for **walk-in** guests who are physically present right now but have neither a future time nor a pre-assigned table — which is exactly what distinguishes it from `Reservation`. Entries move through `WAITING → SEATED` or `WAITING → CANCELLED` (`WaitlistStatus`). Seating a waitlist entry (`seatFromWaitlist`) assigns it a table and mirrors the same table-status-sync logic `updateReservationStatus` already uses for its `SEATED` branch (the table becomes `OCCUPIED`), inside one `$transaction` for atomicity. `getWaitlist` only returns entries still `WAITING`.

### Reservation deposits

`Reservation` gained two fields: `depositAmount` (default `0`) and `depositRefundedAt`. A deposit is staff-entered at `createReservation` time (this is a manual/cash flow — there is no payment-gateway integration here) and, when greater than zero, creates a real `INCOME` transaction in the same `$transaction` as the reservation itself, using a dedicated system category (`INCOME_RESERVATION_DEPOSIT`) and `referenceType: 'RESERVATION_DEPOSIT'` pointing back at the reservation.

**Refunding a deposit is a separate, explicit staff action (`refundReservationDeposit`) — never automatic.** No `ReservationStatus` transition (cancelling, marking `NO_SHOW`, completing, etc.) triggers a refund on its own; a staff member must call the refund action directly. Per the confirmed policy for this phase, a refund is **always the full deposit amount, and can be issued at any time** — including after the reservation has already been cancelled or marked as a no-show — with no penalty tiers or time-based proration. A refund creates an offsetting `EXPENSE` transaction (`EXPENSE_RESERVATION_DEPOSIT_REFUND` category, `referenceType: 'RESERVATION_DEPOSIT_REFUND'`) for the full amount; the original `INCOME` transaction from the deposit is never edited or deleted (the same "reference-backed transactions are permanent" rule Phase 7 and the Phase 10 refund flow already follow). A reservation can only be refunded once — a second attempt, or an attempt on a reservation with no deposit, is rejected.

### Known scope decisions (disclosed)

- **Deposit collection and refund are not logged in the Phase 11 audit log.** That phase's "sensitive events" list was locked in before this phase existed, and expanding it was out of scope here.
- **No cancellation-penalty tiers.** The confirmed policy is a full, unconditional refund at any time — this was a deliberate choice, not an oversight.
- **No customer-facing waitlist view.** Joining/seating/cancelling the waitlist is staff-only, matching the reservation model's existing access pattern.

Covered end-to-end by `tests/waitlistDeposits.test.ts`.

---

## Precise Recipe/BOM (Phase 13)

All three sub-features the user asked for shipped together in this phase, all scoped to **`ADMIN`-only** access — the same access model the existing recipe/BOM screen already had (the confirmed choice for this phase, over an alternative that would also have allowed `INVENTORY_MANAGER`).

### Yield % (waste)

Every `RecipeItem` (and every `SubRecipeItem`) gained a `yieldPercent` field, defaulting to `100` for full backward compatibility with every recipe line that existed before this phase. The *effective* quantity deducted from inventory is `quantity / (yieldPercent / 100)` — so a line with `quantity: 2, yieldPercent: 50` deducts `4` units per order, modeling a raw ingredient that is halved by trimming/cooking loss before it reaches the plate.

### Sub-recipes

A new `SubRecipe` model represents an intermediate, non-sellable preparation (a sauce, a base dough, …) built from raw `InventoryItem`s and/or *other* sub-recipes. `RecipeItem` was generalized so each line references **exactly one** of `inventoryItemId` or `subRecipeId` (enforced at the action layer, not just nullable columns) — a menu item's formula can now use a sub-recipe as an "ingredient" the same way it uses a raw item. Sub-recipes nest arbitrarily deep; `src/lib/recipeExpansion.ts` recursively expands a sub-recipe (and its own sub-recipes, and so on) down to raw ingredients, with both a depth cap (12 levels) and full cycle detection (`assertNoSubRecipeCycle`, called before every save) as safety nets against a self-referencing or indirectly-circular formula.

### Modifiers / add-ons

A `ModifierGroup` (e.g. "Pizza extras", "Spice level") holds one or more `Modifier`s and attaches to one or more menu items via `MenuItemModifierGroup`, with a `minSelect`/`maxSelect` range enforced **server-side** at order time — never trusted from the client. Each `Modifier` can carry a `priceDelta` (added to the base menu item price) and any number of `ModifierRecipeItem` effects on inventory, with a **signed** quantity: positive means "consumes more" (e.g. extra cheese), negative means "consumes less than the base formula" (e.g. no sauce). The net effect per ingredient, across the base formula plus every selected modifier, is **clamped at zero** — a modifier can never push a deduction negative (i.e. can never *add* stock back).

### The ingredient-usage snapshot (and a pre-existing bug it fixes)

The single most important design decision in this phase: a new `OrderItemIngredientUsage` table snapshots **exactly how much of each raw ingredient a given order line consumed**, computed once — via the same `computeIngredientUsagePerUnit()` that order creation itself uses — at the moment the order (or online order) is created, never recomputed later. `OrderItemModifier` does the same for the selected modifiers' name and price (mirroring the existing `priceAtTime` pattern).

This closes a latent correctness gap in the refund flow that predates this phase: `createRefund` (`refund.ts`) used to restock inventory by **re-walking the menu item's current `recipeItems`** at refund time. If a recipe (or, from this phase on, a sub-recipe's contents, a yield %, or a modifier) was edited between the order and the refund, the refund would restock the *new* formula's quantities — silently wrong for every order placed under the old formula. `refund.ts` now reads the `OrderItemIngredientUsage` rows captured at order time instead, so a refund always restocks precisely what was actually deducted, regardless of any later formula edits. `tests/preciseRecipe.test.ts` has a dedicated test that changes a recipe's quantity by 5x between order and refund and asserts the refund still restocks the original amount.

### Known scope decisions (disclosed)

- **ADMIN-only**, matching the existing recipe screen — not opened up to `INVENTORY_MANAGER`.
- **Cost analysis** (`getMenuCostAnalysis`, `getMenuItemRecipe`) now walks the full expansion (yield % + nested sub-recipes) via the same shared library, but **deliberately excludes modifier effects** — a modifier is an order-time customer choice, not part of the item's own fixed formula, so it doesn't belong in the item's baseline cost/margin figures.
- **Online orders** (`createOnlineOrder`) snapshot usage/modifiers at order-creation time, same as POS orders — inventory is still only actually decremented later, at payment confirmation (`finalizeOnlineOrderAfterPayment`), exactly as before this phase; only the *source* of the deduction numbers changed (snapshot instead of live recipe).
- **A reliability fix alongside the feature work**: every recipe-expansion/cycle-check query is now threaded through the caller's own `$transaction` client when called from inside one (`order.ts`, `subRecipe.ts`), instead of the global `prisma` client. Mixing the two inside an interactive transaction can intermittently starve the connection pool (the transaction holds one connection while waiting on a query that needs a second one) — this was caught by intermittent CI-local test failures during this phase's own development and fixed before shipping.

Covered end-to-end by `tests/preciseRecipe.test.ts` (access control, yield %, sub-recipe expansion and cost roll-up, cycle detection, modifier price/inventory effects including zero-clamping, min/maxSelect validation, and the snapshot-vs-live-formula refund test described above).

---

## Gift Cards & Discount Coupons (Phase 14)

Both sub-features the user asked for shipped together in this phase, with management access scoped to **`ADMIN`-only** — the same access model as Phase 13's recipe/BOM screen. The live balance/discount preview actions used by the online checkout page (`checkGiftCardBalance`, `checkCouponForOrder`) are the one deliberate exception: they need no authentication at all, since a not-yet-logged-in customer must be able to check a code before placing an order.

### Gift cards

A new `GiftCard` model: a unique code, an `initialBalance` set once at issuance, a `currentBalance` that only ever moves downward as the card is redeemed, an optional expiry date, an optional note, and an optional link to the `Customer` it was issued to. Every change in balance is mirrored as a `GiftCardTransaction` row (`ISSUE` or `REDEEM`, each carrying the resulting `balanceAfter`) — a full, append-only ledger per card, not just a running number. `issueGiftCard`/`deactivateGiftCard` are `ADMIN`-only; `checkGiftCardBalance` is the public, non-mutating preview used to show a customer their balance before checkout.

### Discount coupons

A new `Coupon` model: a unique code, `PERCENT` (1–100) or `FIXED` discount, an optional `minOrderAmount`, an optional `maxUses` (unlimited when left blank) with a tracked `usesCount`, an optional expiry, and an `isActive` toggle. A `FIXED` discount larger than the order's subtotal is clamped to the subtotal rather than pushing the order negative. Deleting a coupon that has never been used removes it outright; deleting one that has already been used on at least one order deactivates it instead (`deactivatedInstead: true` in the response) so historical orders keep an intact, resolvable `couponCode` reference.

### Applying a code at checkout — and the layering order

Both `createOrder` (POS) and `createOnlineOrder` (online) accept an optional coupon code and/or gift card code, and apply them **inside the same database transaction that creates the order**. An invalid, expired, exhausted, deactivated, or unknown code throws and rolls back the *entire* order — a bad code fails loudly rather than being silently ignored, so a cashier or customer always knows immediately if a code didn't work. The order records exactly what happened at that moment (`couponCode`, `discountAmount`, `giftCardAmountUsed`, and a `GiftCardTransaction` of type `REDEEM`), so later changes to the coupon or gift card never retroactively change a past order's numbers — the same "snapshot what actually happened" pattern Phase 13 established for recipe usage.

The calculation order, applied identically in both POS and online checkout, is: gross `subtotal` → tax computed on that gross subtotal (unchanged from the app's original tax logic) → coupon discount subtracted → loyalty-points discount subtracted (online orders only, computed on the *post-coupon* amount) → gift card applied last, as a final layer capped at whatever remains due, never producing a negative total.

### Known scope decisions (disclosed)

- **Tax is computed on the gross subtotal, before any discount** — consistent with how tax was already computed before this phase, not a new policy invented here. A coupon or gift card reduces what the customer owes, not the taxable base.
- **No accounting transaction is created when a gift card is issued.** Issuing a card is treated as pre-selling store credit, not as revenue at issuance time; the existing accounting model only records income when the card is later redeemed on an order (the normal order-income transaction, unchanged).
- **A refund does not restore gift-card balance or decrement a coupon's `usesCount`.** Refunding an order (`refund.ts`) was intentionally left untouched — reversing consumed store credit or use-counts on refund was out of scope for this phase. `tests/giftCardsCoupons.test.ts` has a dedicated test proving both stay exactly as they were after a full refund.
- **No customer-picker in the admin gift-card issuance UI.** A card can be issued generically (redeemable by whoever has the code) or linked to a customer at the data-model level, but the admin screen shipped in this phase only exposes the generic issuance flow.
- **An invalid code fails the whole order, not just the discount.** This was a deliberate choice over silently dropping an unrecognized code and still completing the order at full price.

Covered end-to-end by `tests/giftCardsCoupons.test.ts` (access control including the unauthenticated preview actions, gift-card issuance and validation, coupon-creation validation, coupon application including percent/fixed math and minOrderAmount/maxUses/expiry/deactivation rejections, gift-card redemption including partial- and full-drain math and zero-balance/deactivated rejections, the combined coupon+gift-card layering formula, the refund-non-reversal test, and coupon deletion's hard-delete-vs-deactivate behavior).

---

## Combo Meals & Happy Hour Pricing (Phase 15)

Both sub-features the user asked for shipped together in this phase, with management access scoped to **`ADMIN`-only** — the same access model as Phases 13/14.

### Combos: the "shadow menu item" architecture

A `Combo` (a fixed-price bundle of other menu items) is represented internally by giving it a dedicated, hidden `MenuItem` row (`isCombo: true`) whose title/price/kitchen-station/availability are kept in sync with the `Combo` by `src/app/actions/combo.ts`. This means the cart, POS grid, online menu, kitchen board, printer/receipts, refund flow, and sales analytics all need **zero code changes** to support combos — every one of them already just reads "a menu item" off an `OrderItem`. The only place that needed to become combo-aware is `src/lib/recipeExpansion.ts`, which expands a combo's ingredient usage from its `ComboItem` components (each component's own recipe × its quantity in the combo) instead of `RecipeItem` rows, which are never populated for a shadow item.

A combo cannot contain another combo (rejected server-side, not just hidden from the picker) and does not support modifiers in this phase. Deleting a combo that has never been ordered removes both the `Combo` row and its shadow menu item outright; deleting one already used in an order deactivates both instead (`deactivatedInstead: true`), so historical orders keep an intact menu-item reference — the same conditional-delete pattern Phase 14 established for coupons.

A new `OrderItemComboComponent` table snapshots each combo's components (menu item, title, quantity) at the moment the order is created, independent of later edits to the combo's own definition.

### Happy Hour: scheduled discounts on regular menu items

A `HappyHourRule` (a `PERCENT` 1–100 or `FIXED` discount) targets one or more ordinary (non-combo) menu items via `HappyHourRuleItem`, and is active on a set of days (`daysOfWeek`, using JavaScript's `Date.getDay()` convention) within a `startMinute`–`endMinute` window (minutes since midnight), with correct handling of a window that crosses midnight (e.g. 23:00–01:00). The pure calculation logic — `isRuleActiveNow`, `ruleDiscountAmount`, `computeEffectivePrice` — lives in `src/lib/happyHour.ts`, deliberately free of any database dependency so it can be unit-tested directly and reused by both order pricing and any future menu-display code. When multiple active rules match the same item at once, the rule giving the customer the **largest** discount is the one applied.

Order pricing (`verifyCartItems` in `order.ts`) computes each line's Happy-Hour-adjusted price at the moment the order is created and stores it as a per-line snapshot on `OrderItem` (`happyHourRuleId`, `happyHourRuleName`, `happyHourDiscountPerUnit`) — the same "snapshot what actually happened" pattern used for recipe usage (Phase 13) and coupon/gift-card codes (Phase 14). Later edits or deletion of the rule never retroactively change a past order's numbers (`onDelete: SetNull` on the FK, with `happyHourRuleName` kept as an independent string).

### Known scope decisions (disclosed)

- **Happy Hour never applies to combos.** A combo already has its own fixed bundle price, and a menu item flagged `isCombo` is excluded server-side from ever being selectable as a Happy Hour rule's target — not just hidden from the admin picker.
- **The admin UI does not detect or block overlapping Happy Hour rules at save time.** Two rules can legally cover the same item/time window; the "largest discount wins" rule at order time resolves the conflict correctly, but an admin creating overlapping rules gets no warning about it — deliberately out of scope for this phase.
- **"Current time" for Happy Hour matching is the server's own clock (`new Date()`)**, consistent with how the rest of the codebase already treats time — there is no explicit restaurant-timezone concept introduced by this phase.
- **The `OrderItemComboComponent` snapshot is captured but not yet displayed anywhere** — the kitchen ticket and printed receipt still show only the combo's own name, exactly like any other menu item. Surfacing the component breakdown there is a natural, explicitly deferred future enhancement.
- **The POS/online browsing screens do not show a live discounted price for Happy-Hour items.** The client-side price shown while browsing remains the item's regular price (the same simplification already accepted for tax/coupon estimates before this phase); the real Happy-Hour-adjusted price is computed and charged correctly server-side at actual order creation, which is what the tests verify.

Covered end-to-end by `tests/combosHappyHour.test.ts` (access control on all ten new actions, combo creation/validation including the combo-in-combo rejection, combo ordering proving the bundle price — not the sum of components' prices — is charged and that each component's own recipe is deducted from inventory in the correct multiplied amount, the `OrderItemComboComponent` snapshot's contents, combo deletion's hard-delete-vs-deactivate behavior, a combo-order refund proving ingredient restocking still works unchanged, Happy Hour rule validation, unit tests of the pure `src/lib/happyHour.ts` functions including the midnight-crossing window and the largest-discount-wins tie-break, and integration tests through real order creation using the actual server clock proving the discount is/isn't applied correctly and is never applied to a combo).

---

## QR-Code Table Self-Ordering (Phase 16)

Customers scan a QR code printed/displayed at their table and place their own order from their phone, without staff intervention. Per the user's confirmed scope: **login via OTP is required** (no anonymous/guest ordering — the same OTP flow as existing online ordering) and **payment is online, at order-creation time**, through the same Zarinpal gateway already used for online delivery — there is no "pay later at the table" option in this phase.

### A new order channel, not a repurposed one

Rather than reusing the existing `DINE_IN` channel (which the POS already uses for staff-entered dine-in orders), Phase 16 adds a new `OrderChannel` value, `QR_DINE_IN`, so self-ordered QR orders stay distinguishable from staff-entered ones in analytics and reporting. `Order.tableId` and the `Table.orders` relation already existed in the schema (added in an earlier phase) but were never actually populated by any code before this phase — `createDineInQrOrder` (`src/app/actions/order.ts`) is their first real consumer.

The customer-facing flow mirrors the existing online-ordering one almost exactly, reusing its infrastructure rather than duplicating it conceptually: `requireCustomer()` for the OTP gate, `verifyCartItems` for server-trusted pricing, `createOrderItemsWithSnapshots` for the recipe/ingredient-usage snapshot (Phase 13), and `applyCouponWithinTx`/`applyGiftCardWithinTx` for Phase 14's discount layering — all unmodified. `initiatePayment` and the Zarinpal payment callback route were already channel-agnostic and needed no changes to support the new channel; only the payment callback's *failure/cancellation redirect* was made channel-aware (see below), so an unsuccessful QR payment sends the customer back to their table's own checkout page rather than the online-delivery one.

### Branch-aware finalization: an improvement over the existing online-order pattern

A QR order is created with a real `branchId` and `tableId` from the moment it's placed (the scanned table's own branch), unlike an `ONLINE_DELIVERY` order, which still has no branch of its own until fulfillment. `finalizeOnlineOrderAfterPayment` was made channel-aware: it now deducts ingredient stock and books the income `Transaction` against the *table's actual branch* for `QR_DINE_IN` orders, falling back to the previous "default branch" behavior only for `ONLINE_DELIVERY` orders (whose behavior is completely unchanged — see the regression test in `tests/qrDineInOrder.test.ts`). `deliveryStatus` is only ever set for `ONLINE_DELIVERY`; a QR dine-in order has no delivery leg and goes straight to the kitchen queue.

### Customer-facing pages and the admin QR display

New pages under `/order/table/[tableId]` (menu) and `/order/table/[tableId]/checkout` (checkout, without the delivery-address field and without the packaging/delivery-fee line items) mirror the existing `/order` and `/order/checkout` pages. Because the shared `OrderGate` (in `src/app/order/layout.tsx`) redirects any unauthenticated visit under `/order` to `/order/login`, it now also remembers the scanned table id (in `localStorage`) before redirecting, and `CustomerAuthContext.login()` sends the customer back to their table's own menu — not the generic online menu — once OTP verification succeeds.

Each table's QR code is generated **client-side** in the admin Reservations page (`📱 QR سفارش` button on each table card, using the `qrcode` package) and simply encodes `<app origin>/order/table/<table's own UUID>` — no new schema field or server-generated token was introduced for this; the table's existing primary key is the only identifier in the code.

### Known scope decisions (disclosed)

- **`Table.status` is not automatically managed by QR orders in this phase.** A table doesn't flip to `OCCUPIED` when a QR order comes in, and doesn't flip back on completion — exactly as today, `Table.status` remains driven only by the reservation lifecycle. Wiring QR orders into table-status automation is a natural, explicitly deferred next step.
- **The QR code encodes the table's raw UUID directly**, with no separate rotating/expiring token. Anyone who captures the URL (not just by scanning the printed code) can open that table's ordering page for as long as it exists — acceptable given OTP login is still required to actually place and pay for an order, but worth knowing if a stronger anti-tampering guarantee is ever wanted.
- **The cart is shared between the online-delivery flow and the QR dine-in flow** (both reuse the same `CartContext`/`localStorage` key). If a customer has items sitting in an online-delivery cart and then scans a table's QR code, those items carry into the dine-in order. This was not called out as a concern in scoping and is treated as acceptable "it's still just their cart" behavior rather than a bug.
- **No packaging cost is charged on QR dine-in orders** (food is served on plates, not packaged) — this is the one line-item difference from the online-delivery total beyond the already-confirmed absence of a delivery fee.

Covered end-to-end by `tests/qrDineInOrder.test.ts` (`getTableForOrder` for valid/invalid tables, `createDineInQrOrder` requiring OTP login and rejecting an invalid table or empty cart, correct total/channel/tableId/branchId/zero-delivery-fee on a successful order, `finalizeOnlineOrderAfterPayment`'s branch-aware stock deduction and income attribution to the table's own branch with `deliveryStatus` left unset, a regression test proving the existing `ONLINE_DELIVERY` finalize path is completely unaffected, and `getMyOnlineOrder` correctly reused for tracking a QR order with proper ownership isolation).

---

## Third-Party Delivery/Courier Integration (Phase 17)

`ONLINE_DELIVERY` orders can now be dispatched automatically to a third-party courier provider immediately after payment, added **alongside** the existing manual/internal courier workflow (`src/app/actions/delivery.ts`) rather than replacing it — per the user's confirmed scope, dispatch is automatic (never a staff button click), and an order that can't be dispatched simply falls back to the pre-existing manual delivery board.

### No real provider access, so a generic adapter layer plus one simulated provider

No account or API documentation exists for any real courier-aggregation service (SnappFood, Miare, or similar), so this phase ships a pluggable abstraction, `DeliveryProviderAdapter` (`src/lib/deliveryProviders.ts`), with a single simulated implementation, `MOCK_EXPRESS`, registered in `DELIVERY_PROVIDERS`. `MOCK_EXPRESS` always accepts a dispatch synchronously and returns a realistic-looking tracking id/url — the same "always succeeds, no real merchant needed" shape as `src/lib/zarinpal.ts`'s sandbox default. A future real provider is added by implementing the adapter interface once and registering it; nothing else in the app (the dispatch action, the webhook route, the delivery-board UI) needs to change.

### Dispatch and status updates mirror the ZarinPal callback pattern

`finalizeOnlineOrderAfterPayment` (`src/app/actions/order.ts`) calls `dispatchOrderToThirdPartyProvider` right after committing its transaction (deliberately outside the transaction, since dispatch is an external call, however simulated) for every `ONLINE_DELIVERY` order. On success, `Order.deliveryProvider`, `externalDeliveryId`, and `externalTrackingUrl` are set and `deliveryStatus` becomes `ASSIGNED` directly (skipping `PENDING_ASSIGNMENT`, since assignment already happened at the provider). On failure — or when no provider is configured — nothing throws; the order is left exactly as before (`deliveryStatus: 'PENDING_ASSIGNMENT'`, `deliveryProvider: null`) and simply shows up on the existing internal delivery board for manual courier assignment, unchanged from before this phase.

Status progression after dispatch arrives asynchronously, exactly like ZarinPal's payment callback: `receiveDeliveryProviderStatusUpdate` is the handler a real provider's webhook would call, and `src/app/api/delivery-provider/webhook/route.ts` is the real-world HTTP entrypoint (an optional shared-secret header, `DELIVERY_PROVIDER_WEBHOOK_SECRET`, guards it when set). Since no real provider exists to actually send that webhook, two staff-facing actions — `simulateNextProviderStatus` and `simulateProviderDeliveryFailure` — call the same handler directly from the delivery-board UI, clearly labeled "شبیه‌سازی" (simulation) in the UI, so the whole pipeline (dispatch → in-transit → delivered) can be exercised end-to-end without a real courier network.

### Delivery board: one board, two workflows

`getDeliveryBoard` (unchanged) already returns every active `ONLINE_DELIVERY` order regardless of how it's being fulfilled, so the admin delivery board (`/dashboard/delivery`) now branches its controls per order: an order with `deliveryProvider` set shows its tracking id and the two simulate-status buttons; an order without one shows the original courier-assignment dropdown and manual advance/fail buttons, completely unchanged.

### Known scope decisions (disclosed)

- **Every `ONLINE_DELIVERY` order attempts automatic third-party dispatch by default** once `MOCK_EXPRESS` is registered — there is no per-restaurant or per-order toggle to keep every order on the manual internal workflow. A restaurant that wants internal-only delivery would need `DELIVERY_PROVIDER` set to an unregistered value (dispatch then always "fails" and falls back), which is a slightly awkward way to express "don't use this feature" — a cleaner on/off setting is a natural, explicitly deferred enhancement.
- **This changed the default behavior of existing `ONLINE_DELIVERY` orders** (previously always `PENDING_ASSIGNMENT` after payment, now `ASSIGNED` with a `MOCK_EXPRESS` dispatch by default) — `tests/onlineOrdering.test.ts` and `tests/qrDineInOrder.test.ts` were updated to reflect this, and the internal-courier full-cycle test was moved onto an order carrying a dedicated test-only "force dispatch failure" marker (see below) so the manual/internal workflow stays covered end-to-end.
- **A test-only marker string, `[TEST_DISPATCH_FAIL]`** (exported as `TEST_FORCE_DISPATCH_FAILURE_MARKER` from `src/lib/deliveryProviders.ts`), makes `MOCK_EXPRESS` deterministically reject a dispatch when present in `deliveryAddress` — the same idea as a payment gateway's "always declines" test card number. This exists because the test suite runs against a real, already-started server process and cannot toggle that process's environment variables mid-run to simulate a provider outage.
- **No real provider integration exists** — `MOCK_EXPRESS` is the only adapter. Nothing here has been tested against, or is compatible with, any actual courier-aggregator API.
- **No manual "retry dispatch" action** for an order that fell back to the internal board after a dispatch failure — staff simply assign an internal courier as they always could; a later re-dispatch attempt is a natural, deferred enhancement.

Covered end-to-end by `tests/thirdPartyDelivery.test.ts` (automatic dispatch on finalize, the delivery board surfacing a dispatched order, dispatch idempotency, the dispatch-failure fallback via the test marker, webhook status-update validation, the full staff-simulated status cycle through to `DELIVERED`/`COMPLETED`, simulated-failure, access control, and a regression proving `QR_DINE_IN` orders are never dispatched) plus the updated assertions in `tests/onlineOrdering.test.ts` and `tests/qrDineInOrder.test.ts`.

---

## Cash Flow & Bank/Cash Reconciliation (Phase 18)

A new `FinancialAccount` concept (cash till / bank / payment gateway) sits on top of the existing single-entry `Transaction` ledger from Phase 7, letting a transaction be attributed to *which* account the money actually moved through — something the ledger had no way to express before this phase. Per the user's confirmed scope, this phase deliberately does not rebuild anything Phase 7's accounting module or the separate Modian e-invoicing module already cover (categorized P&L, VAT reporting, tax-document submission); it targets the one real gap that codebase research surfaced before scoping began: no concept of a cash till or bank account, and no way to catch a mismatch between the books and what's physically in the till or bank.

### Three system accounts, seeded like Phase 7's categories

Three protected accounts — «صندوق نقد» (cash), «بانک» (bank), «درگاه پرداخت آنلاین» (online gateway) — are seeded with fixed IDs directly in the Phase 18 migration, mirroring exactly how Phase 7 seeded its six system `TransactionCategory` rows. `ADMIN`/`ACCOUNTANT` can additionally create any number of custom `FinancialAccount`s (e.g. a second bank account), per the user's confirmed "seed defaults + allow custom" scope answer.

### Automatic account-linking: a POS cash/card toggle, online/QR always to the gateway

Before this phase, POS checkout (`createOrder`) never recorded how a sale was paid — cash and card were indistinguishable in the ledger. A new نقد/کارت toggle was added to the POS checkout screen, and `createOrder` gained an optional, backward-compatible `paymentMethod` parameter that links the order's automatic income `Transaction` to the cash or bank system account accordingly (defaulting to cash if omitted, so no existing caller breaks). Online and QR-table orders always settle through ZarinPal, so `finalizeOnlineOrderAfterPayment` links their income transaction to the gateway account unconditionally — there was no ambiguity to resolve there, per the user's confirmed scope.

### Transfers: deliberately kept outside the `Transaction` ledger

A new `AccountTransfer` model records moving money between two accounts (e.g. depositing till cash into the bank). This was **not** one of the three scoping questions asked — it is my own architectural addition, made because a "cash flow" feature without any way to move money between the accounts it tracks would be incomplete. It is structurally kept separate from `Transaction` specifically so a transfer can never be mistaken for income or expense and never distorts Phase 7's P&L or VAT figures, which read only from `Transaction`.

### Reconciliation: record and display the variance, never auto-correct

`createAccountReconciliation` lets staff enter what they actually counted in the till/bank against the balance the ledger computes (`computeAccountBalances`, summing income/expense/transfers per account), storing the `difference`. Per the user's confirmed scope, this is intentionally the end of the workflow — no adjusting `Transaction` is ever created to "zero out" the variance; a human decides what to do about a mismatch, the system only surfaces it.

### Known scope decisions (disclosed)

- **Automatic account-linking is limited to POS (cash/card) and online/QR (gateway).** Purchase-order receipts and payroll runs — both of which already post automatic transactions since Phase 7 — keep posting with no `accountId` ("unclassified") by default; they're assignable after the fact via the extended `updateTransactionCategory`, but nothing auto-assigns them in this phase.
- **Accounts are global, not per-branch.** There is no per-branch cash-till concept in this pass — every branch's POS cash sales post to the same single "صندوق نقد" account.
- **The new cash-flow UI is a separate page** (`/dashboard/accounting/cash-flow`), not merged into the existing 664-line accounting page, to avoid destabilizing Phase 7's reporting screen.
- **No automatic adjusting transaction on reconciliation variance** — enforced in code, not just by omission, per the user's confirmed scope.

Covered end-to-end by `tests/cashFlowAccounts.test.ts` (system-account seeding, POS cash/card auto-linking via before/after balance deltas, online/QR gateway auto-linking, custom account creation and transfers, transfer validation, reconciliation correctly recording a variance with no auto-adjustment, manual account (re)assignment via `updateTransactionCategory`, and `CHEF` access-denial across every new action).

---

## Codebase Review & Bug Fix: Refund Cash-Flow Account Linking (Phase 19)

Per the user's confirmed scope, Phase 19 was not a new feature — it was a self-directed review of the existing codebase to find and fix real defects, rather than targeting any specific user-reported problem. The review focused on the highest-risk files first: every action module that books money (`order.ts`, `accounting.ts`, `refund.ts`, `deliveryProvider.ts`, `reservation.ts`, `giftCard.ts`, and the payroll section of `staffSchedule.ts`) was read in full. One genuine, previously-undisclosed bug was found and fixed; the rest of the reviewed files were sound.

### The bug

`createRefund` books an automatic `EXPENSE` transaction that reverses a refunded order's original `INCOME` transaction — but it never set that `EXPENSE` transaction's `accountId`. Phase 18 always links an order's `INCOME` transaction to a specific cash-flow account (cash till, bank, or gateway, depending on how the order was paid), precisely so `computeAccountBalances`/reconciliation can show what's actually in each account. Because the refund's `EXPENSE` transaction was left unlinked, refunding a cash order never reduced the "صندوق نقد" (cash till) balance Phase 18 computes — silently breaking that phase's accuracy for every refunded order.

### Why this is a bug, not a disclosed scope decision

Phase 18 deliberately leaves purchase-order receipts and payroll runs posting with no `accountId` ("unclassified") by default — that's a disclosed scope decision, because those transactions never had a specific payment-method concept to begin with. A refund is different: the order it reverses always has a known account (Phase 18 set it at order time), so failing to carry that same account onto the reversing transaction is a plain asymmetry/oversight, not a considered scope choice.

### The fix

`createRefund` now looks up the original order's `INCOME` transaction (`referenceType: 'ORDER'`, `referenceId: order.id`) inside the same `$transaction`, reads its `accountId`, and sets that same `accountId` on the refund's `EXPENSE` transaction — so a cash refund reduces the cash-till balance, a card refund reduces the bank balance, and a gateway refund reduces the gateway balance, exactly mirroring how the original sale was recorded.

Covered by a new regression test in `tests/refund.test.ts`, which creates a card-paid order, completes and fully refunds it, and asserts the refund's `EXPENSE` transaction carries the exact same `accountId` as the order's original `INCOME` transaction.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, review process, and branching model.

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md) and pass the [Documentation Quality Gate](DOCUMENTATION_STANDARD.md).

---

## License

[MIT License](LICENSE) — Copyright © 2026 Restaurants OS Project
