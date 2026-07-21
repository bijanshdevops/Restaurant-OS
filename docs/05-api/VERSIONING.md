# API Versioning — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the API versioning strategy — how versions are managed, communicated, and deprecated |
| **Scope**          | All REST APIs and event contracts |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | APIs start at v1; breaking changes require a new major version |
| **Constraints**    | Breaking changes may not be made within a major version |
| **Risks**          | Version proliferation; undeprecated old versions; consumers on old versions |
| **References**     | [API_GUIDELINES](API_GUIDELINES.md), [MESSAGE_CONTRACTS](MESSAGE_CONTRACTS.md) |
| **Related Documents** | [governance/VERSION_POLICY.md](../../governance/VERSION_POLICY.md) |

---

## Breaking vs. Non-Breaking Changes

### Breaking (requires major version bump)
- Removing or renaming a field
- Changing a field's type
- Changing an endpoint URL
- Removing an endpoint
- Changing response status codes
- Making optional fields required

### Non-Breaking (backward compatible)
- Adding new optional fields
- Adding new endpoints
- Adding new enum values (with care)
- Adding new optional query parameters

---

## URL Versioning

All APIs use URI versioning:

```
/v1/tenants/{tenantId}/orders     ← stable
/v2/tenants/{tenantId}/orders     ← new major version
```

---

## Deprecation Policy

1. Old version runs in parallel for minimum **6 months** after new version release
2. Deprecated version returns `Deprecation` and `Sunset` HTTP headers
3. Consumers are notified via changelog and direct notification
4. After sunset date, deprecated version returns `HTTP 410 Gone`

---

## Event Contract Versioning

Domain events are versioned independently. See [MESSAGE_CONTRACTS.md](MESSAGE_CONTRACTS.md).

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial versioning strategy |
