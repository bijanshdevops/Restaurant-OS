# Architecture Principles (Canonical) — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical binding architecture principles — the authoritative reference for all architecture decisions |
| **Scope**          | All modules, services, and infrastructure |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Principles are stable for the life of the system; changes require full Architecture Board vote |
| **Constraints**    | Principles may not be violated without an approved ADR documenting the exception |
| **Risks**          | Principles not enforced; drift between stated and actual architecture |
| **References**     | [docs/02-architecture/00-architecture-principles.md](../../docs/02-architecture/00-architecture-principles.md) |
| **Related Documents** | [constraints/README.md](../constraints/README.md), [ADR Index](../../adr/README.md) |

---

## The Ten Binding Principles

### Principle 1: Domain First (DDD)

The system is organized around the business domain. Code structure, naming, and module boundaries reflect domain concepts, not technical concerns. The ubiquitous language of each Bounded Context is used consistently in code, documentation, and communication.

**Enforced by**: ADR-0002, FF-002, Architecture Review Checklist

---

### Principle 2: Clean Architecture

Every module observes Clean Architecture layering. Dependencies point inward: Infrastructure depends on Application and Domain; Domain has zero external dependencies. No framework annotations on domain entities.

**Enforced by**: ADR-0002, FF-002, FF-008

---

### Principle 3: Event-Driven Integration

Cross-module communication uses only published domain events. No synchronous calls between bounded contexts. No shared database tables between modules.

**Enforced by**: ADR-0003, FF-001

---

### Principle 4: Multi-Tenant by Design

Every data access, every API, every cache key is tenant-scoped by design. Tenant isolation is structural — not an afterthought, not a filter.

**Enforced by**: ADR-0004, FF-013

---

### Principle 5: Security by Design

Security is built in at every layer: API Gateway (authentication), Application Layer (authorization), Domain Layer (invariants with security meaning), Infrastructure Layer (tenant filter, secrets from vault).

**Enforced by**: Security Reference Model, FF-010, SEC-001 to SEC-010

---

### Principle 6: Modular Monolith First

The architecture starts as a Modular Monolith with strong internal boundaries. Extraction to independent services is permitted only when demonstrated need is proven and an ADR is approved.

**Enforced by**: ADR-0001, Evolution Roadmap

---

### Principle 7: API First

No implementation may begin before the API contract (REST or event schema) is reviewed and approved. All APIs are versioned from day one.

**Enforced by**: QUALITY_GATE Gate 1, API Standards

---

### Principle 8: Offline First (POS and KDS)

The POS and Kitchen Display System must function without network connectivity. Local-first data storage and deterministic sync conflict resolution are mandatory.

**Enforced by**: QAS-AVAIL-002, Deployment Reference Model

---

### Principle 9: CQRS and Event Sourcing Ready

All aggregates raise domain events on every state change. CQRS separates write and read models. Accounting Context will adopt full event sourcing in Phase 4.

**Enforced by**: ADR-0005

---

### Principle 10: Observe Everything

Every module emits OpenTelemetry traces, RED metrics, and structured logs. No blind spots in production. Observability is not optional.

**Enforced by**: FF-011, Observability Reference Model

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Canonical principles — Approved |
