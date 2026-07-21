# SRE — Site Reliability Engineering — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define SLI/SLO/SLA targets, error budget policy, toil reduction strategy, and on-call policy |
| **Scope**          | All production services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | SRE principles (Google SRE book) are adopted |
| **Constraints**    | SLOs must be technically achievable; do not set aspirational SLOs |
| **Risks**          | SLO violations not acted upon; error budget exhausted before month end |
| **References**     | Google SRE Book, [METRICS](METRICS.md), [OBSERVABILITY](OBSERVABILITY.md) |
| **Related Documents** | [HEALTH_CHECKS](HEALTH_CHECKS.md), [DISASTER_RECOVERY](DISASTER_RECOVERY.md) |

---

## SLI / SLO / SLA Definitions

### Order Module

| SLI | SLO | SLA |
|---|---|---|
| % of order creation requests succeeding | 99.9% per month | 99.5% (contractual) |
| p99 order creation latency < 300ms | 99% of requests | — |
| Offline operation continuity | 100% core ops without network | 100% (contractual for POS) |

### Platform Services (Identity, Config)

| SLI | SLO | SLA |
|---|---|---|
| Identity service availability | 99.99% per month | 99.9% |
| Config service availability | 99.9% per month | 99.5% |

---

## Error Budget Policy

**Error budget** = 1 - SLO = allowed downtime per period.

| SLO | Monthly error budget |
|---|---|
| 99.9% | 43.8 minutes |
| 99.99% | 4.4 minutes |

**Policy**:
- If error budget > 50% remaining: continue normal development velocity
- If error budget 25–50% remaining: prioritize reliability work, slow feature work
- If error budget < 25% remaining: freeze feature work, full focus on reliability
- If error budget exhausted: no new releases until next period

---

## On-Call Policy

| Severity | Response Time | Who |
|---|---|---|
| P1 — Critical (SLO breach) | 15 minutes | On-call SRE + escalation |
| P2 — High (degraded service) | 1 hour | On-call SRE |
| P3 — Medium (non-critical issue) | Next business day | Team |
| P4 — Low (informational) | Sprint backlog | Team |

---

## MTTR Target

- **P1**: MTTR < 15 minutes
- **P2**: MTTR < 2 hours
- All incidents are post-mortemed within 48 hours of resolution.

---

## Toil Reduction

Track operational toil quarterly. Target: toil < 50% of SRE team capacity.

Toil categories:
- Manual deployment steps → automate
- Manual monitoring checks → automate with alerts
- Repetitive incident remediation → runbooks + automation

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial SRE document |
