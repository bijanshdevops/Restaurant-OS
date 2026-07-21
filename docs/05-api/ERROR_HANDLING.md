# Error Handling — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the standard error model for all APIs in Restaurants OS |
| **Scope**          | All REST APIs |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | RFC 7807 Problem Details is the standard error format |
| **Constraints**    | No stack traces in production error responses; no internal details exposed |
| **Risks**          | Inconsistent error formats; information disclosure through error messages |
| **References**     | RFC 7807 (Problem Details for HTTP APIs), [API_GUIDELINES](API_GUIDELINES.md) |
| **Related Documents** | [ThreatModel](../03-security/ThreatModel.md) |

---

## Error Response Format (RFC 7807)

```json
{
  "type": "https://restaurants-os.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order 'ORD-12345' does not exist in tenant 'acme-group'.",
  "instance": "/v1/tenants/acme-group/orders/ORD-12345",
  "correlationId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "timestamp": "2026-07-08T21:00:00Z"
}
```

---

## HTTP Status Code Usage

| Code | Use |
|---|---|
| 200 | Success — resource returned |
| 201 | Created — new resource created |
| 204 | Success — no content |
| 400 | Bad Request — validation error |
| 401 | Unauthorized — authentication required |
| 403 | Forbidden — authenticated but not authorized |
| 404 | Not Found |
| 409 | Conflict — optimistic concurrency, duplicate |
| 422 | Unprocessable Entity — business rule violation |
| 429 | Too Many Requests — rate limit |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Domain Error Codes

All domain errors have a stable `type` URI:

```
https://restaurants-os.com/errors/{error-code}
```

| Error Code | HTTP | Description |
|---|---|---|
| `order-not-found` | 404 | Order does not exist |
| `order-already-completed` | 409 | Cannot modify a completed order |
| `menu-not-published` | 422 | Ordering against unpublished menu |
| `payment-amount-mismatch` | 422 | Payment does not balance to order total |
| `tenant-not-authorized` | 403 | Tenant access denied |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial error handling standard |
