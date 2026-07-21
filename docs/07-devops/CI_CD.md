# CI/CD — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the CI/CD pipeline design, quality gates, and promotion strategy |
| **Scope**          | All source code and documentation pipelines |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | GitHub Actions or equivalent; documentation-only pipeline for Phase 0 |
| **Constraints**    | No deployment may occur without passing all quality gates |
| **Risks**          | Pipeline bypassing; flaky tests reducing trust |
| **References**     | [QUALITY_GATE](../08-quality/QUALITY_GATE.md), [OBSERVABILITY](OBSERVABILITY.md) |
| **Related Documents** | [DISASTER_RECOVERY](DISASTER_RECOVERY.md), [Architecture Fitness Functions](../08-quality/ARCHITECTURE_FITNESS_FUNCTIONS.md) |

---

## Pipeline Stages

```
┌────────────┐   ┌────────────┐   ┌─────────────┐   ┌───────────┐   ┌──────────┐
│   Commit   │──►│   Build    │──►│    Test     │──►│  Analyze  │──►│  Deploy  │
│   Trigger  │   │ Compile    │   │ Unit        │   │ Coverage  │   │  to Env  │
└────────────┘   │ Lint       │   │ Integration │   │ SAST      │   └──────────┘
                 │ Deps check │   │ E2E         │   │ Fitness   │
                 └────────────┘   │ Contract    │   │ Functions │
                                  └─────────────┘   │ Arch check│
                                                     └───────────┘
```

---

## Quality Gate (Per Stage)

### Build Gate
- [ ] Compilation succeeds
- [ ] No dependency vulnerabilities (OWASP dependency check)
- [ ] Linting passes (code style, naming conventions)

### Test Gate
- [ ] All unit tests pass
- [ ] Domain layer coverage ≥ 90%
- [ ] All integration tests pass
- [ ] Contract tests pass (event consumers)

### Analysis Gate
- [ ] SAST scan: no HIGH or CRITICAL findings
- [ ] Architecture fitness functions: zero violations
  - FF-001: No cross-module database access
  - FF-002: Domain layer clean dependency
  - FF-007: No circular module dependencies
- [ ] No hardcoded tenant IDs (FF-010)
- [ ] Documentation quality gate: all new docs have required fields

### Deploy Gate
- [ ] All previous gates passed
- [ ] Health checks pass on target environment
- [ ] Smoke tests pass
- [ ] Rollback plan documented

---

## Environments

| Environment | Trigger | Auto-Deploy | Approval |
|---|---|---|---|
| `dev` | Every PR merge to `main` | Yes | No |
| `staging` | Tag `v*.*.0-rc.*` | Yes | No |
| `production` | Tag `v*.*.*` | No | Architecture Board sign-off |

---

## Rollback Strategy

- Blue-green deployment: instant rollback by switching traffic
- Database migrations: backward-compatible only; rollback by re-pointing traffic
- Event contracts: old version supported in parallel; no rollback needed

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial CI/CD pipeline design |
