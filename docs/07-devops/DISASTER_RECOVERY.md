# Disaster Recovery — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define disaster recovery procedures, failover strategy, and runbooks |
| **Scope**          | All production environments |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | Multi-region deployment available from Phase 3+ |
| **Constraints**    | RTO for financial data < 2 hours; POS offline operation covers network-level DR |
| **Risks**          | DR procedure not tested; runbooks out of date |
| **References**     | [BACKUP](BACKUP.md), [SRE](SRE.md), [HEALTH_CHECKS](HEALTH_CHECKS.md) |
| **Related Documents** | [Deployment View](../02-architecture/08-deployment-view.md) |

---

## Disaster Scenarios

| Scenario | Severity | Strategy |
|---|---|---|
| Single pod failure | Low | Kubernetes self-healing (automatic) |
| Availability zone failure | Medium | Multi-AZ deployment; automatic failover |
| Region failure | High | Cross-region failover (Phase 3+) |
| Data corruption | Critical | Point-in-time restore from backup |
| Cyber incident (ransomware) | Critical | Isolated restore from clean backup |
| POS network loss (branch) | Low | Offline-first mode activates automatically |

---

## Failover Runbook (Region Failure — Phase 3+)

1. **Alert received**: Region health check fails; P1 alert fires
2. **Assess**: Confirm region failure (not false positive) — 5 minutes
3. **Activate DR**: Route DNS to secondary region — 10 minutes
4. **Verify**: Health checks pass in secondary region — 5 minutes
5. **Communicate**: Notify stakeholders and tenants — 15 minutes
6. **Monitor**: Watch for data consistency issues — ongoing
7. **Post-mortem**: Within 48 hours of resolution

**Total target RTO**: < 30 minutes for region failover (Phase 3+)

---

## Data Restore Runbook (Corruption)

1. Identify scope of corruption from audit trail
2. Determine last clean backup point
3. Restore to isolated environment and verify
4. Plan forward-migration to apply missing transactions
5. Restore to production with approval from Architecture Board
6. Verify financial balances using double-entry invariant check
7. Post-mortem

---

## DR Exercise Schedule

- **Quarterly**: Tabletop exercise (team walkthrough of runbooks)
- **Semi-annual**: Partial DR exercise (failover to secondary, restore from backup)
- **Annual**: Full DR simulation with RTO measurement

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial disaster recovery plan |
