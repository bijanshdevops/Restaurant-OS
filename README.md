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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, review process, and branching model.

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md) and pass the [Documentation Quality Gate](DOCUMENTATION_STANDARD.md).

---

## License

[MIT License](LICENSE) — Copyright © 2026 Restaurants OS Project
