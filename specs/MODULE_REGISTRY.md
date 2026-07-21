# Module Registry — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Register all modules and bounded contexts with their implementation status, phase, and ownership |
| **Scope**          | All modules in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | No module may be implemented without being registered here |
| **Constraints**    | Status must be updated when implementation begins and completes |
| **Risks**          | Registry not maintained; undocumented modules created |
| **References**     | [Context Catalog](../docs/01-domain/10-context-catalog.md), [Domain Ownership](../docs/01-domain/09-domain-ownership.md) |
| **Related Documents** | [PROJECT_STATUS](../PROJECT_STATUS.md) |

---

## Module Registry

| Module ID | Name | Phase | Classification | Implementation Status | Documentation Status | Owner |
|---|---|---|---|---|---|---|
| MOD-001 | Menu Module | 1 | Core | Not Started | Draft | Menu Domain Lead |
| MOD-002 | Order Module | 1 | Core | Not Started | Draft | Order Domain Lead |
| MOD-003 | Kitchen Module | 1 | Core | Not Started | Draft | Kitchen Domain Lead |
| MOD-004 | Table Module | 1 | Core | Not Started | Draft | Table Domain Lead |
| MOD-010 | Identity Service | 2 | Platform | Not Started | Draft | Platform Lead |
| MOD-011 | Config Service | 2 | Platform | Not Started | Draft | Platform Lead |
| MOD-012 | Plugin Host | 2 | Platform | Not Started | Draft | Platform Lead |
| MOD-013 | Audit Service | 2 | Platform | Not Started | Draft | Platform Lead |
| MOD-020 | Inventory Module | 3 | Supporting | Not Started | Draft | Supply Domain Lead |
| MOD-021 | Guest Module | 3 | Supporting | Not Started | Draft | Guest Domain Lead |
| MOD-022 | Loyalty Module | 3 | Supporting | Not Started | Draft | Guest Domain Lead |
| MOD-023 | Analytics Module | 3 | Supporting | Not Started | Draft | Analytics Lead |
| MOD-030 | Accounting Module | 4 | Core | Not Started | Draft | Finance Domain Lead |
| MOD-031 | Tax Module | 4 | Core | Not Started | Draft | Finance Domain Lead |
| MOD-040 | Franchise Module | 5 | Core | Not Started | Draft | Franchise Domain Lead |

---

## Status Definitions

| Status | Meaning |
|---|---|
| Not Started | Phase documentation not yet Approved |
| Documentation In Progress | Phase documentation being created |
| Documentation Approved | All required ADRs and specs Approved; implementation may begin |
| Implementation In Progress | Source code being developed |
| Implementation Complete | All implementation done; in QA |
| Released | Deployed to production |
| Deprecated | Module being replaced or removed |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial module registry |
