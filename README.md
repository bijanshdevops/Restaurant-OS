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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, review process, and branching model.

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md) and pass the [Documentation Quality Gate](DOCUMENTATION_STANDARD.md).

---

## License

[MIT License](LICENSE) — Copyright © 2026 Restaurants OS Project
