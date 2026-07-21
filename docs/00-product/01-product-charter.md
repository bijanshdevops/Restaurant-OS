# Product Charter — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the mandate, boundaries, and success criteria for the Restaurants OS project |
| **Scope**          | Project charter for Phase 0 through Phase 5 delivery |
| **Status**         | Draft |
| **Owner**          | Product Owner + Architecture Board |
| **Assumptions**    | Funding and team are secured for Phase 0 and Phase 1 |
| **Constraints**    | Phase 0 must be completed before any code is written |
| **Risks**          | Charter scope changes mid-project; team growth outpaces governance |
| **References**     | [Product Vision](00-product-vision.md), [Roadmap](05-roadmap.md) |
| **Related Documents** | [REPOSITORY_RULES.md](../../REPOSITORY_RULES.md), [Architecture Vision](../02-architecture/00-architecture-vision.md) |

---

## Project Mandate

Restaurants OS is authorized to:

1. Design and deliver an Enterprise Restaurant Operating System
2. Establish the architecture, domain model, and governance foundation
3. Build a plugin platform that allows third-party extension
4. Deliver modules covering operations, finance, supply chain, and guest experience
5. Support all deployment models from single restaurant to global enterprise

---

## Project Boundaries

### In Scope
- Restaurant operations (menus, orders, kitchen, table management)
- Financial management (double-entry accounting, invoicing, tax, treasury)
- Supply chain (procurement, inventory, suppliers)
- Staff management (scheduling, roles, payroll integration)
- Guest experience (reservations, loyalty, feedback)
- Platform services (identity, plugin, configuration, storage)
- Reporting and analytics
- Multi-tenant, multi-brand, multi-country support

### Out of Scope
- Consumer-facing mobile ordering app (integration only)
- Payment gateway (integration only)
- Delivery logistics platform (integration only)
- HR/Payroll processing (integration only)
- Generic accounting software

---

## Success Criteria

| Criterion | Measure |
|---|---|
| Documentation foundation complete | All Phase 0 documents reach Approved status |
| Architecture is proven | ADR-0001 through ADR-0005 approved by Architecture Board |
| Domain is discovered | All Bounded Contexts documented in Context Catalog |
| Governance is operational | Architecture Board constituted and decision process active |
| Module registry initialized | At least 5 core modules registered in MODULE_REGISTRY.md |

---

## Project Phases

| Phase | Name | Entry Criteria | Exit Criteria |
|---|---|---|---|
| 0 | Enterprise Foundation | Project initiated | All docs Approved, Architecture Board active |
| 1 | Core Domain Kernel | Phase 0 complete | Core ordering, kitchen, menu modules operational |
| 2 | Platform Foundation | Phase 1 complete | Identity, plugin, config, storage operational |
| 3 | Operations | Phase 2 complete | Inventory, scheduling, reporting operational |
| 4 | Financial Engine | Phase 3 complete | Accounting, billing, tax operational |
| 5 | Enterprise Platform | Phase 4 complete | Franchise, multi-country, enterprise controls |

---

## Governance Structure

| Role | Responsibility |
|---|---|
| Product Owner | Product vision, roadmap, business requirements |
| Principal Architect | Architecture decisions, ADR authorship |
| Architecture Board | Review and approve architecture decisions |
| Domain Architects | Domain model, Bounded Context design |
| Security Architect | Threat model, security standards |
| SRE Lead | Observability, SLO, reliability |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Product Owner | Initial charter draft |
