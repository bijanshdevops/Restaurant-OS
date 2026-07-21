# Architecture Overview — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | High-level architecture summary for executive and engineering audiences |
| **Scope**          | System-wide architectural overview — not implementation detail |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | DDD, Clean Architecture, and Modular Monolith are accepted approaches |
| **Constraints**    | Must support all deployment models from single restaurant to enterprise |
| **Risks**          | Premature decomposition before domain boundaries are proven |
| **References**     | [Architecture Vision](docs/02-architecture/00-architecture-vision.md), [Architecture Principles](docs/02-architecture/00-architecture-principles.md) |
| **Related Documents** | [Domain Landscape](docs/01-domain/00-domain-landscape.md), [System Context](docs/02-architecture/04-system-context.md) |

---

## Architecture Statement

Restaurants OS is designed as a **Modular Monolith** that is **Microservices-ready**. Each module is a bounded context with explicit contracts, owned data, and published events. The system can run as a single deployable unit or be decomposed into independent services as operational scale demands.

---

## Core Tenets

| Tenet | Statement |
|---|---|
| **Domain First** | Business domain drives every technical decision |
| **Clean Architecture** | Dependency direction is always inward — domain has no outward dependencies |
| **Modular Monolith First** | Single deployable with strong module boundaries |
| **Event-Driven Integration** | Modules communicate through domain events, not direct calls |
| **Multi-Tenant by Design** | Tenant isolation is a first-class architectural concern |
| **Plugin Architecture** | Extensibility without modifying core |
| **Offline-First POS** | Operational continuity without network dependency |
| **Cloud Native** | Kubernetes, OpenTelemetry, immutable infrastructure |
| **Double-Entry Accounting** | Every financial transaction is balanced — no shortcuts |
| **Event Sourcing Ready** | State derived from events; audit trail is structural |

---

## Deployment Models

```
Single Restaurant ──► Chain ──► Franchise ──► Enterprise
      │                  │           │              │
  1 tenant          N tenants    N tenants     N tenants
  1 brand           1 brand      N brands      N brands
  1 country         1 country    N countries   N countries
```

---

## Architecture Evolution Path

```
Phase 0: Documentation & Governance Foundation
    │
    ▼
Phase 1: Modular Monolith — Core Domains
    │
    ▼
Phase 2: Platform Services — Identity, Plugin, Configuration
    │
    ▼
Phase 3: Modular Deployment — Extract high-scale modules
    │
    ▼
Phase 4: Selective Microservices — Where scale demands it
    │
    ▼
Phase 5: Enterprise Platform — Multi-country, franchise engine
```

---

## Key Architecture Documents

| Layer | Document |
|---|---|
| Strategic | [Architecture Vision](docs/02-architecture/00-architecture-vision.md) |
| Strategic | [Architecture Goals](docs/02-architecture/00-architecture-goals.md) |
| Strategic | [Architecture Principles](docs/02-architecture/00-architecture-principles.md) |
| Quality | [Quality Attribute Scenarios](docs/02-architecture/00-quality-attribute-scenarios.md) |
| Views | [System Context](docs/02-architecture/04-system-context.md) |
| Views | [Container View](docs/02-architecture/05-container-view.md) |
| Views | [Deployment View](docs/02-architecture/08-deployment-view.md) |
| Evolution | [Evolution Roadmap](docs/02-architecture/09-evolution-roadmap.md) |

---

## Governance Rule

> **No source code, project, solution, infrastructure, API contract, or database artifact may be created before the corresponding Product, Domain, Architecture, ADR, and RFC documentation reaches Approved status.**

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial creation |
