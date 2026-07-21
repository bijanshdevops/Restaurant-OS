# Observability Strategy — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the overall observability strategy for Restaurants OS |
| **Scope**          | All modules, platform services, and infrastructure |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | The three pillars of observability (logs, metrics, traces) are all required |
| **Constraints**    | OpenTelemetry is the only approved instrumentation standard |
| **Risks**          | Observability gaps in critical paths; high cardinality metrics |
| **References**     | [LOGGING](LOGGING.md), [TRACING](TRACING.md), [METRICS](METRICS.md) |
| **Related Documents** | [SRE](SRE.md), [HEALTH_CHECKS](HEALTH_CHECKS.md) |

---

## Three Pillars

| Pillar | Standard | Document |
|---|---|---|
| Logs | Structured JSON, OpenTelemetry Logging | [LOGGING.md](LOGGING.md) |
| Metrics | OpenTelemetry Metrics, Prometheus format | [METRICS.md](METRICS.md) |
| Traces | OpenTelemetry Traces, W3C TraceContext | [TRACING.md](TRACING.md) |

All three pillars must be correlated via `traceId` and `correlationId`.

---

## Observability Tooling Stack (Target)

| Component | Tooling (TBD) |
|---|---|
| Metrics storage | Prometheus / Grafana Mimir |
| Trace backend | Grafana Tempo / Jaeger |
| Log aggregation | Grafana Loki / Elasticsearch |
| Dashboards | Grafana |
| Alerting | Alertmanager / PagerDuty |
| Collector | OpenTelemetry Collector |

---

## Fitness Function: Observability Coverage

- FF-011: Every module endpoint must emit traces
- All services must expose RED metrics
- Alert coverage must span all P1/P2 SLO breach conditions

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial observability strategy |
