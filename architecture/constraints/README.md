# Architecture Constraints — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Hard architectural constraints that may never be violated without an Architecture Board exception |
| **Scope**          | All source code, infrastructure, and integration |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Constraints are absolute; violations are architecture defects |
| **Constraints**    | N/A — this document is itself a constraint document |
| **Risks**          | Constraints violated under time pressure; undocumented exceptions |
| **References**     | [Architecture Principles](../principles/README.md), [Architecture Fitness Functions](../../docs/08-quality/ARCHITECTURE_FITNESS_FUNCTIONS.md) |
| **Related Documents** | [REPOSITORY_RULES](../../REPOSITORY_RULES.md), [standards/](../../standards/) |

---

## Hard Constraints

These constraints have zero tolerance. A single violation is a critical defect.

| ID | Constraint | Fitness Function | Source |
|---|---|---|---|
| HC-001 | No cross-module direct database access | FF-001 | ADR-0003 |
| HC-002 | Domain layer has zero infrastructure imports | FF-002 | ADR-0002 |
| HC-003 | No hardcoded secrets, credentials, or tenant IDs | FF-010 | Security Standards |
| HC-004 | All repository queries must include tenant filter | FF-013 | ADR-0004 |
| HC-005 | No circular module dependencies | FF-007 | Architecture Principles |
| HC-006 | No source code produced before documentation is Approved | — | REPOSITORY_RULES Rule 1 |
| HC-007 | All cross-module integration via domain events only | FF-001 | ADR-0003 |
| HC-008 | All domain events named in past tense | FF-004 | Event Standards |

---

## Soft Constraints (Architectural Guidelines)

These are strong guidelines; exceptions require documented rationale in a PR.

| ID | Guideline | Threshold | Source |
|---|---|---|---|
| SC-001 | Aggregate child entity count | ≤ 10 (FF-006) | Domain Reference Model |
| SC-002 | Synchronous call depth within a module | ≤ 5 (FF-003) | Architecture Metrics |
| SC-003 | Infrastructure class complexity | ≤ 3 (FF-005) | Architecture Metrics |
| SC-004 | Domain layer test coverage | ≥ 90% (FF-009) | Quality Gate |
| SC-005 | Cross-module event fan-out | ≤ 8 (FF-012) | Architecture Metrics |

---

## Exception Process

If a hard constraint must be violated:
1. Raise an Architecture Question issue
2. Create an ADR documenting the exception, rationale, and time-bound mitigation plan
3. Architecture Board must vote unanimously to approve the exception
4. Exception is tracked in the decision log with a resolution deadline

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial constraints registry — Approved |
