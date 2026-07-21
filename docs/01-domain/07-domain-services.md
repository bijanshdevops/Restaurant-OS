# Domain Services — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Catalog domain services — stateless operations that do not belong to a single entity or aggregate |
| **Scope**          | All Bounded Contexts |
| **Status**         | Draft |
| **Owner**          | Domain Architects |
| **Assumptions**    | Domain services are stateless; state lives in aggregates |
| **Constraints**    | Domain services must not depend on infrastructure; use application-layer services for that |
| **Risks**          | Logic that belongs in aggregates placed in services (anaemic domain model) |
| **References**     | [Aggregates](06-aggregates.md), Implementing Domain-Driven Design (Vernon) |
| **Related Documents** | [Domain Policies](08-domain-policies.md) |

---

## Menu Context

### PricingService
**Purpose**: Calculate the effective price of an item given applicable price rules, time, channel, and tenant configuration.  
**Input**: `MenuItem`, `PriceContext` (time, channel, loyalty tier)  
**Output**: `EffectivePrice`  
**Placement**: Menu Context, Domain Layer

### MenuAvailabilityService
**Purpose**: Determine whether a menu item is available for ordering given branch, time, and stock.  
**Input**: `MenuItem`, `Branch`, `DateTime`  
**Output**: `AvailabilityStatus`

---

## Order Context

### OrderTotalizationService
**Purpose**: Calculate order total, tax, discounts, and tender allocation.  
**Input**: `Order`, `TaxPolicy`, `AppliedDiscounts`  
**Output**: `OrderFinancialSummary`

### RefundCalculationService
**Purpose**: Calculate refund amount given refund policy and original payment.  
**Input**: `Order`, `RefundRequest`, `RefundPolicy`  
**Output**: `RefundAmount`

---

## Accounting Context

### JournalEntryFactory
**Purpose**: Construct a balanced journal entry from a business event (e.g., order completion, refund).  
**Input**: `BusinessEvent`, `ChartOfAccounts`  
**Output**: `JournalEntry` (pre-validation, debit=credit)

### RoyaltyCalculationService
**Purpose**: Calculate franchise royalty amount from revenue for a period.  
**Input**: `FranchiseAgreement`, `PeriodRevenue`  
**Output**: `RoyaltyStatement`

---

## Inventory Context

### IngredientDeductionService
**Purpose**: Deduct ingredient quantities based on recipe yield when an item is produced.  
**Input**: `Recipe`, `QuantityProduced`, `CurrentStock`  
**Output**: `StockAdjustments`

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Domain Architects | Initial domain services catalog |
