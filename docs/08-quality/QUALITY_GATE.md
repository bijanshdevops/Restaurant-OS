# Quality Gate — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the automated and manual quality gates applied at each stage of the pipeline |
| **Scope**          | All CI/CD pipeline stages |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Gates are enforced in CI; failures block promotion |
| **Constraints**    | No gate may be bypassed without Architecture Board approval and incident record |
| **Risks**          | Gate bypass becoming normalized |
| **References**     | [CI_CD](../07-devops/CI_CD.md), [Architecture Fitness Functions](ARCHITECTURE_FITNESS_FUNCTIONS.md) |
| **Related Documents** | [ARCHITECTURE_REVIEW_CHECKLIST](ARCHITECTURE_REVIEW_CHECKLIST.md) |

---

## Gate Levels

### Gate 1 — Commit Gate (< 2 minutes)
Runs on every commit to any branch.

| Check | Tool | Threshold |
|---|---|---|
| Code compilation | Build tool | Zero errors |
| Code formatting | Linter | Zero violations |
| Secret detection | Gitleaks / truffleHog | Zero secrets detected |
| Naming convention (events) | Custom rule | Zero violations (FF-004) |

### Gate 2 — PR Gate (< 10 minutes)
Runs on every Pull Request.

| Check | Tool | Threshold |
|---|---|---|
| Unit tests | Test runner | 100% pass |
| Domain coverage | Coverage tool | ≥ 90% (FF-009) |
| Architecture rules | ArchUnit / NetArchTest | Zero violations (FF-001, FF-002, FF-007, FF-008) |
| Dependency check | OWASP Dependency Check | No HIGH/CRITICAL |
| Documentation fields | Custom script | All required fields present |

### Gate 3 — Integration Gate (< 20 minutes)
Runs on merge to `main`.

| Check | Tool | Threshold |
|---|---|---|
| Integration tests | Test runner | 100% pass |
| Contract tests | Pact / equivalent | 100% pass |
| E2E smoke tests | Playwright / equivalent | 100% pass |
| SAST scan | Semgrep / SonarQube | No HIGH/CRITICAL |
| Fitness functions | Custom | Zero violations (all FFs) |

### Gate 4 — Release Gate (manual)
Required before production deployment.

| Check | Tool | Threshold |
|---|---|---|
| Architecture Board sign-off | Manual | Approved |
| All previous gates | — | Passed |
| Rollback plan | Manual | Documented |
| Communication plan | Manual | Prepared |

---

## Documentation Quality Gate

Applied to every document PR:

| Field | Check |
|---|---|
| Purpose | Present and non-empty |
| Scope | Present and non-empty |
| Status | Valid value |
| Owner | Present |
| Assumptions | Present |
| Constraints | Present |
| Risks | Present |
| References | Present |
| Related Documents | Present |
| Revision History | Updated with PR date |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial quality gate definition |
