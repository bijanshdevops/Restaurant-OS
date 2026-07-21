# ADR-0008: Data Platform Strategy

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the data storage strategy across all modules — OLTP, event store, read models, edge, and analytics |
| **Scope**          | All persistent storage in the platform |
| **Status**         | Draft |
| **Owner**          | Principal Architect + Data Architect |
| **Assumptions**    | CQRS separates write and read concerns (ADR-0005); multi-tenant row-level isolation is mandatory (ADR-0004); accounting module requires event sourcing in Phase 4 |
| **Constraints**    | Must support offline-first edge storage for POS/KDS; financial data must have immutable audit trail; GDPR right-to-erasure must be supported |
| **Risks**          | Schema proliferation; read model rebuild cost at scale; event store volume growth; edge sync conflicts |
| **References**     | [ADR-0004](ADR-0004-multi-tenant-data-isolation.md), [ADR-0005](ADR-0005-cqrs-and-event-sourcing-readiness.md), [Storage Platform](../../docs/04-platform/STORAGE_PLATFORM.md) |
| **Related Documents** | [ADR-0006](ADR-0006-cloud-platform-selection.md), [ADR-0007](ADR-0007-technology-stack.md), [ADR-0012](ADR-0012-failure-recovery-model.md) |

---

## Context

Restaurants OS has four distinct storage needs:
1. **OLTP write models** — aggregate persistence, transactional, strongly consistent
2. **Read models (projections)** — query-optimised, eventually consistent, can be rebuilt
3. **Event store** — append-only immutable event log (required for Accounting from Phase 4; optional-but-useful for all modules)
4. **Edge storage** — offline-capable local store for POS/KDS when network is unavailable
5. **Analytics** — aggregate reporting, time-series, cross-tenant metrics (Phase 3+)

## Problem Statement

What database technology, data access pattern, and edge storage strategy should Restaurants OS adopt across all storage tiers, while satisfying CQRS, offline-first, multi-tenant isolation, and financial immutability requirements?

---

## Alternatives Considered

### OLTP: Option A — PostgreSQL (Recommended)

**Pros**: Fully relational, ACID, row-level security (RLS) native, JSONB for flexible schema where needed, excellent EF Core support, cloud-agnostic (avoid Azure SQL proprietary lock-in), PgVector for future AI/ML features, excellent open-source community

**Cons**: Requires DBA expertise; tuning required at high volume; multi-tenant sharding complex at extreme scale

### OLTP: Option B — Azure SQL (SQL Server)

**Pros**: Native Azure integration, Row-Level Security feature

**Cons**: Vendor lock-in; licensing cost at scale; migration cost if cloud provider changes

### OLTP: Option C — MongoDB

**Pros**: Document model fits aggregate storage naturally

**Cons**: Transactions across collections limited; joins across read models require application-level joins; weaker ACID guarantees; financial data in document store is high risk

---

### Event Store: Option A — Custom Outbox + PostgreSQL Append Table (Phase 1-3)

**Pros**: No additional infrastructure; single database; simple to operate; sufficient for Modular Monolith phase

**Cons**: Not a purpose-built event store; projection rebuild is custom code

### Event Store: Option B — EventStoreDB (Phase 4+ Accounting)

**Pros**: Purpose-built for event sourcing; native projection support; optimistic concurrency; immutable by design; strong .NET SDK

**Cons**: Additional infrastructure component; learning curve; overkill for non-event-sourced modules

---

### Edge Storage: Option A — SQLite + Write-Ahead Log (Recommended)

**Pros**: Embedded, no network required, ACID, EF Core SQLite provider available, simple sync mechanism, widely used in POS systems

**Cons**: Not suitable for high-concurrency (acceptable for single-terminal POS); sync conflict resolution is application responsibility

### Edge Storage: Option B — IndexedDB (Browser)

**Pros**: Zero infrastructure; works in PWA

**Cons**: Not queryable with SQL; no ACID; size limits on some browsers; not suitable for full POS state

---

### Analytics: Option A — Azure Synapse Analytics / PostgreSQL Read Replica (Phase 3+)

**Pros**: Leverage existing PostgreSQL investment; read replicas are simple; Synapse for large-scale cross-tenant reporting

**Cons**: Read replicas lag; complex cross-tenant aggregation

