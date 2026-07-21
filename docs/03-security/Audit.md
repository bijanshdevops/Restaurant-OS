# Audit — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define audit trail requirements — what is audited, how, and for how long |
| **Scope**          | All security-relevant and business-relevant operations |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | Audit trail is structural, not bolted-on; domain events form the basis |
| **Constraints**    | Audit records are immutable; they cannot be deleted or modified |
| **Risks**          | Audit logs not capturing sufficient context; audit storage costs at scale |
| **References**     | [ThreatModel](ThreatModel.md), [Domain Events](../01-domain/05-domain-events.md) |
| **Related Documents** | [Authorization](Authorization.md), [LOGGING](../07-devops/LOGGING.md) |

---

## What Must Be Audited

### Security Events
- Authentication: login, logout, failed attempts, MFA events
- Authorization: access denied events
- Secret access: every vault read
- Privilege escalation: role changes, admin access

### Business Events (Financial-Grade)
- All Order state transitions
- All Payment and Refund operations
- All Journal Entry postings
- All Period Close operations
- All Void operations (with approver identity)
- Franchise royalty calculations

### Configuration Events
- Tenant configuration changes
- Menu publishing
- Role and permission changes
- Plugin installation/removal

---

## Audit Record Format

Every audit record must contain:

| Field | Description |
|---|---|
| `eventId` | Globally unique identifier |
| `timestamp` | UTC timestamp with millisecond precision |
| `tenantId` | Tenant context |
| `actorId` | User or service performing the action |
| `actorRole` | Role at time of action |
| `action` | What was done (structured, not free text) |
| `resourceType` | Type of resource affected |
| `resourceId` | ID of resource affected |
| `before` | State before change (where applicable) |
| `after` | State after change (where applicable) |
| `correlationId` | Links related events in a single flow |
| `ipAddress` | Source IP (for human actors) |

---

## Retention Policy

| Category | Retention |
|---|---|
| Security events | 2 years |
| Financial events | 7 years (legal/tax requirement) |
| Operational events | 90 days |
| Debug/diagnostic | 30 days |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial audit requirements |
