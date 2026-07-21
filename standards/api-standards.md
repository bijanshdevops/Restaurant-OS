# API Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Enterprise API standards — prescriptive rules for all REST and async APIs |
| **Scope**          | All REST APIs and event contracts |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | REST is the synchronous standard; events are the async standard |
| **Constraints**    | All public APIs must have OpenAPI specification before implementation |
| **Risks**          | API proliferation without governance |
| **References**     | [API_GUIDELINES](../docs/05-api/API_GUIDELINES.md), [VERSIONING](../docs/05-api/VERSIONING.md) |
| **Related Documents** | [event-standards.md](event-standards.md) |

---

## REST Standards

| Rule | Standard |
|---|---|
| URL design | Nouns, plural, kebab-case, tenant-scoped |
| HTTP methods | Semantic use: GET (read), POST (create/action), PUT (replace), PATCH (partial), DELETE |
| Versioning | URI prefix: `/v1/`, `/v2/` |
| Pagination | Cursor-based; default 50, max 200 per page |
| Error format | RFC 7807 Problem Details |
| Response envelope | `{ "data": {}, "meta": {} }` |
| Authentication | Bearer JWT required on all endpoints |
| Tenant scope | `tenantId` always in URL for tenant-scoped resources |

---

## OpenAPI Requirements

Every REST API must have:
- [ ] OpenAPI 3.0+ specification
- [ ] All paths, methods, parameters, and responses documented
- [ ] Error responses documented (400, 401, 403, 404, 422, 500)
- [ ] Schema references — no inline schemas for reused types
- [ ] Examples provided for all request and response bodies

---

## Event API Standards

See [event-standards.md](event-standards.md).

---

## Deprecation Standards

- Deprecated endpoints return `Deprecation` and `Sunset` HTTP headers
- Minimum 6-month parallel support before removal
- Consumers notified at deprecation and again 1 month before sunset

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial API standards |
