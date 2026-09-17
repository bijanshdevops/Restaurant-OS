# Changelog

All notable changes to Restaurants OS documentation and architecture will be recorded here.

This document follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in [VERSION_POLICY.md](governance/VERSION_POLICY.md).

---

## [Unreleased]

### Added
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
