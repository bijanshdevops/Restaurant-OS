# ADR-0007: Technology Stack

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Select the programming languages, frameworks, and runtimes for the Restaurants OS backend, frontend, and tooling |
| **Scope**          | All modules: backend API, domain logic, infrastructure, frontend applications |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | DDD + Clean Architecture are non-negotiable (ADR-0002); the stack must support these patterns natively |
| **Constraints**    | Must support offline-first POS (PWA or native); must have mature Kubernetes support; team must be able to hire for the chosen stack |
| **Risks**          | Technology choice creating hiring bottleneck; framework locking application to patterns incompatible with DDD |
| **References**     | [ADR-0002](ADR-0002-ddd-and-clean-architecture.md), [Component View](../../docs/02-architecture/06-component-view.md), [ADR-0006](ADR-0006-cloud-platform-selection.md) |
| **Related Documents** | [ADR-0008](ADR-0008-data-platform-strategy.md), [Coding Standard](../../docs/08-quality/CODING_STANDARD.md) |

---

## Context

Restaurants OS requires a backend that supports rich domain modelling (DDD), strong typing, and high maintainability over a 10-year lifespan. The frontend must support offline-first POS, real-time Kitchen Display, and a management portal. The stack must be hireable, testable, and aligned with Clean Architecture.

## Problem Statement

Which programming language, backend framework, and frontend technology should Restaurants OS adopt to best support DDD, Clean Architecture, offline-first operation, and 10+ year maintainability?

---

## Alternatives Considered

### Backend: Option A — .NET 9 / C# (Recommended)

**Pros**:
- Strongest language-level support for DDD patterns: record types (value objects), sealed classes, pattern matching
- Excellent Clean Architecture ecosystem: MediatR (CQRS), FluentValidation, Ardalis.Specification
- Native AOT for lightweight, fast container images
- Strong async model; excellent Entity Framework Core and Dapper support
- Industry standard for enterprise hospitality software
- Azure integration is first-class (Azure SDK for .NET is the most complete)
- Large talent pool in enterprise software engineering
- Long-term supported by Microsoft with a clear 3-year LTS cadence

**Cons**:
- Higher memory baseline than Go or Rust
- Some developers have historical bias against Microsoft ecosystems

---

### Backend: Option B — Java / Spring Boot

**Pros**: Mature; large talent pool; strong DDD community

**Cons**: More verbose than C# for DDD patterns; slower startup time; Spring can encourage anti-patterns (service locator, transaction script); heavier framework magic

---

### Backend: Option C — Go

**Pros**: Excellent performance; small binary size; fast startup

**Cons**: Weak support for DDD patterns (no generics before 1.18; limited algebraic types); small domain modelling community; not the right tool for complex business rules

---

### Backend: Option D — Node.js / TypeScript

**Pros**: Unified language with frontend; good async model

**Cons**: Single-threaded; DDD pattern support is community-driven, not idiomatic; runtime type safety gaps; not standard for enterprise financial systems

---

### Frontend: Option A — React + TypeScript (Recommended)

**Pros**: Largest ecosystem; PWA support for offline POS; mature state management (Zustand, TanStack Query); component reuse across POS, KDS, management portal; strong hiring market

**Cons**: Framework fragmentation (many choices for routing, state, etc.)

---

### Frontend: Option B — Next.js (on top of React)

**Pros**: SSR/SSG for management portal; file-based routing

**Cons**: SSR is irrelevant for POS/KDS (must be offline); adds server-side complexity not needed for all surfaces

---

### Frontend: Option C — Vue.js

**Pros**: Simpler learning curve

**Cons**: Smaller ecosystem than React; less mature PWA offline story; lower hiring market share

---

## Decision

> **Backend: .NET 9 / C#**
> **Frontend: React + TypeScript (PWA)**
> **API protocol: REST (HTTP/JSON) + WebSockets for real-time**
> **Tooling / Scripts: PowerShell + Bash (cross-platform)**

**Backend Framework Structure**:
- **API Layer**: ASP.NET Core Minimal APIs (performance) or Controllers (discoverability)
- **CQRS**: MediatR (commands, queries, notifications)
- **Validation**: FluentValidation (application layer)
- **ORM**: Entity Framework Core (write model) + Dapper (read models / projections)
- **Testing**: xUnit + NSubstitute + Shouldly
- **Architecture tests**: NetArchTest.Rules (enforces fitness functions FF-001, FF-002, FF-007, FF-008)

**Frontend Structure**:
- **POS Terminal**: React PWA (Service Worker, IndexedDB for offline)
- **Kitchen Display**: React PWA (WebSocket for real-time updates)
- **Management Portal**: React SPA
- **Design System**: Custom component library (shared across surfaces)
- **State**: Zustand (lightweight) + TanStack Query (server state)
- **Build**: Vite

---

## Consequences

### Positive
- .NET 9 record types are ideal value objects — immutable, structural equality, no boilerplate
- MediatR maps perfectly to CQRS command/query handler pattern
- NetArchTest.Rules enables automated fitness function enforcement in CI
- React PWA meets offline-first POS requirement without native app complexity

### Negative
- Two language ecosystems (C# + TypeScript) require cross-team coordination
- .NET requires Windows or Linux build agents; additional CI configuration

### Neutral
- Technology choices do not affect domain model — domain layer is pure C# with no framework dependencies

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Framework magic vs. explicit control | Minimal APIs + MediatR — explicit over convention magic |
| ORM convenience vs. read performance | EF Core for writes (aggregate persistence); Dapper for reads (projection queries) |
| Unified stack vs. best-for-purpose | Two languages (C# + TypeScript) accepted for best-in-class at each layer |
| Native app vs. PWA for POS | PWA — offline-first is achievable; avoids native platform complexity |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Hiring C# developers | Medium | High | .NET is among top 5 enterprise stacks globally; active community |
| PWA offline limits on iOS Safari | Medium | High | Validate PWA capability on target devices in Phase 1 spike |
| MediatR pipeline becoming a dumping ground | Medium | Medium | Architecture review checklist enforces separation of concerns |
| EF Core migration complexity at scale | Low | Medium | Migration scripts reviewed in architecture review; tested in staging |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 1: Domain First (DDD) | C# record types and sealed classes are first-class DDD primitives |
| Principle 2: Clean Architecture | .NET 9 project structure naturally enforces layer separation |
| Principle 9: CQRS Ready | MediatR provides CQRS infrastructure without framework lock-in |
| Principle 8: Offline First | React PWA + Service Worker + IndexedDB satisfies offline requirement |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Maintainability | C# strong typing + NetArchTest fitness functions → long-term maintainability |
| Testability | Pure domain layer (no framework) → 90%+ test coverage achievable |
| Performance | .NET 9 native AOT; Dapper read models; ASP.NET Core throughput |
| Offline Availability | PWA Service Worker → 100% offline operation for POS/KDS |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 1, 2, 8, 9 |
| **Quality Attribute** | QAS-MAINT-001, QAS-AVAIL-002 (offline) |
| **Architecture Driver** | TD-001 (Cloud Native), BD-002 (Offline First) |
| **Related ADRs** | ADR-0002, ADR-0005, ADR-0006, ADR-0008 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] Principal Architect has validated DDD pattern support in .NET 9
- [ ] SRE Lead has reviewed container image size and startup time
- [ ] Frontend Lead has validated PWA offline feasibility on target POS devices
- [ ] Hiring impact reviewed (talent availability in target markets)
- [ ] License review: all chosen frameworks are open-source with compatible licenses
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft |
