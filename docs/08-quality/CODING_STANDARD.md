# Coding Standard — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define language-agnostic coding standards for all Restaurants OS development |
| **Scope**          | All source code — domain, application, infrastructure, tests |
| **Status**         | Draft |
| **Owner**          | Architecture Board |
| **Assumptions**    | Language-specific standards extend this baseline |
| **Constraints**    | Standards enforced via linting in CI pipeline |
| **Risks**          | Inconsistent application across teams |
| **References**     | Clean Code (Martin), [Architecture Principles](../02-architecture/00-architecture-principles.md) |
| **Related Documents** | [standards/coding-standards.md](../../standards/coding-standards.md), [QUALITY_GATE](QUALITY_GATE.md) |

---

## Naming

- Classes and types: `PascalCase`
- Methods and properties: `PascalCase` (public), `camelCase` (private)
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Domain events: `PascalCase`, past tense (e.g., `OrderPlaced`)
- Aggregates: Named after domain concept (e.g., `Order`, `Menu`, not `OrderEntity`)

---

## Methods

- Maximum 20 lines per method (excluding whitespace and comments)
- Cyclomatic complexity ≤ 10
- Single responsibility: one reason to change
- Prefer guard clauses over nested ifs
- No method with more than 4 parameters; use a parameter object

---

## Classes

- Single responsibility
- No god classes — if a class exceeds 200 lines, review for SRP violation
- Prefer composition over inheritance
- Infrastructure classes: cyclomatic complexity ≤ 3 (FF-005)

---

## Domain Layer Rules

- No infrastructure imports (`using` infrastructure namespaces forbidden in domain)
- No framework annotations on domain entities or aggregates
- Aggregates expose only behavior (methods), not setters
- Value objects are immutable
- Domain events are immutable records

---

## Testing

- Test names: `{Method}_{Scenario}_{ExpectedBehavior}` (e.g., `PlaceOrder_WithNoLines_ThrowsDomainException`)
- Arrange / Act / Assert structure mandatory
- No production logic in test helpers
- One assert per test (prefer; exceptions documented)
- Domain tests: in-memory only — no database, no network

---

## Comments

- Code must be self-documenting; comments explain WHY, not WHAT
- No commented-out code in production code
- All public API surfaces must have documentation comments
- ADR references in comments for non-obvious architectural choices: `// See ADR-0003`

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial coding standard |
