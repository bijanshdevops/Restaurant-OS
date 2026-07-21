# ADR-0012: Failure Recovery Model

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the comprehensive failure recovery model — how the system detects, contains, and recovers from failures at every layer |
| **Scope**          | All failure modes: infrastructure, application, integration, data, edge |
| **Status**         | Draft |
| **Owner**          | SRE Lead + Principal Architect |
| **Assumptions**    | Failures are inevitable; the system must be designed for graceful degradation, not for the absence of failure; all consumers of domain events must be idempotent |
| **Constraints**    | POS must remain operational during partial cloud connectivity loss; financial operations must never be silently lost; event processing must guarantee at-least-once delivery |
| **Risks**          | Silent data loss during failures; cascading failures from a single dependency; long recovery time increasing revenue loss |
| **References**     | [DISASTER_RECOVERY](../../docs/07-devops/DISASTER_RECOVERY.md), [SRE](../../docs/07-devops/SRE.md), [ADR-0003](ADR-0003-event-driven-integration.md), [ADR-0005](ADR-0005-cqrs-and-event-sourcing-readiness.md) |
| **Related Documents** | [ADR-0008](ADR-0008-data-platform-strategy.md), [ADR-0013](ADR-0013-production-operability-model.md), [HEALTH_CHECKS](../../docs/07-devops/HEALTH_CHECKS.md) |

---

## Context

Restaurants OS operates in a physically distributed context — cloud, branch edge, kitchen edge — and must remain operational during component failures. A waiter must be able to take orders even if the analytics service is down. A cashier must be able to process a payment even if the loyalty service is temporarily unavailable. Financial records must never be silently discarded.

This ADR defines the failure recovery patterns mandatory across all modules.

## Problem Statement

What failure recovery patterns should Restaurants OS apply to ensure: no silent data loss, cascading failure isolation, guaranteed event delivery, POS continuity during partial connectivity, and rapid automated recovery?

---

## Failure Categories and Recovery Patterns

### Category 1: Application Failure (Pod Crash / OOM)

**Pattern**: Kubernetes self-healing + health probes

| Control | Configuration |
|---|---|
| Liveness probe | Fails → Kubernetes restarts pod |
| Readiness probe | Fails → Pod removed from load balancer (no traffic during restart) |
| Pod Disruption Budget | Minimum 1 replica always running during rolling updates |
| HPA | Scale out before resource exhaustion |

**Decision**: All services must implement all three probe types (see [HEALTH_CHECKS](../../docs/07-devops/HEALTH_CHECKS.md)).

---

### Category 2: Dependency Failure (External Service Unavailable)

**Pattern**: Circuit Breaker + Bulkhead + Graceful Degradation

**Circuit Breaker** (Polly library — .NET):

| State | Trigger | Behaviour |
|---|---|---|
| Closed | Normal | All calls pass through |
| Open | 3 consecutive failures within 30s | Calls fail immediately (no timeout wait); fallback executed |
| Half-Open | After 30s cooldown | One probe call; success → Closed; failure → Open again |

**Bulkhead**: Each external dependency has its own thread/connection pool. Payment gateway failure cannot consume all threads and starve kitchen ticket delivery.

**Graceful Degradation**:
| Dependency | Failure Behaviour |
|---|---|
| Analytics Service | Orders continue; analytics data queued for later |
| Loyalty Service | Order proceeds; loyalty points queued for later posting |
| Payment Gateway | Graceful error to cashier; retry options presented |
| Identity Service | Active sessions continue (JWT stateless); new logins degrade |
| Config Service | Last-known-good config cache used (max 24 hours) |

---

### Category 3: Message / Event Loss Prevention

**Pattern**: Transactional Outbox + Dead-Letter Queue

**Outbox Pattern** (all modules that publish events):
```
Database Transaction:
  1. Save aggregate state change
  2. Append event to outbox table (same transaction)
  → COMMIT

Background Relay (per module):
  1. Poll outbox for unpublished events
  2. Publish to Azure Service Bus
  3. Mark outbox record as published
  → On failure: retry with exponential backoff
```

**Dead-Letter Queue (DLQ)**: Events that fail consumer processing after 3 retries → DLQ.
- DLQ monitored with alert
- Manual replay process documented in runbook
- DLQ events are never silently discarded

**Idempotency**: All event consumers must be idempotent (process the same event N times = same result).
- Implementation: Store `processed_event_id` per consumer; check before processing
- `processed_event_id` records retained for 7 days (TTL)

---

### Category 4: Data Corruption / Accidental Deletion

**Pattern**: Point-in-Time Recovery (PITR) + Soft Delete + Immutable Event Log

