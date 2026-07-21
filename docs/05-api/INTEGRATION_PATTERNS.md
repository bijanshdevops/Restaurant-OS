# Integration Patterns — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document the integration patterns used in Restaurants OS with guidance on when to use each |
| **Scope**          | All cross-context and external system integration |
| **Status**         | Draft |
| **Owner**          | API Guild Lead |
| **Assumptions**    | Event-driven is the default; synchronous REST for user-initiated flows only |
| **Constraints**    | No direct cross-module database access; all integration through events or APIs |
| **Risks**          | Pattern proliferation; wrong pattern chosen for integration scenario |
| **References**     | Enterprise Integration Patterns (Hohpe & Woolf), [Context Map](../01-domain/03-context-map.md) |
| **Related Documents** | [EVENT_CATALOG](EVENT_CATALOG.md), [MESSAGE_CONTRACTS](MESSAGE_CONTRACTS.md) |

---

## Pattern: Outbox

**Use When**: Publishing domain events reliably — event must be published even if the message broker is temporarily unavailable.

**How**: Write event to outbox table in same transaction as domain state change. Background relay reads outbox and publishes to event bus. Guarantees at-least-once delivery.

**Applied To**: All domain event publishing in all modules.

---

## Pattern: Saga (Choreography)

**Use When**: Coordinating a multi-step business process across Bounded Contexts where each step is triggered by the previous step's event.

**How**: Each context publishes an event when its step completes. The next context reacts to that event. No central coordinator.

**Applied To**: Order Cancellation Saga (POLICY-005), Inventory → Procurement reorder flow.

**Trade-off**: Harder to see the full flow; compensating transactions must be designed upfront.

---

## Pattern: Saga (Orchestration)

**Use When**: A single context needs to coordinate a complex multi-step flow and needs visibility into the overall state.

**How**: Orchestrator issues commands to other contexts and reacts to their responses.

**Applied To**: Franchisee Onboarding Saga (POLICY-007).

---

## Pattern: Anti-Corruption Layer (ACL)

**Use When**: A downstream context needs to integrate with an upstream context but must not adopt the upstream model.

**How**: A translation layer in the downstream context maps upstream events/data to the downstream ubiquitous language.

**Applied To**: Franchise Context → Menu Context (franchise enforces brand menu standards without exposing franchise model to menu context).

---

## Pattern: Published Language

**Use When**: An upstream context publishes a well-defined, versioned event schema that downstream contexts consume.

**How**: Upstream owns the schema; downstream consumes without negotiation. Schema changes follow versioning policy.

**Applied To**: All standard event publishing (Order → Kitchen, Order → Accounting).

---

## Pattern: Open Host Service

**Use When**: A platform service needs to serve many consumers with a stable, documented API.

**Applied To**: Identity Platform, Configuration Platform, Storage Platform — all platform services.

---

## Pattern: Request-Response (REST)

**Use When**: A synchronous response is required by the caller within the same user interaction.

**Applied To**: All user-initiated API calls (create order, publish menu, etc.). Not used for cross-module integration.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | API Guild Lead | Initial integration pattern catalog |
