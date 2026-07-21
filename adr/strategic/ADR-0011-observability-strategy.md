# ADR-0011: Observability Strategy

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the unified observability strategy — signals (logs, metrics, traces), tooling, storage, and alerting — across all modules |
| **Scope**          | All modules, platform services, and infrastructure |
| **Status**         | Draft |
| **Owner**          | SRE Lead + Principal Architect |
| **Assumptions**    | OpenTelemetry is the instrumentation standard (established in Principle 10); all modules emit all three signals; observability is not optional |
| **Constraints**    | PII must never appear in logs or traces; tenant data must not appear in shared metrics labels (cardinality explosion); trace storage retention must be cost-managed |
| **Risks**          | Observability gaps making incidents hard to diagnose; PII leaking through logs; cost explosion from high-cardinality metrics |
| **References**     | [OBSERVABILITY](../../docs/07-devops/OBSERVABILITY.md), [LOGGING](../../docs/07-devops/LOGGING.md), [TRACING](../../docs/07-devops/TRACING.md), [METRICS](../../docs/07-devops/METRICS.md) |
| **Related Documents** | [ADR-0006](ADR-0006-cloud-platform-selection.md), [ADR-0013](ADR-0013-production-operability-model.md), [Observability Reference Model](../../architecture/reference-models/observability-reference-model.md) |

---

## Context

Restaurants OS must be diagnosable in production across multiple tenants, modules, and edge devices. Incidents at a restaurant are business-critical — a POS that cannot process payments during dinner service causes immediate revenue loss. The observability system must enable rapid incident detection (< 5 minutes), rapid root cause analysis (< 15 minutes), and proactive alerting before customers are impacted.

## Problem Statement

What observability tooling, signal strategy, and alerting model should Restaurants OS adopt to ensure full production visibility across all modules, with PII safety, cost control, and rapid incident response?

---

## Alternatives Considered

### Option A: Azure Monitor + Application Insights (Native Azure)

**Pros**: Zero setup (ADR-0006 selected Azure); native AKS integration; built-in distributed tracing; log analytics workspace

**Cons**: Vendor lock-in for observability data; Application Insights SDK is not OpenTelemetry-native (though OTEL export is available); log retention cost at scale; proprietary KQL query language

---

### Option B: Grafana OSS Stack — Loki + Tempo + Mimir + Grafana (Recommended)

**Components**:
- **Grafana Loki** — log aggregation (label-based, cost-efficient, no full-text indexing by default)
- **Grafana Tempo** — distributed trace storage (object storage backend — Azure Blob)
- **Grafana Mimir** — long-term metrics storage (Prometheus-compatible)
- **Grafana** — unified dashboard and alerting UI
- **OpenTelemetry Collector** — vendor-neutral collection and routing

**Pros**:
- All OTEL-native — no SDK lock-in
- Object storage backend (Azure Blob) = low cost at scale
- Unified Grafana UI for all three signals
- Grafana is the industry standard for engineering observability
- Exportable: if cloud changes, observability stack moves with minimal effort
- Mimir/Loki/Tempo are battle-tested at large scale (used by major SaaS companies)

**Cons**:
- Requires operational management of Grafana stack (mitigated by Grafana Cloud or managed AKS deployment)
- Initial setup complexity vs. zero-setup Azure Monitor

---

### Option C: Datadog

**Pros**: All-in-one; excellent UX; strong APM

**Cons**: Very expensive at scale ($15–$31/host/month + custom metrics cost); per-seat licensing; total cost of ownership is significantly higher than OSS stack at growth stage

---

### Option D: Elastic Stack (ELK)

**Pros**: Full-text log search; mature

**Cons**: Elasticsearch is expensive at scale; not natively OTEL-aligned; Kibana UX is weaker than Grafana for metrics+traces correlation

---

## Decision

> **Instrumentation**: OpenTelemetry SDK (all modules) → OpenTelemetry Collector
> **Logs**: Grafana Loki (on AKS, Azure Blob backend)
> **Metrics**: Grafana Mimir / Prometheus (Prometheus scrape → Mimir long-term storage)
> **Traces**: Grafana Tempo (Azure Blob backend)
> **Dashboards + Alerting**: Grafana 10+
> **Azure Monitor**: Retained for AKS infrastructure metrics and Azure-level alerts only

