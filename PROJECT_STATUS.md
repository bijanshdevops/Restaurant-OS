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
