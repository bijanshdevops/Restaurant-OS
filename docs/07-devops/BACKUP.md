# Backup Strategy — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define backup strategy, RPO/RTO targets, and verification procedures |
| **Scope**          | All persistent data stores: structured data, event store, blob storage |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | Cloud-native managed backup services are used where available |
| **Constraints**    | Financial data must have 7-year retention; RPO < 1 hour for financial data |
| **Risks**          | Backup not tested; restore process not documented; data retention gaps |
| **References**     | [DISASTER_RECOVERY](DISASTER_RECOVERY.md), [STORAGE_PLATFORM](../04-platform/STORAGE_PLATFORM.md) |
| **Related Documents** | [SRE](SRE.md) |

---

## RPO / RTO Targets

| Data Category | RPO (Max Data Loss) | RTO (Max Recovery Time) |
|---|---|---|
| Financial / Accounting data | 1 hour | 2 hours |
| Domain events (event store) | 1 hour | 2 hours |
| Operational data (orders, menus) | 4 hours | 4 hours |
| Configuration data | 24 hours | 1 hour |
| Blob storage (images, PDFs) | 24 hours | 4 hours |

---

## Backup Schedule

| Data Store | Frequency | Retention | Location |
|---|---|---|---|
| Primary database (full) | Daily | 30 days | Separate region |
| Primary database (incremental) | Hourly | 7 days | Same region |
| Event store | Continuous (WAL/CDC) | 7 years | Separate region |
| Config store | Daily | 90 days | Separate region |
| Blob storage | Daily | Per data retention policy | Separate region |

---

## Backup Verification

- Monthly: Automated restore test to isolated environment
- Quarterly: Full DR exercise with RTO verification
- All restore tests must be documented in SRE runbooks

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial backup strategy |
