# Specifications — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Root of the specifications directory — detailed technical specifications for modules and interfaces |
| **Scope**          | All formal specifications that drive implementation |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Specifications require Approved ADRs before being written |
| **Constraints**    | No implementation without an Approved specification |
| **Risks**          | Specifications not kept current |
| **References**     | [MODULE_REGISTRY](MODULE_REGISTRY.md) |

---

## Contents

| Document | Description |
|---|---|
| [MODULE_REGISTRY.md](MODULE_REGISTRY.md) | Registry of all modules with status and ownership |
| `events/` | JSON Schema files for all domain events |
| `api/` | OpenAPI specifications for all REST APIs |

---

## Specification Lifecycle

```
ADR Approved → Specification Draft → Specification Review → Specification Approved → Implementation Begins
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial README |
