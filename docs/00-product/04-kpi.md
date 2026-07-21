# KPI — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define measurable success metrics for Restaurants OS across product, technical, and business dimensions |
| **Scope**          | All phases of the project; updated per phase |
| **Status**         | Draft |
| **Owner**          | Product Owner |
| **Assumptions**    | KPIs are measurable from day one of operation |
| **Constraints**    | KPIs must align with business outcomes, not just technical metrics |
| **Risks**          | Vanity metrics selected over outcome metrics |
| **References**     | [Product Vision](00-product-vision.md), [SRE](../07-devops/SRE.md) |
| **Related Documents** | [Architecture Metrics](../08-quality/ARCHITECTURE_METRICS.md), [Roadmap](05-roadmap.md) |

---

## Phase 0 KPIs

| KPI | Target | Measurement |
|---|---|---|
| Documents reaching Approved status | 100% by Phase 0 end | Status field in each doc |
| ADRs approved | 5 | Count of Approved ADRs |
| Architecture Board quorum | Achieved | Board minutes |
| Context Catalog completeness | ≥5 contexts defined | MODULE_REGISTRY count |

## Product KPIs (Phase 1+)

| KPI | Target | Measurement |
|---|---|---|
| Time to onboard single restaurant | < 1 business day | Implementation time |
| Time to onboard chain (per location) | < 2 hours | Tenant provisioning time |
| System availability | 99.9% monthly | SLO — see SRE.md |
| Order processing latency (p99) | < 300ms | Distributed tracing |
| Offline resilience | 100% core ops without network | E2E test coverage |

## Architecture KPIs

| KPI | Target | Measurement |
|---|---|---|
| Module coupling score | < 0.3 per module | Architecture Metrics |
| Test coverage (core domain) | > 90% | CI pipeline |
| Build time | < 5 minutes | CI pipeline |
| MTTR (Mean Time to Recovery) | < 15 minutes | Incident reports |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Product Owner | Initial KPI draft |
