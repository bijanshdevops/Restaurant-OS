# ADR-0010: Plugin Architecture

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the plugin architecture model — how third-party and tenant-custom extensions integrate with Restaurants OS without compromising core domain integrity |
| **Scope**          | All extensibility mechanisms across the platform |
| **Status**         | Draft |
| **Owner**          | Platform Lead + Principal Architect |
| **Assumptions**    | Plugin isolation is non-negotiable — a misbehaving plugin must never crash or corrupt core operations; extension points are explicit contracts, not internal APIs |
| **Constraints**    | Plugins cannot access internal domain objects directly; plugins are subject to timeouts; plugins cannot participate in database transactions |
| **Risks**          | Plugin execution causing cascading failures; plugin bypassing tenant isolation; plugin accessing another tenant's data |
| **References**     | [Plugin Platform](../../docs/04-platform/PLUGIN_PLATFORM.md), [Plugin Reference Model](../../architecture/reference-models/plugin-reference-model.md), [ADR-0002](ADR-0002-ddd-and-clean-architecture.md) |
| **Related Documents** | [ADR-0003](ADR-0003-event-driven-integration.md), [ADR-0009](ADR-0009-identity-and-access-management.md) |

---

## Context

Restaurants OS serves diverse restaurant models — single restaurants, chains, franchises, cloud kitchens, multi-brand groups. Each has unique workflows: custom loyalty rules, bespoke integrations (delivery platforms, ERP systems, local payment providers), white-label UIs, and custom reporting. The core platform cannot anticipate every variant without becoming unmaintainable. A plugin architecture enables customisation without modifying core.

## Problem Statement

What plugin model allows third-party and tenant-custom extensions to safely extend Restaurants OS behaviour — at defined hook points — without being able to corrupt domain invariants, access cross-tenant data, or cause core operations to fail?

---

## Alternatives Considered

### Option A: In-Process Hook-Based Plugin Host (Recommended)

Plugins run in the same process as the application but are isolated via:
- Hook interface contracts (plugins implement a defined interface, not arbitrary code)
- Execution wrapped in try/catch with configurable timeout
- Plugin context object (public DTO only — no domain objects exposed)
- Tenant-scoped plugin execution (a plugin registered for Tenant A cannot be invoked for Tenant B)

**Pros**: Low latency (no network hop); simple deployment (plugins are NuGet packages or loaded assemblies); easy debugging; no inter-process communication

**Cons**: A malicious or buggy plugin could consume excessive CPU/memory in the same process (mitigated by timeout + circuit breaker)

---

### Option B: Out-of-Process Plugin Host (Sidecar / Subprocess)

Plugins run in a separate process; communication via gRPC or HTTP.

**Pros**: Complete process isolation; plugin crash doesn't affect core process

**Cons**: Network latency per hook call (unacceptable for POS workflows < 100ms); complex deployment; plugin process lifecycle management; excessive operational overhead for Phase 1

---

### Option C: Webhook-Based Extensions

Plugins register webhooks; the platform posts events to the plugin's HTTP endpoint.

**Pros**: Language-agnostic; complete isolation; third-party hosting possible

**Cons**: Network latency; reliability dependency on third-party endpoint; not suitable for synchronous workflow hooks (e.g., custom pricing calculation before order is placed)

---

### Option D: Script Engine (Lua / JavaScript)

Plugins are scripts executed in a sandboxed engine.

**Pros**: Dynamic; no deployment required; tenant-configurable

**Cons**: Complex sandboxing; performance overhead; limited capability; not suitable for complex integrations

---

## Decision

> **We adopt an in-process hook-based plugin host (Option A) for synchronous workflow hooks.**
> **We adopt a webhook model (Option C) for asynchronous notification hooks.**

**Two-tier plugin model**:

