# Storage Platform — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the storage strategy — structured data, blob storage, event store, and per-tenant partitioning |
| **Scope**          | All storage concerns across the platform |
| **Status**         | Draft |
| **Owner**          | Platform Lead |
| **Assumptions**    | Cloud-native storage; provider TBD; abstracted behind interfaces |
| **Constraints**    | Tenant data partitioning is structural; not filter-based |
| **Risks**          | Storage costs at scale; cross-tenant data leakage via shared storage |
| **References**     | [PLATFORM_SERVICES](PLATFORM_SERVICES.md), [ADR-0004](../../adr/tactical/ADR-0004-multi-tenant-data-isolation.md) |
| **Related Documents** | [Deployment View](../02-architecture/08-deployment-view.md) |

---

## Storage Types

| Type | Use Case | Tenant Isolation |
|---|---|---|
| **Structured (RDBMS)** | Module data, orders, menus, accounting | Schema-per-tenant or row-level with tenant ID column |
| **Event Store** | Domain events, audit trail | Partition by tenant ID |
| **Blob Storage** | Menu images, receipt PDFs, reports | Container/bucket per tenant |
| **Cache** | Menu data, configuration, session | Key prefix per tenant |
| **Local Edge Store** | Kitchen/POS offline data | Device-scoped; encrypted |

---

## Tenant Isolation Strategy

| Layer | Strategy |
|---|---|
| Structured Data | Row-level tenant ID on all tables; enforced at repository layer |
| Event Store | Partition key includes tenant ID; no cross-partition queries |
| Blob Storage | Container per tenant; no shared containers |
| Cache | All keys prefixed with `{tenantId}:` |
| Edge Storage | Device-bound; synchronized to tenant partition on reconnect |

---

## Data Retention

| Data Type | Retention | Notes |
|---|---|---|
| Order data | 7 years | Financial/legal requirement |
| Domain events | 7 years (financial) / 1 year (operational) | Event sourcing |
| Audit trail | 7 years | Legal requirement |
| Cache | TTL per entry | No persistence guarantee |
| Blobs (images) | Indefinite while tenant active | Deleted on tenant offboarding |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial storage platform design |
