# Documentation Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Prescriptive standards for all documentation in the Restaurants OS repository |
| **Scope**          | All Markdown documents in `docs/`, `adr/`, `rfc/`, `architecture/`, `standards/` |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | DOCUMENTATION_STANDARD.md is the canonical reference; this summarizes the rules |
| **Constraints**    | Documentation quality gate enforced in CI |
| **Risks**          | Documentation debt; stale documents |
| **References**     | [DOCUMENTATION_STANDARD](../DOCUMENTATION_STANDARD.md) |
| **Related Documents** | [doc-template.md](../templates/doc-template.md), [ADR_TEMPLATE.md](../templates/ADR_TEMPLATE.md) |

---

## Mandatory Front-Matter Fields

Every document must contain all 9 mandatory fields in its front-matter table:

| Field | Required |
|---|---|
| Purpose | ✅ |
| Scope | ✅ |
| Status | ✅ |
| Owner | ✅ |
| Assumptions | ✅ |
| Constraints | ✅ |
| Risks | ✅ |
| References | ✅ |
| Related Documents | ✅ |

---

## Status Values

| Status | Meaning |
|---|---|
| `Draft` | Work in progress; not authoritative |
| `In Review` | Under Architecture Board review |
| `Approved` | Binding and authoritative |
| `Deprecated` | Superseded; do not use |
| `Archived` | Historical record only |
| `Living Document` | Continuously maintained; always current |

---

## Revision History Requirement

Every document must include a Revision History table at the bottom:

```markdown
## Revision History

| Date | Author | Change |
|---|---|---|
| YYYY-MM-DD | Role | Description of change |
```

---

## Documentation Quality Gate

The CI pipeline validates:
- [ ] All 9 front-matter fields present and non-empty
- [ ] Status is a valid value
- [ ] Revision History table exists and has at least one entry
- [ ] ADR files have the Traceability section

---

## Writing Style

- Use present tense for standards, decisions, and principles
- Use past tense for ADRs/RFCs discussing history
- Be direct and concise; avoid passive voice where possible
- Use tables for comparative or structured information

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial documentation standards |
