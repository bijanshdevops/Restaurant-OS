# Security Standards — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Enterprise security standards — prescriptive rules for all module development |
| **Scope**          | All source code, configuration, and deployment |
| **Status**         | Approved |
| **Owner**          | Security Architect |
| **Assumptions**    | Security is built in; not bolted on |
| **Constraints**    | All rules are enforced in CI pipeline; violations block deployment |
| **Risks**          | Security standards ignored under delivery pressure |
| **References**     | [ThreatModel](../docs/03-security/ThreatModel.md), OWASP Top 10 |
| **Related Documents** | [Authentication](../docs/03-security/Authentication.md), [Authorization](../docs/03-security/Authorization.md) |

---

## Mandatory Security Rules

| ID | Rule | Enforcement |
|---|---|---|
| SEC-001 | No hardcoded credentials, API keys, or secrets in source code | FF-010, Gitleaks |
| SEC-002 | All API endpoints require authentication (JWT validation) | Architecture fitness function |
| SEC-003 | All repository queries must include tenant ID filter | FF-013, code review |
| SEC-004 | PII must never appear in logs | Log scanning in CI |
| SEC-005 | All inter-service communication over TLS | Infrastructure config |
| SEC-006 | SAST scan must pass with no HIGH/CRITICAL findings | Gate 3 |
| SEC-007 | Dependency vulnerability scan before release | OWASP Dependency Check, Gate 1 |
| SEC-008 | All sensitive operations must write an audit record | Architecture review |
| SEC-009 | No unused dependencies in production builds | Dependency review |
| SEC-010 | MFA required for Manager role and above | Identity Platform config |

---

## Input Validation Rules

- All user input validated before use — use allow-list, not deny-list
- Parameterized queries only — no string concatenation in SQL
- File uploads: validated type, maximum size, virus scan
- Request size limits enforced at API Gateway

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial security standards |
