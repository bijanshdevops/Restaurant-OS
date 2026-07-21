# Coding Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Prescriptive coding standards extending the language-agnostic CODING_STANDARD.md |
| **Scope**          | All source code |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Language-specific linting enforces these rules in CI |
| **Constraints**    | Deviations require Architecture Board approval |
| **Risks**          | Inconsistent code quality across modules |
| **References**     | [CODING_STANDARD](../docs/08-quality/CODING_STANDARD.md), Clean Code (Martin) |
| **Related Documents** | [QUALITY_GATE](../docs/08-quality/QUALITY_GATE.md) |

---

## Code Organization Standards

| Rule | Standard |
|---|---|
| File per type | One public type per file |
| File naming | Matches the primary type name |
| Namespace | Mirrors directory structure |
| Module root | `{Tenant}.{Module}` namespace |

---

## Clean Architecture Enforcement

| Layer | Allowed imports | Prohibited |
|---|---|---|
| Domain | Nothing external | Framework, ORM, infrastructure |
| Application | Domain only | Infrastructure, framework controllers |
| Infrastructure | Domain + Application | — |
| API | Application only | Direct domain, infrastructure |

This is enforced by FF-002 and FF-008 in the CI pipeline.

---

## Test Standards

| Rule | Standard |
|---|---|
| Unit test scope | Domain layer only; no infrastructure |
| Integration test scope | Application + Infrastructure |
| Test naming | `{Method}_{Scenario}_{Expected}` |
| Mocking | Infrastructure dependencies mocked in unit tests |
| Test data | Use builder pattern; no magic values |
| Coverage gate | Domain layer ≥ 90% (FF-009) |

---

## Code Review Standards

Every PR requires:
- [ ] Two approvals from domain-knowledgeable reviewers
- [ ] Architecture review if cross-cutting changes (new event, new module, new API)
- [ ] All CI gates passing
- [ ] CHANGELOG updated if user-visible change

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial coding standards |
