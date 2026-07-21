# Logging Standard — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the structured logging standard — format, levels, correlation, PII masking, and retention |
| **Scope**          | All modules and platform services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | Structured JSON logging is the standard; no unstructured text logs |
| **Constraints**    | PII must never appear in logs; correlation IDs must always be present |
| **Risks**          | PII leakage in logs; missing correlation IDs making traces unresolvable |
| **References**     | [OBSERVABILITY](OBSERVABILITY.md), OpenTelemetry Logging Specification |
| **Related Documents** | [TRACING](TRACING.md), [Audit](../03-security/Audit.md) |

---

## Log Format

All logs must be emitted as structured JSON:

```json
{
  "timestamp": "2026-07-08T21:00:00.000Z",
  "level": "INFO",
  "message": "Order placed successfully",
  "tenantId": "acme-group",
  "correlationId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "module": "order-module",
  "orderId": "ORD-12345",
  "version": "1.2.0"
}
```

---

## Log Levels

| Level | Use |
|---|---|
| `TRACE` | Detailed diagnostic; development only |
| `DEBUG` | Diagnostic; not enabled in production by default |
| `INFO` | Normal operations; expected state changes |
| `WARN` | Unexpected but recoverable situations |
| `ERROR` | Errors requiring attention; operation failed |
| `FATAL` | Critical failure; application cannot continue |

---

## Mandatory Fields

All log entries must include:

| Field | Description |
|---|---|
| `timestamp` | UTC ISO-8601 |
| `level` | Log level |
| `message` | Human-readable event description |
| `tenantId` | Tenant context (if in request scope) |
| `correlationId` | Request correlation ID |
| `traceId` | OpenTelemetry trace ID |
| `module` | Emitting module name |

---

## PII Masking Rules

The following data types must NEVER appear in logs:

- Customer names → replace with guest ID only
- Email addresses → mask as `***@***.***`
- Phone numbers → last 4 digits only: `***-***-1234`
- Payment card numbers → never log; log last 4 digits max
- Tax identification numbers → never log
- Passwords, secrets, tokens → never log

---

## Retention

| Log Type | Retention |
|---|---|
| Application logs (INFO+) | 90 days |
| Security/audit logs | 2 years |
| Debug/trace logs | 14 days |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial logging standard |
