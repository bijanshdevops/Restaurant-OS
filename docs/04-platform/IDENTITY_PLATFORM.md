# Identity Platform — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the design of the Identity Platform — multi-tenant identity federation, authentication, and authorization infrastructure |
| **Scope**          | All identity concerns across tenants, brands, branches, and service accounts |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | External IdP is used for credential management; Identity Platform federates and enriches tokens |
| **Constraints**    | Must support per-tenant IdP federation; must issue tenant-scoped tokens |
| **Risks**          | Identity Platform as single point of failure; per-tenant IdP misconfiguration |
| **References**     | [Authentication](../03-security/Authentication.md), [Authorization](../03-security/Authorization.md) |
| **Related Documents** | [CONFIGURATION_PLATFORM](CONFIGURATION_PLATFORM.md) |

---

## Identity Hierarchy

```
Platform
  └── Tenant (e.g., "Acme Restaurant Group")
        ├── Brand (e.g., "Burger Palace")
        │     └── Branch (e.g., "Burger Palace - Oxford Street")
        └── Brand (e.g., "Pizza Express")
              └── Branch (e.g., "Pizza Express - Manchester")
```

Every token is scoped to its position in this hierarchy.

---

## Key Capabilities

| Capability | Description |
|---|---|
| **Multi-Tenant Federation** | Each tenant can configure their own OIDC/SAML IdP |
| **Token Enrichment** | Platform enriches external tokens with tenant, brand, branch, and role claims |
| **Service Account Management** | Automated credential issuance for service-to-service auth |
| **Device Registration** | POS and KDS device certificate provisioning |
| **Role Management** | Role assignment per user per branch/brand scope |
| **SSO** | Single sign-on across all Restaurants OS applications |

---

## Token Issuance Flow

```
User authenticates with IdP →
  IdP issues external token →
  Identity Platform validates external token →
  Identity Platform issues enriched platform token →
    Claims added: tid, bid, branchIds, roles →
  Platform token used for all Restaurants OS API calls
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial identity platform design |
