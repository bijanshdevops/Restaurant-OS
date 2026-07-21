# Architecture Repository — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Root of the architecture assets repository — reusable principles, constraints, decisions, and reference models |
| **Scope**          | All reusable architecture assets |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Narrative documentation lives in `docs/`; reusable assets live in `architecture/` |
| **Constraints**    | Assets here must be technology-agnostic; technology choices are in ADRs |
| **Risks**          | Duplication between `docs/` and `architecture/`; inconsistency |
| **References**     | [docs/02-architecture/](../docs/02-architecture/), [ARCHITECTURE.md](../ARCHITECTURE.md) |

---

## Structure

```
architecture/
  principles/         ← Binding architecture principles (canonical)
  constraints/        ← Hard constraints that may not be violated
  decisions/          ← Cross-cutting decision records
  reference-models/   ← Canonical reference models for all domains
```

---

## How This Relates to docs/

- `docs/02-architecture/` contains **narrative documentation** explaining the architecture to readers
- `architecture/` contains **canonical reusable assets** referenced by ADRs, modules, and reviews

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial README |
