# Distributed Tracing — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the distributed tracing standard using OpenTelemetry — span conventions, sampling, and propagation |
| **Scope**          | All modules and platform services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | OpenTelemetry is the standard; no proprietary tracing SDKs |
| **Constraints**    | Every HTTP request and every event handling operation must emit a trace span |
| **Risks**          | Sampling loss for rare but important operations; trace gaps between services |
| **References**     | OpenTelemetry Specification, [OBSERVABILITY](OBSERVABILITY.md) |
| **Related Documents** | [LOGGING](LOGGING.md), [METRICS](METRICS.md) |

---

## OpenTelemetry Standards

| Aspect | Standard |
|---|---|
| **SDK** | OpenTelemetry SDK (language-specific) |
| **Exporter** | OTLP (OpenTelemetry Protocol) |
| **Backend** | TBD (Jaeger / Grafana Tempo / Azure Monitor) |
| **Propagation** | W3C TraceContext standard |
| **Sampling** | Head-based: 100% in dev, 10% in production (with always-sample for errors) |

---

## Span Naming Convention

```
{module}.{operation}

Examples:
  order-module.PlaceOrder
  menu-module.PublishMenu
  kitchen-module.CreateKitchenTicket
  identity-service.ValidateToken
```

---

## Mandatory Span Attributes

Every span must include:

| Attribute | Description |
|---|---|
| `tenant.id` | Tenant context |
| `module.name` | Emitting module |
| `correlation.id` | Request correlation ID |
| `db.operation` | Database operation (if applicable) |
| `messaging.system` | Messaging system name (if event processing) |

---

## Trace Propagation

Trace context must be propagated:
- **HTTP requests**: via `traceparent` and `tracestate` headers
- **Domain events**: via `traceId` and `spanId` fields in event envelope
- **Background jobs**: create new root span linked to originating trace

---

## Error Tracing

All errors must:
1. Set span status to `ERROR`
2. Record exception with `span.recordException()`
3. Set `error.type` and `error.message` span attributes

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial tracing standard |
