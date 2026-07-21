# Configuration Platform — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the centralized configuration service — per-tenant, per-brand, per-branch, per-environment, and feature flag management |
| **Scope**          | All configuration concerns across the platform |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Configuration is hierarchical; more specific overrides less specific |
| **Constraints**    | Configuration must never contain secrets; secrets belong in the vault |
| **Risks**          | Configuration drift; incorrect hierarchy resolution; feature flag abuse |
| **References**     | [PLATFORM_SERVICES](PLATFORM_SERVICES.md), [SecretsManagement](../03-security/SecretsManagement.md) |
| **Related Documents** | [IDENTITY_PLATFORM](IDENTITY_PLATFORM.md) |

---

## Configuration Hierarchy

```
Platform Default
  └── Tenant Override
        └── Brand Override
              └── Branch Override
                    └── Environment Override
```

More specific settings override less specific ones. A Branch configuration overrides a Brand configuration for that key.

---

## Configuration Categories

| Category | Examples |
|---|---|
| **Operational** | Operating hours, tax rates, rounding rules |
| **Feature Flags** | Enable/disable features per tenant or branch |
| **Integration** | Delivery platform settings, payment provider config |
| **UI** | Theme, language, currency format |
| **Limits** | Max order size, max table covers, max modifiers |

---

## Feature Flags

Feature flags follow the same hierarchy. Flags are evaluated at the most specific scope:

| Flag Name | Default | Description |
|---|---|---|
| `feature.loyalty.enabled` | `false` | Enable loyalty module for tenant |
| `feature.reservations.enabled` | `false` | Enable reservations for branch |
| `feature.offline.mode` | `true` | Enable offline-first mode for POS |
| `feature.franchise.royalties` | `false` | Enable royalty calculation for franchise tenants |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial configuration platform design |
