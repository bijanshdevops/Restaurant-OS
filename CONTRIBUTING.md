# Contributing to Restaurants OS

Thank you for contributing to Restaurants OS. This document defines the standards and processes for all contributions to this repository.

---

## Governance Rule

> **No source code, project, solution, infrastructure, API contract, or database artifact may be created before the corresponding Product, Domain, Architecture, ADR, and RFC documentation reaches Approved status.**

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md).

---

## Types of Contributions

| Type | Description | Process |
|---|---|---|
| **Document** | New or updated documentation | PR with reviewer approval |
| **ADR** | Architecture Decision Record | RFC → Architecture Board review → ADR |
| **RFC** | Request for Comment | Author RFC → Community comment period → ADR |
| **Standard** | New or updated enterprise standard | RFC → Architecture Board approval |
| **Template** | New document template | PR with Architecture Board review |

---

## Branching Model

| Branch | Purpose |
|---|---|
| `main` | Approved, stable documentation |
| `draft/<topic>` | Work-in-progress documents |
| `rfc/<number>-<slug>` | Active RFC discussion |
| `adr/<number>-<slug>` | ADR being drafted |

### Rules
- Never commit directly to `main`
- All changes require a Pull Request
- PRs require at least one reviewer from [CODEOWNERS](.github/CODEOWNERS)
- Architecture-impacting changes require Architecture Board sign-off

---

## Document Quality Gate

Every document submitted must pass the quality gate defined in [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md). Required fields:

1. **Purpose** — Why this document exists
2. **Scope** — What it covers and explicitly excludes
3. **Status** — `Draft` / `In Review` / `Approved` / `Deprecated`
4. **Owner** — Responsible role or team
5. **Assumptions** — What is assumed to be true
6. **Constraints** — Limits this document operates within
7. **Risks** — Known risks associated with this content
8. **References** — External sources and standards
9. **Related Documents** — Internal cross-links (traceability)
10. **Revision History** — Date / Author / Change summary

---

## ADR Process

1. Identify a decision that needs to be made
2. Open an RFC using `templates/RFC_TEMPLATE.md` in the appropriate `rfc/` category
3. Allow minimum 5 business days for community comment
4. Architecture Board reviews and makes decision
5. Author closes the RFC and creates the ADR in the appropriate `adr/` category
6. ADR must include full traceability section

See [DECISION_PROCESS.md](governance/DECISION_PROCESS.md) for full details.

---

## Pull Request Checklist

Before submitting a PR, confirm:

- [ ] Document uses the correct template from `templates/`
- [ ] All quality gate fields are populated
- [ ] Traceability section present (for ADRs and RFCs)
- [ ] `docs/INDEX.md` updated if a new document was added
- [ ] `docs/GLOSSARY.md` updated if new terms were introduced
- [ ] `CHANGELOG.md` updated
- [ ] No source code, Docker, or infrastructure files included

---

## Style Guide

- Write in clear, professional, technical English
- Use present tense ("The system supports X", not "The system will support X")
- Use active voice
- Prefer short sentences and bullet points over long paragraphs
- All diagrams must use text-based formats (Mermaid, C4, PlantUML)
- All terms must be defined in [GLOSSARY.md](docs/GLOSSARY.md)

---

## Getting Help

- Open a GitHub Issue using the `architecture_question` template
- Contact the Architecture Board (see [ARCHITECTURE_BOARD.md](governance/ARCHITECTURE_BOARD.md))
