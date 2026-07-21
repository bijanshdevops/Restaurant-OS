# Logging Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Prescriptive logging standards — format, mandatory fields, PII masking, and levels |
| **Scope**          | All modules and platform services |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Structured JSON logging; OpenTelemetry integration |
| **Constraints**    | PII must never appear in logs; violations are security incidents |
| **Risks**          | PII leakage; unstructured logs; missing correlation IDs |
| **References**     | [LOGGING](../docs/07-devops/LOGGING.md) |
| **Related Documents** | [security-standards.md](security-standards.md) |

---

## Mandatory Rules

| Rule | Standard |
|---|---|
| Format | Structured JSON only — no unstructured text |
| Correlation | `correlationId` and `traceId` mandatory on every log entry |
| Tenant context | `tenantId` mandatory in all request-scoped logs |
| PII | Never log: names, emails, phone, payment data, passwords, tokens |
| Level usage | INFO for normal ops; WARN for unexpected-but-recoverable; ERROR for failures |
| Production debug | DEBUG not enabled in production by default; requires incident approval |

---

## Mandatory Fields Reference

```json
{
  "timestamp": "ISO-8601 UTC",
  "level": "INFO|WARN|ERROR|DEBUG|TRACE|FATAL",
  "message": "Human-readable event description",
  "tenantId": "string",
  "correlationId": "uuid",
  "traceId": "hex-string",
  "spanId": "hex-string",
  "module": "module-name",
  "version": "semver"
}
```

Additional fields are allowed but must not contain PII.

---

## PII Masking Quick Reference

| Data Type | Logging Rule |
|---|---|
| Customer name | Log `guestId` only |
| Email | Never log; log `actorId` only |
| Phone | Never log |
| Card number | Never log; log last 4 and card type only |
| Password / Token / Secret | Never log |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial logging standards |
