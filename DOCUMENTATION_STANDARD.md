# Documentation Standard — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the mandatory documentation standard and quality gate for all Restaurants OS documents |
| **Scope**          | All documents in this repository without exception |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | All contributors read and acknowledge this standard |
| **Constraints**    | Standard must be achievable without specialist tooling |
| **Risks**          | Inconsistent adoption reduces document quality and traceability |
| **References**     | [CONTRIBUTING.md](CONTRIBUTING.md), [REPOSITORY_RULES.md](REPOSITORY_RULES.md) |
| **Related Documents** | [templates/doc-template.md](templates/doc-template.md) |

---

## Quality Gate — Mandatory Fields

Every document in this repository **must** contain the following front-matter table immediately after the title:

```markdown
| Field              | Value |
|--------------------|-------|
| **Purpose**        | Why this document exists |
| **Scope**          | What it covers and explicitly excludes |
| **Status**         | Draft / In Review / Approved / Deprecated |
| **Owner**          | Role or team responsible |
| **Assumptions**    | What is assumed to be true |
| **Constraints**    | Limits this document operates within |
| **Risks**          | Known risks associated with this content |
| **References**     | External sources and standards |
| **Related Documents** | Internal cross-links |
```

Every document must also end with a **Revision History** section:

```markdown
## Revision History

| Date | Author | Change |
|---|---|---|
| YYYY-MM-DD | Role | Description |
```

---

## Document Status Lifecycle

```
Draft ──► In Review ──► Approved ──► Deprecated
  │                          │
  └──────── Rejected ─────────┘
```

| Status | Meaning |
|---|---|
| **Draft** | Being authored; not ready for review |
| **In Review** | Submitted for Architecture Board review |
| **Approved** | Formally accepted; binding |
| **Deprecated** | Superseded; kept for reference |
| **Rejected** | Not accepted; archived with reason |

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Document files | `kebab-case.md` or `UPPER_SNAKE.md` | `01-core-domains.md`, `API_GUIDELINES.md` |
| ADR files | `ADR-NNNN-short-title.md` | `ADR-0001-modular-monolith-first.md` |
| RFC files | `RFC-NNNN-short-title.md` | `RFC-0001-platform-architecture-overview.md` |
| Directories | `kebab-case` or `NN-name` | `01-domain/`, `reference-models/` |

---

## Traceability Requirement

ADRs and RFCs must include a **Traceability** section linking:

- Product Vision → `docs/00-product/00-product-vision.md`
- Business Capability → `docs/00-product/06-business-capability-map.md`
- Domain → `docs/01-domain/`
- Architecture Principle → `docs/02-architecture/00-architecture-principles.md`
- Quality Attribute → `docs/02-architecture/00-quality-attribute-scenarios.md`
- Related ADRs
- Related RFCs

---

## Diagram Standard

All architectural diagrams must use text-based formats:

| Tool | Use Case |
|---|---|
| Mermaid | Flow diagrams, sequence diagrams, ER diagrams |
| C4 (textual) | System context, container, component views |
| PlantUML | UML diagrams |

No image-only diagrams. Source must be version-controlled.

---

## Glossary Requirement

Any term that is not universally understood must be defined in [`docs/GLOSSARY.md`](docs/GLOSSARY.md) and referenced using a link.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial approval |
