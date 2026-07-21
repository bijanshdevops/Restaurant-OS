# Quality Attribute Scenarios — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define formal Quality Attribute Scenarios (QAS) using stimulus/response/measure format for all architectural quality concerns |
| **Scope**          | All quality attributes relevant to Restaurants OS |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | QAS are agreed upon before architecture decisions are finalized |
| **Constraints**    | Every QAS must have a measurable response measure |
| **Risks**          | QAS not consulted during ADR creation; unmeasured quality attributes drift |
| **References**     | Software Architecture in Practice (Bass, Clements, Kazman) |
| **Related Documents** | [Architecture Goals](00-architecture-goals.md), [Architecture Metrics](../08-quality/ARCHITECTURE_METRICS.md), [Fitness Functions](../08-quality/ARCHITECTURE_FITNESS_FUNCTIONS.md) |

---

## QAS Format

| Field | Description |
|---|---|
| **Source** | Who or what generates the stimulus |
| **Stimulus** | The event or condition |
| **Artifact** | The part of the system affected |
| **Environment** | The conditions under which the stimulus occurs |
| **Response** | How the system reacts |
| **Measure** | The quantifiable outcome |

---

## Performance

### QAS-PERF-001: Order Creation Latency

| Field | Value |
|---|---|
| **Source** | Waiter or kiosk operator |
| **Stimulus** | Creates a new order with 5 line items |
| **Artifact** | Order Management module |
| **Environment** | Normal operation, 100 concurrent sessions |
| **Response** | Order is created, persisted, and event published |
| **Measure** | End-to-end latency < 300ms at p99 |

### QAS-PERF-002: Menu Load Time

| Field | Value |
|---|---|
| **Source** | POS terminal |
| **Stimulus** | Loads the current menu for a branch |
| **Artifact** | Menu Management module |
| **Environment** | Normal operation, cold cache |
| **Response** | Full menu returned to caller |
| **Measure** | Response time < 500ms at p99 |

---

## Availability

### QAS-AVAIL-001: Monthly Availability

| Field | Value |
|---|---|
| **Source** | Operations team |
| **Stimulus** | System is accessed for normal operations over 30 days |
| **Artifact** | Entire system |
| **Environment** | Production, normal conditions |
| **Response** | System serves requests correctly |
| **Measure** | 99.9% successful requests per calendar month |

### QAS-AVAIL-002: Offline Operational Continuity

| Field | Value |
|---|---|
| **Source** | Network failure |
| **Stimulus** | All connectivity is lost at a restaurant branch |
| **Artifact** | POS and Kitchen modules |
| **Environment** | Branch operation, network partition |
| **Response** | Core operations continue unaffected |
| **Measure** | 100% of order entry and kitchen routing functions available; tested to 24-hour partition |

---

## Security

### QAS-SEC-001: Tenant Data Isolation

| Field | Value |
|---|---|
| **Source** | Authenticated user of Tenant A |
| **Stimulus** | Attempts to access data belonging to Tenant B by any means |
| **Artifact** | Data layer, API layer |
| **Environment** | Normal operation, deliberate or accidental access attempt |
| **Response** | Access is denied; event is logged |
| **Measure** | Zero cross-tenant data access; 100% detection in security tests |

### QAS-SEC-002: Secret Rotation

| Field | Value |
|---|---|
| **Source** | Security team |
| **Stimulus** | Rotates a service credential |
| **Artifact** | Secrets management system |
| **Environment** | Production, no maintenance window |
| **Response** | New credential is adopted with no downtime |
| **Measure** | Zero downtime during rotation; rotation completed < 5 minutes |

---

## Maintainability

### QAS-MAINT-001: New Module Onboarding

| Field | Value |
|---|---|
| **Source** | New developer |
| **Stimulus** | Assigned to create a new bounded context module |
| **Artifact** | Repository, standards, templates |
| **Environment** | Normal development |
| **Response** | Developer can scaffold and wire a new module following existing patterns |
| **Measure** | Module scaffolded and first tests passing within 1 business day |

---

## Scalability

### QAS-SCALE-001: Multi-Location Chain Scale

| Field | Value |
|---|---|
| **Source** | Chain growth event |
| **Stimulus** | 50 new branches added to a tenant |
| **Artifact** | Entire platform |
| **Environment** | Production, normal business hours |
| **Response** | All 50 branches operational without architectural change |
| **Measure** | Zero performance degradation; linear resource consumption |

---

## Reliability

### QAS-REL-001: Event Delivery Guarantee

| Field | Value |
|---|---|
| **Source** | Domain event publisher |
| **Stimulus** | Domain event is published after a state change |
| **Artifact** | Event bus, Outbox pattern |
| **Environment** | Normal operation or transient infrastructure failure |
| **Response** | Event is delivered at least once to all subscribers |
| **Measure** | Zero event loss; duplicate handling tested |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial QAS defined |