| Tier | Model | Use Case |
|---|---|---|
| **Sync hooks** | In-process, interface-based | Before/after order placement, pricing overrides, validation rules |
| **Async hooks** | Event-driven webhooks | Notifications, ERP sync, loyalty points, delivery platform push |

**Plugin Contract Rules**:
1. Plugins implement a typed interface: `IOrderPlacedHook`, `ICustomPricingHook`, etc.
2. Extension points expose a **Plugin Context DTO** — never a domain aggregate or entity
3. Plugins are registered per tenant — a plugin cannot receive another tenant's context
4. Sync hooks: 500ms timeout (configurable per hook); circuit breaker after 3 consecutive failures (30-second open window)
5. Plugin failures are logged and monitored; they never roll back the core transaction
6. All plugin assemblies are code-reviewed and signed before deployment

**Plugin Lifecycle**:
```
Plugin Manifest → Architecture Review → Approved → Signed Package → Deployed to Plugin Registry
                                                                        ↓
                                                        Tenant activates via Config Portal
                                                                        ↓
                                                        Plugin loaded on next application restart
```

**Plugin Manifest** (required for every plugin):
```json
{
  "name": "MyLoyaltyPlugin",
  "version": "1.0.0",
  "publisher": "Tenant Name / ISV Name",
  "hooks": ["IOrderPlacedHook"],
  "permissions": ["read:order-summary"],
  "timeout_ms": 300,
  "webhooks": []
}
```

---

## Consequences

### Positive
- Core domain invariants are always enforced — plugins cannot bypass them
- Sync hooks enable real-time customisation (custom pricing, order validation) at < 500ms
- Async webhooks enable integration with any external system
- Tenant isolation is structural — plugin context always includes `tenantId` and is scoped

### Negative
- In-process plugins share memory with core application — extreme plugin bugs could affect memory
- Plugin review and signing process adds deployment overhead
- 500ms timeout may be too tight for complex integrations — some plugins will need to go async

### Neutral
- Plugin architecture requires careful documentation of all extension points before implementation

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Sync (low latency) vs. out-of-process (isolation) | In-process sync for workflow hooks; accept the risk, mitigate with timeout + circuit breaker |
| Developer flexibility vs. domain safety | Safety first — plugins get DTOs, not domain objects |
| Plugin power vs. simplicity | Limited permissions model — plugins declare what they need |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Plugin timeout causing POS order delay | Medium | High | Circuit breaker; async fallback for non-critical hooks |
| Plugin bypassing tenant isolation | Low | Critical | Plugin context always scoped to tenant; no raw DB access |
| Unsigned plugin deployed | Low | Critical | Registry enforces signing; deployment pipeline validates signature |
| Plugin consuming excessive memory | Low | High | Memory budget per plugin (configurable); monitoring alert |
| Webhook endpoint availability | Medium | Low | Retry with exponential backoff; dead-letter queue; not blocking core |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 2: Clean Architecture | Plugins operate at Application Layer boundary via hook interfaces |
| Principle 4: Multi-Tenant by Design | Plugin context is tenant-scoped; cross-tenant execution is structurally impossible |
| Principle 5: Security by Design | Signed plugins; limited permissions; isolated execution |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Extensibility | Plugin architecture is the primary extensibility mechanism |
| Reliability | Circuit breaker prevents plugin failures cascading to core |
| Security | Tenant-scoped context prevents cross-tenant data access |
| Performance | 500ms budget per sync hook; async webhooks for heavy integrations |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 2, 4, 5 |
| **Business Capability** | CAP-04-03: Plugin & Extension Engine |
| **Related ADRs** | ADR-0002, ADR-0003, ADR-0009 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] Security Architect has reviewed plugin execution isolation model
- [ ] Platform Lead has reviewed plugin manifest and registry model
- [ ] SRE Lead has reviewed timeout and circuit breaker configuration
- [ ] All extension points documented in Plugin Platform before any plugin host implementation
- [ ] Plugin signing process reviewed and approved
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Platform Lead | Initial draft |
