# Secrets Management — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the strategy for managing secrets, credentials, and sensitive configuration throughout the Restaurants OS lifecycle |
| **Scope**          | All secrets: API keys, database credentials, signing keys, service credentials |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | A secrets vault is available in the target infrastructure (Vault, Azure Key Vault, AWS Secrets Manager) |
| **Constraints**    | No secrets in source code, environment files committed to VCS, or container images |
| **Risks**          | Secret sprawl; unrotated credentials; secrets in logs |
| **References**     | OWASP Secrets Management Cheat Sheet, [ThreatModel](ThreatModel.md) |
| **Related Documents** | [Authentication](Authentication.md), [CI_CD](../07-devops/CI_CD.md) |

---

## Principles

1. **No secrets in code** — FF-010 enforced; zero hardcoded credentials
2. **Secrets vault as single source of truth** — All secrets are stored in a dedicated vault
3. **Rotation without downtime** — Credential rotation must not require application restart
4. **Least privilege** — Each service has access only to the secrets it requires
5. **Audit every access** — All secret reads are logged with service identity and timestamp

---

## Secret Categories

| Category | Examples | Storage |
|---|---|---|
| Database credentials | DB user/password, connection strings | Vault (dynamic secrets preferred) |
| API keys (external) | Payment gateway keys, delivery platform keys | Vault |
| Signing keys | JWT RS256 private keys | Vault (HSM-backed in production) |
| Service credentials | Inter-service OAuth2 client secrets | Vault |
| Encryption keys | Data-at-rest encryption keys | KMS (Key Management Service) |
| Configuration secrets | Tenant-specific sensitive config | Vault, scoped per tenant |

---

## Rotation Policy

| Secret Type | Rotation Frequency | Rotation Method |
|---|---|---|
| Database credentials | 30 days | Dynamic secrets (Vault) |
| JWT signing keys | 90 days | Key rollover with overlap period |
| API keys (external) | On compromise or 180 days | Manual + automated notification |
| Service credentials | 60 days | Automated via vault |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial secrets management strategy |
