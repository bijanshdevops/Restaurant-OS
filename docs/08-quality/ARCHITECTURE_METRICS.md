# Architecture Metrics — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define measurable architecture KPIs for coupling, cohesion, complexity, and operational health |
| **Scope**          | All modules and their inter-relationships |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Metrics are collected automatically in CI pipeline |
| **Constraints**    | Metrics must be objective and tool-measurable |
| **Risks**          | Metrics collected but not acted upon; gaming metrics without improving quality |
| **References**     | [Architecture Fitness Functions](ARCHITECTURE_FITNESS_FUNCTIONS.md), [QUALITY_GATE](QUALITY_GATE.md) |
| **Related Documents** | [Architecture Drivers](../02-architecture/03-architecture-drivers.md) |

---

## Coupling Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Afferent Coupling (Ca)** | Number of modules that depend on this module | — | > 5 for any single module |
| **Efferent Coupling (Ce)** | Number of modules this module depends on | ≤ 3 | > 5 |
| **Instability (I = Ce / Ca+Ce)** | 0 = stable, 1 = unstable | Domain: < 0.2, Infrastructure: > 0.8 | Violation of clean architecture direction |
| **Cross-module event fan-out** | Subscribers per event | ≤ 8 (FF-012) | > 8 |

---

## Cohesion Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **LCOM (Lack of Cohesion)** | Degree to which methods share fields in a class | Low | High LCOM in domain classes |
| **Module size (lines)** | Total lines of code per module | < 10,000 | > 15,000 (consider splitting) |
| **Aggregate child count** | Entities within one aggregate | ≤ 10 (FF-006) | > 10 |

---

## Complexity Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Cyclomatic Complexity** | Number of linearly independent paths | ≤ 10 per method | > 15 |
| **Cognitive Complexity** | Human-perceived complexity | ≤ 15 per method | > 25 |
| **Synchronous Call Depth** | Max call chain depth in single request | ≤ 5 (FF-003) | > 5 |
| **Infrastructure class complexity** | Cyclomatic complexity in infrastructure | ≤ 3 (FF-005) | > 3 |

---

## Testability Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Domain layer coverage** | % of domain code covered by tests | ≥ 90% (FF-009) | < 90% |
| **Test ratio** | Test lines / Production lines | ≥ 1.0 | < 0.5 |
| **Test build time** | Duration of full test suite | < 5 minutes | > 10 minutes |

---

## Module Dependency Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Dependency cycles** | Circular dependencies between modules | 0 (FF-007) | > 0 |
| **Architecture violations** | Violations of Clean Architecture layer rules | 0 (FF-008) | > 0 |
| **Hardcoded tenant IDs** | Tenant IDs in source code | 0 (FF-010) | > 0 |

---

## Operational Metrics (via CI/CD)

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Build time** | Time from commit to artifact | < 5 minutes | > 10 minutes |
| **MTTR** | Mean Time to Recovery | < 15 minutes | > 30 minutes |
| **Deployment frequency** | Deployments per week | ≥ 3 | < 1 |
| **Change failure rate** | % of deployments causing incidents | < 5% | > 15% |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial architecture metrics catalog |
