# Version Policy — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define version lifecycle policy — support windows, deprecation, and end-of-life for all versioned artifacts |
| **Scope**          | API versions, event schema versions, plugin versions, and documentation versions |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | All versioned artifacts follow this policy |
| **Constraints**    | Minimum support window must be maintained for enterprise customers |
| **Risks**          | Consumers stranded on deprecated versions |
| **References**     | [RELEASE_POLICY](RELEASE_POLICY.md), [VERSIONING](../docs/05-api/VERSIONING.md) |
| **Related Documents** | [MESSAGE_CONTRACTS](../docs/05-api/MESSAGE_CONTRACTS.md) |

---

## Support Windows

| Artifact Type | Support Window (per major version) |
|---|---|
| REST API (major version) | 12 months after next major version release |
| Domain Events (major version) | 12 months after next major version release |
| Plugin API | 12 months after next major version release |
| Documentation | Maintained current; archive previous major versions |

---

## Deprecation Process

1. **Deprecation Notice**: Announced 6 months before end of support
2. **Documentation**: Deprecation notice in CHANGELOG, API response headers, and release notes
3. **Consumer Notification**: All registered consumers notified via email/notification
4. **Support End**: After support window: API returns `HTTP 410 Gone`

---

## Version Matrix (Living Document)

| Artifact | Current Version | Previous Version | Support End |
|---|---|---|---|
| REST API | v1 | — | — |
| Domain Events | 1.0 | — | — |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial version policy |