**Signal Rules**:

| Signal | Required Fields | Retention |
|---|---|---|
| Logs | timestamp, level, message, tenantId, correlationId, traceId, spanId, module, version | 30 days hot / 1 year cold (Azure Blob) |
| Traces | traceId, spanId, parentSpanId, service.name, tenantId (attribute), correlationId | 14 days |
| Metrics | Standard Prometheus labels (no tenantId in label — use exemplars for correlation) | 13 months |

**Alerting Model**:

| Alert Type | Tool | Example |
|---|---|---|
| SLO breach (error rate) | Grafana Alerting → PagerDuty | Order placement error rate > 1% for 5 minutes |
| Latency SLO breach | Grafana Alerting → PagerDuty | p99 > 500ms for 10 minutes |
| Infrastructure health | Azure Monitor → PagerDuty | AKS node NotReady |
| Business metric anomaly | Grafana Alerting → Slack | Order volume drops 50% vs. same hour yesterday |

**PII Safety Rules**:
- `tenantId` is allowed in logs and traces (it is a system identifier, not PII)
- Customer names, emails, card data: NEVER in logs or traces
- Trace sampling: 100% for errors; 10% for normal traffic (cost management)

---

## Consequences

### Positive
- Full signal correlation in Grafana: jump from log → trace → metric in one click
- OTEL-native: no vendor lock-in on instrumentation
- Object storage backend makes trace and log retention cost-linear with volume
- Sampling reduces trace volume 90% for normal traffic

### Negative
- Grafana OSS stack requires operational management (mitigated by dedicated SRE team)
- Initial setup takes 2–3 weeks to production-ready
- Grafana Cloud (managed) is an option if operational burden is too high in Phase 1

### Neutral
- Azure Monitor is still used for AKS cluster-level and Azure resource health — not replaced

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Azure Monitor (zero-setup) vs. Grafana stack (portable, cost-efficient) | Grafana stack — portability and cost matter more than zero-setup convenience |
| 100% trace sampling vs. sampled traces | Sampled (10% normal, 100% errors) — cost management |
| Datadog (best UX) vs. Grafana (best cost) | Grafana — Datadog cost is not justified at growth stage |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Observability stack outage during incident | Low | High | Loki/Tempo/Mimir in HA mode; Azure Monitor as fallback for AKS health |
| PII leaking into logs | Medium | Critical | PII audit in CI (log scanning tool); structured log templates enforced |
| High-cardinality metrics explosion | Medium | High | No tenantId in metric labels; Mimir cardinality limits configured |
| Loki/Tempo storage cost overrun | Low | Medium | Retention policy enforced; cold tier to Azure Blob; monthly cost review |
| Missing traces for an incident | Medium | Medium | 100% error sampling ensures all failures have traces |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 10: Observe Everything | This ADR is the implementation of Principle 10 |
| Principle 5: Security by Design | PII safety rules prevent data leakage through observability |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Operability | Full signal visibility → MTTR < 15 minutes target |
| Security | PII safety rules; tenantId in traces for audit |
| Cost Efficiency | Object storage + sampling = linear cost at scale |
| Reliability | SLO alerting → proactive incident detection |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 10; Principle 5 |
| **Quality Attribute** | QAS-OPS-001 (MTTR < 15 min) |
| **Fitness Function** | FF-011 (All endpoints emit traces) |
| **Related ADRs** | ADR-0006, ADR-0007, ADR-0013 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] SRE Lead has reviewed Loki/Tempo/Mimir HA configuration
- [ ] Security Architect has reviewed PII safety rules and log scanning approach
- [ ] Cost estimate reviewed (storage + Grafana compute) at 10x and 100x tenant scale
- [ ] Alerting model reviewed: coverage of all P1/P2 conditions
- [ ] Trace sampling rate reviewed and accepted
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial draft |
