# Architecture Review Checklist — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Provide the enterprise architecture review checklist covering all 12 quality dimensions |
| **Scope**          | Every new module, integration, or significant architectural change |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Used in every architecture review session |
| **Constraints**    | All items must be addressed; N/A must be justified |
| **Risks**          | Checklist items skipped under time pressure |
| **References**     | [Architecture Principles](../02-architecture/00-architecture-principles.md), [Fitness Functions](ARCHITECTURE_FITNESS_FUNCTIONS.md) |
| **Related Documents** | [templates/ARCHITECTURE_REVIEW.md](../../templates/ARCHITECTURE_REVIEW.md) |

---

## 1. DDD Alignment

- [ ] Bounded Context boundary is explicitly defined
- [ ] Ubiquitous language is documented in [04-ubiquitous-language.md](../01-domain/04-ubiquitous-language.md)
- [ ] Aggregate roots and invariants are documented
- [ ] Domain events are cataloged in [EVENT_CATALOG](../05-api/EVENT_CATALOG.md)
- [ ] Context is registered in [Context Catalog](../01-domain/10-context-catalog.md)
- [ ] Domain services are documented; no logic leaking to application layer
- [ ] No cross-aggregate direct references (only IDs)

## 2. Security

- [ ] Threat model reviewed (STRIDE) for new attack surfaces
- [ ] Authentication enforced at API boundary
- [ ] Authorization enforced (RBAC + tenant scope)
- [ ] No secrets in code (FF-010)
- [ ] PII identified and masked in logs
- [ ] Audit trail covers all sensitive operations
- [ ] New API endpoints added to security scan scope

## 3. Performance

- [ ] QAS-PERF scenarios satisfied (p99 < 300ms for order operations)
- [ ] No N+1 query patterns in read paths
- [ ] CQRS read model used for query-heavy operations
- [ ] Caching strategy defined (TTL, invalidation)
- [ ] Load test scenarios defined for peak capacity

## 4. Scalability

- [ ] Module can scale horizontally without session stickiness
- [ ] Database access is tenant-partitioned
- [ ] Event processing is idempotent (safe to replay)
- [ ] No shared mutable state between instances

## 5. Availability

- [ ] Health probes implemented (liveness, readiness, startup)
- [ ] Circuit breakers on all external dependencies
- [ ] Graceful degradation strategy defined for dependency failures
- [ ] SLO target defined and achievable

## 6. Reliability

- [ ] Outbox pattern used for event publishing
- [ ] Event consumers are idempotent
- [ ] Saga compensating actions defined
- [ ] Data durability requirements met (backup strategy)

## 7. Maintainability

- [ ] Clean Architecture layers respected (FF-002, FF-008)
- [ ] No circular dependencies (FF-007)
- [ ] Domain layer test coverage ≥ 90% (FF-009)
- [ ] ADR created for all significant decisions
- [ ] All new terms added to [GLOSSARY](../GLOSSARY.md)

## 8. Observability

- [ ] OpenTelemetry traces emitted for all endpoints (FF-011)
- [ ] RED metrics emitted
- [ ] Structured logging with required fields
- [ ] Alerts defined for all SLO breach conditions
- [ ] Health endpoints implemented

## 9. Extensibility

- [ ] Extension points documented if this module is a platform service
- [ ] No internal implementation exposed beyond module boundary
- [ ] Plugin hooks identified where business customization is expected

## 10. Compliance

- [ ] Data retention policy applied to all data stores
- [ ] PII handling reviewed and documented
- [ ] Financial data subject to double-entry invariant (if applicable)
- [ ] Audit trail covers all regulated operations
- [ ] Tax implications reviewed (if applicable)

## 11. Cost

- [ ] Storage cost estimate for new data at scale
- [ ] Compute cost estimate for new workload
- [ ] Event volume estimate and message bus cost
- [ ] Cost monitoring dashboards updated

## 12. Operability

- [ ] Runbooks exist for common operational tasks
- [ ] On-call guidance updated
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented and tested
- [ ] Configuration externalized and documented

---

## Sign-Off

| Reviewer | Role | Date | Decision |
|---|---|---|---|
| | Principal Architect | | Approved / Rejected |
| | Security Architect | | Approved / Rejected |
| | SRE Lead | | Approved / Rejected |
| | Domain Lead | | Approved / Rejected |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial 12-dimension enterprise checklist |
