# Repository Rules — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define binding repository-wide governance rules for all contributors |
| **Scope**          | This entire repository and all future sub-repositories under Restaurants OS |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | All contributors are onboarded and have read these rules |
| **Constraints**    | Rules must be enforceable via PR process and CODEOWNERS |
| **Risks**          | Rule violations that go undetected can create technical or governance debt |
| **References**     | [CONTRIBUTING.md](CONTRIBUTING.md), [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) |
| **Related Documents** | [governance/DECISION_PROCESS.md](governance/DECISION_PROCESS.md), [governance/RELEASE_POLICY.md](governance/RELEASE_POLICY.md) |

---

## Absolute Governance Rule

> **No source code, project, solution, infrastructure, API contract, or database artifact may be created before the corresponding Product, Domain, Architecture, ADR, and RFC documentation reaches Approved status.**

This rule is **non-negotiable** and applies to all contributors, teams, and phases of the Restaurants OS project.

---

## Folder Ownership

| Folder | Owner | Review Required |
|---|---|---|
| `docs/00-product/` | Product Owner | Product Owner + Architecture Board |
| `docs/01-domain/` | Domain Architects | Domain Lead + Architecture Board |
| `docs/02-architecture/` | Principal Architect | Architecture Board |
| `docs/03-security/` | Security Architect | Security Lead + Architecture Board |
| `docs/04-platform/` | Platform Lead | Platform Lead + Architecture Board |
| `docs/05-api/` | API Guild | API Guild Lead + Architecture Board |
| `docs/06-ui/` | UI Lead | UI Lead |
| `docs/07-devops/` | SRE Lead | SRE Lead + Architecture Board |
| `docs/08-quality/` | Quality Lead | Architecture Board |
| `docs/09-decisions/` | Architecture Board | Architecture Board |
| `adr/` | Architecture Board | Architecture Board (minimum 2 reviewers) |
| `rfc/` | RFC Author | Architecture Board + Community |
| `governance/` | Architecture Board | Architecture Board (unanimous) |
| `standards/` | Architecture Board | Architecture Board |
| `architecture/` | Principal Architect | Architecture Board |
| `templates/` | Architecture Board | Architecture Board |

---

## Branching Rules

| Rule | Detail |
|---|---|
| No direct commits to `main` | All changes via Pull Request |
| Branch naming | `draft/<topic>`, `rfc/<NNN>-slug`, `adr/<NNN>-slug` |
| PR requires minimum 1 approver | As defined in `.github/CODEOWNERS` |
| Architecture-impacting changes | Require Architecture Board sign-off |
| Breaking standard changes | Require unanimous Architecture Board vote |

---

## Document Lifecycle Rules

| Rule | Detail |
|---|---|
| New documents start as `Draft` | No document may be created in `Approved` state |
| `Approved` status requires review | Minimum 2 reviewers from the owning team |
| Documents may not be deleted | They must be `Deprecated` with a superseding reference |
| `Deprecated` documents remain visible | Moved to end of index with `[DEPRECATED]` prefix |
| Revision History is mandatory | Every PR that changes a document updates Revision History |

---

## Naming Policy

See [standards/naming-conventions.md](standards/naming-conventions.md) for full naming conventions.

Summary:
- Files: `kebab-case.md` or `UPPER_SNAKE_CASE.md`
- ADRs: `ADR-NNNN-short-descriptive-title.md` (global sequence)
- RFCs: `RFC-NNNN-short-descriptive-title.md` (global sequence)
- Directories: `NN-category-name` for numbered, `kebab-case` for unnumbered

---

## Quality Gate Rules

Every document submitted via PR must:

- [ ] Contain all 10 required front-matter fields
- [ ] Have a Revision History section updated
- [ ] Reference any new terms in `docs/GLOSSARY.md`
- [ ] Update `docs/INDEX.md` if it is a new document
- [ ] Include a Traceability section (ADRs and RFCs only)
- [ ] Contain no source code, Docker, or infrastructure artifacts

---

## Review Workflow

1. Author creates branch and document
2. Author self-reviews against quality gate checklist
3. Author opens Pull Request using `.github/pull_request_template.md`
4. CODEOWNERS are automatically assigned
5. Minimum review period: 2 business days for non-urgent changes
6. Architecture Board reviews all ADRs, RFCs, and governance documents
7. After approval, author merges and updates `CHANGELOG.md`

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial creation and approval |
