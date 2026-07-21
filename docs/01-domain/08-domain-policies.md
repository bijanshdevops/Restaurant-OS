# Domain Policies — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document business policies — rules that react to domain events and trigger further actions or Sagas |
| **Scope**          | All cross-aggregate and cross-context process flows |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Policies are reactive; they respond to events, not commands |
| **Constraints**    | Policies must not contain business logic beyond routing; logic lives in aggregates |
| **Risks**          | Sagas becoming overly complex; policy chains creating implicit coupling |
| **References**     | [Domain Events](05-domain-events.md), [Integration Patterns](../05-api/INTEGRATION_PATTERNS.md) |
| **Related Documents** | [Domain Services](07-domain-services.md), [Context Map](03-context-map.md) |

---

## Policy Format

Each policy documents:
- **Trigger**: The domain event that activates this policy
- **Action**: What the policy does in response
- **Pattern**: Saga, Process Manager, or Simple Reaction
- **Context**: Where this policy lives

---

## POLICY-001: Order → Kitchen Routing

**Trigger**: `OrderSentToKitchen`  
**Action**: Create a `KitchenTicket` for each station group in the order. Route each ticket to the appropriate KDS.  
**Pattern**: Simple Reaction  
**Context**: Kitchen Context (reacts to Order Context event via event bus)

---

## POLICY-002: Order → Accounting Entry

**Trigger**: `OrderCompleted`  
**Action**: Post a balanced journal entry — debit Accounts Receivable / credit Revenue and Tax Payable.  
**Pattern**: Simple Reaction  
**Context**: Accounting Context

---

## POLICY-003: Kitchen → Inventory Deduction

**Trigger**: `ItemProduced`  
**Action**: Deduct ingredient quantities from branch inventory using the item's recipe yield.  
**Pattern**: Simple Reaction  
**Context**: Inventory Context

---

## POLICY-004: Low Stock → Purchase Order Suggestion

**Trigger**: `StockLevelLow`  
**Action**: Generate a suggested purchase order for the depleted ingredient. Notify the branch manager.  
**Pattern**: Simple Reaction  
**Context**: Procurement Context

---

## POLICY-005: Order Cancellation Saga

**Trigger**: `OrderCancelled`  
**Actions**:
1. Cancel associated KitchenTicket (Kitchen Context)
2. Reverse inventory deductions if production started (Inventory Context)
3. Post reversal journal entry (Accounting Context)
4. Issue refund if payment was taken (Order Context)

**Pattern**: Saga (choreography-based)  
**Compensating Actions**: Each step has a defined compensation if it fails.

---

## POLICY-006: Period Close Royalty Calculation

**Trigger**: `PeriodClosed`  
**Action**: Calculate royalty for each franchisee in the period; post royalty journal entry; notify franchisee.  
**Pattern**: Process Manager  
**Context**: Franchise Context → Accounting Context

---

## POLICY-007: Franchisee Onboarding Saga

**Trigger**: Franchisee onboarding request submitted  
**Actions**:
1. Create tenant and identity records (Identity Platform)
2. Clone brand menu template (Menu Context)
3. Assign territory (Franchise Context)
4. Create initial chart of accounts (Accounting Context)
5. Notify franchisee onboarding complete

**Pattern**: Saga (orchestration-based)  
**Context**: Franchise Context orchestrates

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial policy catalog with 7 policies |
