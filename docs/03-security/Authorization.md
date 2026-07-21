# Authorization — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the authorization model — who can do what, on what data, in what context |
| **Scope**          | All API endpoints and operations in Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Security Architect |
| **Assumptions**    | Multi-tenant; authorization is always tenant-scoped |
| **Constraints**    | Tenant isolation is structural — not enforced by permission check alone |
| **Risks**          | Permission model becomes too complex to reason about; missing permission checks |
| **References**     | [Authentication](Authentication.md), [ThreatModel](ThreatModel.md) |
| **Related Documents** | [Identity Platform](../04-platform/IDENTITY_PLATFORM.md), [Audit](Audit.md) |

---

## Authorization Model

Restaurants OS uses a **hybrid RBAC + ABAC** model:

- **RBAC** (Role-Based): Coarse-grained access by role (e.g., `Waiter`, `Manager`, `Franchise Admin`)
- **ABAC** (Attribute-Based): Fine-grained access based on resource attributes (e.g., branch, brand, tenant)

### Role Hierarchy

```
Platform Admin
  └── Tenant Admin
        ├── Brand Manager
        │     └── Branch Manager
        │           ├── Manager
        │           └── Staff (Waiter, Kitchen Staff)
        └── Franchise Admin (Franchise tenants only)
```

---

## Role Definitions

| Role | Scope | Key Permissions |
|---|---|---|
| `platform.admin` | Platform | Tenant management, platform configuration |
| `tenant.admin` | Tenant | All resources within the tenant |
| `brand.manager` | Brand | Menu management, reporting, brand configuration |
| `branch.manager` | Branch | Branch operations, staff, inventory, reporting |
| `manager` | Branch | Shift operations, voids, reports |
| `waiter` | Branch | Order creation and management |
| `kitchen` | Branch | KDS read/produce only |
| `franchise.admin` | Franchisee | Royalty reporting, compliance dashboard |

---

## Authorization Enforcement Points

1. **API Gateway**: Validates JWT; enforces authentication; blocks unauthenticated requests
2. **Application Layer**: Enforces RBAC using role claims from token
3. **Domain Layer**: Enforces invariants that have authorization meaning (e.g., only manager can void)
4. **Data Layer**: Enforces tenant ID filter structurally on every query

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Security Architect | Initial authorization model |
