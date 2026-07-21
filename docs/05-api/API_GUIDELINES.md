# API Guidelines — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define API design guidelines for all REST and async APIs in Restaurants OS |
| **Scope**          | All internal and external APIs |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | REST for synchronous; events for async; no RPC between modules |
| **Constraints**    | APIs must be versioned from the first release; no breaking changes without version increment |
| **Risks**          | API proliferation; undocumented APIs; breaking change without notice |
| **References**     | REST API Design (Masse), [VERSIONING](VERSIONING.md), [ERROR_HANDLING](ERROR_HANDLING.md) |
| **Related Documents** | [EVENT_CONVENTIONS](EVENT_CONVENTIONS.md), [standards/api-standards.md](../../standards/api-standards.md) |

---

## REST API Design Principles

### URL Design

```
GET    /v1/tenants/{tenantId}/menus
POST   /v1/tenants/{tenantId}/menus
GET    /v1/tenants/{tenantId}/menus/{menuId}
PUT    /v1/tenants/{tenantId}/menus/{menuId}
DELETE /v1/tenants/{tenantId}/menus/{menuId}
POST   /v1/tenants/{tenantId}/menus/{menuId}/publish
```

Rules:
- Use nouns, not verbs (except for RPC-style actions with `POST`)
- Plural resource names: `/menus`, `/orders`
- Use kebab-case for multi-word segments
- Tenant scope in URL for all tenant-scoped resources
- Version prefix: `/v1/`, `/v2/`

---

## HTTP Methods

| Method | Use | Idempotent | Body |
|---|---|---|---|
| GET | Retrieve resource | Yes | No |
| POST | Create resource or execute action | No | Yes |
| PUT | Replace resource completely | Yes | Yes |
| PATCH | Partial update | No | Yes |
| DELETE | Remove resource | Yes | No |

---

## Response Format

All responses must use consistent envelope format:

```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "page": 1,
    "pageSize": 50,
    "totalCount": 200
  }
}
```

Errors follow [ERROR_HANDLING.md](ERROR_HANDLING.md) — RFC 7807 Problem Details.

---

## Pagination

- Default page size: 50
- Maximum page size: 200
- Cursor-based pagination for large collections

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial API guidelines |