| Control | Database | Retention |
|---|---|---|
| PITR (Azure PostgreSQL) | Automatic | 35 days |
| Soft delete | All domain aggregates | Logical delete, not physical |
| Event log | Outbox table (append only) | Never deleted |
| Backup | Daily full + continuous WAL | 35 days PITR + 7-year cold backup for financials |

---

### Category 5: Edge Failure (POS / KDS Offline)

**Pattern**: Local-First with Sync Queue

```
POS Terminal:
  1. All operations write to SQLite (local)
  2. Sync agent watches for connectivity
  3. On connectivity: flush local event queue to cloud
  4. Conflict resolution: last-write-wins with vector clock
  5. Cloud reconciles; sends diff back to terminal
```

**Offline invariants enforced locally**:
- Price lookup uses last-synced menu (max staleness: 24 hours)
- Payment: card-present transactions via local payment terminal (not cloud-dependent)
- Receipts: printed locally; cloud upload on reconnect

---

### Category 6: Cross-Module Distributed Transaction Failure

**Pattern**: Saga (Choreography-Based)

When an operation spans multiple modules (e.g., order placement → inventory deduction → kitchen ticket creation):
- Each step publishes a domain event on success
- Each step has a compensating event on failure (e.g., `InventoryReservationFailed` → `OrderCancelled`)
- Saga state is tracked in the originating module's outbox
- Sagas are logged as a named process; SRE can inspect saga state for any order

---

## Alternatives Considered

### Saga: Choreography vs. Orchestration

**Choreography** (selected): Each module reacts to events and publishes compensating events. No central coordinator.

**Pros**: Loosely coupled; no central failure point

**Cons**: Harder to visualise end-to-end flow; requires good distributed tracing

**Orchestration** (rejected for Phase 1): Central saga orchestrator directs each step.

**Pros**: Easier to visualise and debug

**Cons**: Central coordinator is a single point of failure; adds infrastructure complexity not justified in Phase 1

---

## Decision Summary

| Failure Category | Pattern |
|---|---|
| Pod failure | Kubernetes health probes + PDB + HPA |
| Dependency failure | Circuit breaker (Polly) + bulkhead + graceful degradation |
| Event loss | Transactional outbox + DLQ + idempotent consumers |
| Data corruption | PITR + soft delete + immutable event log |
| Edge offline | Local-first SQLite + sync queue + conflict resolution |
| Distributed transaction | Choreography-based Saga |

---

## Consequences

### Positive
- No silent data loss — every event either succeeds or enters DLQ with alert
- POS remains fully operational during cloud outage
- Circuit breakers prevent cascading failures

### Negative
- Outbox pattern adds one background process per module (relay agent)
- Saga compensating logic must be implemented for every cross-module flow
- Idempotency checks add a storage and lookup cost per event

### Neutral
- PITR provides a strong safety net but must be tested via DR exercises

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Choreography saga vs. orchestration | Choreography — simpler infrastructure; harder tracing (offset by OTEL) |
| At-least-once vs. exactly-once delivery | At-least-once + idempotent consumers — exactly-once is too expensive |
| Aggressive circuit breaker vs. patient retry | Aggressive (fail fast) — protect core from slow dependencies |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Idempotency check missing in a consumer | Medium | High | Architecture fitness function: all consumers must declare idempotency mechanism |
| DLQ full, alerting missed | Low | Critical | DLQ alert threshold: > 0 items; escalation to P1 |
| Saga compensating action failing | Low | High | Saga failure alert; manual intervention runbook |
| SQLite sync conflict corrupting data | Low | High | Vector clock conflict resolution; sync audit log |
| PITR not tested before it's needed | Medium | Critical | Monthly DR exercise; PITR restore tested in staging |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 3: Event-Driven Integration | Outbox + idempotency are the reliability guarantee for event-driven architecture |
| Principle 8: Offline First | Local-first SQLite is the offline recovery model for POS/KDS |
| Principle 9: CQRS Ready | Event replay from outbox enables read model rebuild |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Reliability | Outbox + DLQ → zero silent event loss; QAS-REL-001 |
| Availability | Circuit breakers + graceful degradation → POS uptime during cloud issues |
| Recoverability | PITR + soft delete → data recovery within 35 days |
| Resilience | Saga compensating actions → distributed transaction recovery |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 3, 8, 9 |
| **Quality Attribute** | QAS-REL-001, QAS-AVAIL-001, QAS-AVAIL-002 |
| **Related ADRs** | ADR-0003, ADR-0005, ADR-0008, ADR-0013 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] SRE Lead has reviewed all failure categories and recovery patterns
- [ ] Each recovery pattern has a runbook reference
- [ ] Outbox relay agent design reviewed
- [ ] DLQ alert threshold and escalation path reviewed
- [ ] PITR restore test scheduled for Phase 1 staging
- [ ] Saga compensating action requirement communicated to all module teams
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial draft |
