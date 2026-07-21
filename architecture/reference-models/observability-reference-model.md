# Observability Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for observability implementation across all modules |
| **Scope**          | All modules and platform services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | OpenTelemetry is the only instrumentation standard |
| **Constraints**    | Every module endpoint must emit traces (FF-011) |
| **Risks**          | Observability not implemented; incidents hard to diagnose |
| **References**     | [OBSERVABILITY](../../docs/07-devops/OBSERVABILITY.md), [TRACING](../../docs/07-devops/TRACING.md) |
| **Related Documents** | [LOGGING](../../docs/07-devops/LOGGING.md), [METRICS](../../docs/07-devops/METRICS.md) |

---

## Module Observability Checklist

Every module must implement:

- [ ] **Traces**: OpenTelemetry span per endpoint/command/query handler
- [ ] **Metrics**: RED metrics (Rate, Errors, Duration) per endpoint
- [ ] **Logs**: Structured JSON with all mandatory fields
- [ ] **Health**: `/health/live`, `/health/ready`, `/health/startup`
- [ ] **Alerts**: SLO breach alerts for P1/P2 conditions

---

## Standard Trace Instrumentation Points

```
HTTP Request arrives →
  API Layer: create root span (http.{method}.{route})
    │
    ├── Application Layer: child span ({module}.{handler})
    │     │
    │     ├── Domain Layer: child span ({aggregate}.{operation})
    │     │
    │     └── Infrastructure Layer: child span (db.{operation})
    │
    └── Event Publishing: child span ({module}.publish.{event_type})
```

---

## Correlation IDs

| ID | Source | Propagated Via |
|---|---|---|
| `traceId` | Generated at API Gateway | W3C `traceparent` header |
| `spanId` | Generated per operation | W3C `traceparent` header |
| `correlationId` | Generated at API Gateway or client | Custom header `X-Correlation-Id` |
| `tenantId` | Extracted from JWT | Span attribute |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial observability reference model |