---

## Decision

> **Phase 1-3 OLTP**: Azure Database for PostgreSQL Flexible Server (cloud); PostgreSQL 16+
> **Phase 1-3 Event Store**: Custom outbox table in PostgreSQL (per module, append-only)
> **Phase 4+ Accounting Event Store**: EventStoreDB
> **Edge Storage**: SQLite (embedded, per terminal)
> **Read Models**: PostgreSQL separate schema per module (projections rebuilt from events)
> **Analytics (Phase 3+)**: PostgreSQL read replica + Azure Synapse for cross-tenant reports

**Data Access Pattern**:
- Write path: EF Core (aggregate persistence, migrations, outbox)
- Read path: Dapper (raw SQL, projection queries, no ORM overhead)
- All queries include `tenant_id` filter — enforced by base repository class

**GDPR Right-to-Erasure Strategy**:
- PII stored in a separate `gdpr_pii` table referenced by `pii_reference_id` (pseudonymisation)
- Erasure deletes the PII record; event payloads retain the `pii_reference_id` (no PII in events)
- Financial records that cannot be erased for legal reasons retain synthetic identifiers

**Multi-Tenant Schema Strategy**:
- Phase 1-3: Shared schema, `tenant_id` column, row-level filtering in repository base class
- Phase 4+ (Accounting): Evaluate schema-per-tenant for financial isolation (separate ADR required)

---

## Consequences

### Positive
- PostgreSQL is cloud-agnostic — protects against cloud provider migration cost
- SQLite edge + PostgreSQL cloud is a well-proven POS pattern
- EF Core write + Dapper read is idiomatic CQRS .NET pattern
- GDPR pseudonymisation enables erasure without destroying event history

### Negative
- Dual ORM (EF Core + Dapper) requires team discipline to use correctly
- EventStoreDB adds infrastructure complexity in Phase 4
- Read model rebuild at tenant scale requires operational runbooks

### Neutral
- SQLite at edge creates an eventual consistency sync problem — addressed in ADR-0012

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Single ORM vs. dual ORM | Dual: EF Core (write) + Dapper (read) — CQRS performance justifies it |
| Purpose-built event store from day one vs. deferred | Deferred to Phase 4 — outbox pattern is sufficient for Phase 1-3 |
| Schema-per-tenant vs. shared schema | Shared schema Phase 1-3; re-evaluate for Accounting in Phase 4 |
| Cloud-managed DB vs. self-hosted | Cloud-managed (Azure PostgreSQL) for operational simplicity |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Missing `tenant_id` filter in a query | Medium | Critical | FF-013 fitness function + base repository class enforcement |
| Read model projection lag on rebuild | Medium | High | Read model versioning; rebuild runbook; health check for projection lag |
| SQLite sync conflict at edge | Low | High | Deterministic conflict resolution strategy (last-write-wins with vector clocks) |
| PostgreSQL vertical scale limit | Low | Medium | Read replicas; then sharding ADR when needed |
| GDPR erasure incomplete | Low | Critical | Erasure checklist; erasure integration tests; legal review |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 4: Multi-Tenant by Design | Tenant ID enforced at repository base class; RLS as defence-in-depth |
| Principle 8: Offline First | SQLite edge satisfies full offline operation for POS/KDS |
| Principle 9: CQRS Ready | EF Core write + Dapper read + outbox event publication |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Performance | Dapper projections → sub-10ms read path; no ORM overhead for queries |
| Reliability | PostgreSQL ACID + outbox pattern → no event loss |
| Security | Pseudonymisation → GDPR compliant without destroying event history |
| Scalability | Read replicas → read scale without write path impact |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 4, 8, 9 |
| **Quality Attribute** | QAS-PERF-001, QAS-REL-001, QAS-AVAIL-002 |
| **Related ADRs** | ADR-0004, ADR-0005, ADR-0006, ADR-0007, ADR-0012 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] GDPR pseudonymisation strategy reviewed by Data Protection Officer
- [ ] Financial data immutability reviewed by Finance Lead
- [ ] SQLite sync conflict resolution strategy reviewed by SRE Lead
- [ ] EF Core + Dapper dual-ORM strategy accepted by Architecture Board
- [ ] Read model rebuild runbook committed to in Phase 1 planning
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
