# Naming Conventions — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Enterprise-wide naming conventions for all artifacts — files, directories, branches, events, APIs, modules |
| **Scope**          | All artifacts in the repository and runtime |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | Conventions apply universally; language-specific extensions are permitted |
| **Constraints**    | Enforced in CI pipeline and architecture fitness functions |
| **Risks**          | Convention ignored; inconsistent names across modules |
| **References**     | [Coding Standards](coding-standards.md), [Event Standards](event-standards.md) |
| **Related Documents** | [Documentation Standards](documentation-standards.md) |

---

## File and Directory Naming

| Artifact | Convention | Example |
|---|---|---|
| Documentation files | `UPPER_SNAKE_CASE.md` or `kebab-case.md` | `ARCHITECTURE_BOARD.md`, `doc-template.md` |
| ADR files | `ADR-NNNN-kebab-case-title.md` | `ADR-0001-modular-monolith-first.md` |
| RFC files | `RFC-NNNN-kebab-case-title.md` | `RFC-0001-platform-architecture-overview.md` |
| Directories | `NN-kebab-case` (docs) or `kebab-case` | `00-product`, `reference-models` |

---

## Module Naming

| Artifact | Convention | Example |
|---|---|---|
| Module name | `kebab-case` | `order-module`, `menu-module` |
| Module namespace (code) | `PascalCase.PascalCase` | `RestaurantsOs.Order` |
| Module assembly / package | `kebab-case` | `restaurants-os-order` |

---

## Event Naming

See [event-standards.md](event-standards.md).

| Artifact | Convention | Example |
|---|---|---|
| Domain event class | `{Aggregate}{PastVerb}` | `OrderPlaced`, `MenuPublished` |
| Event type string | `{context}.{EventName}` | `order.OrderPlaced` |

---

## API Naming

See [api-standards.md](api-standards.md).

| Artifact | Convention | Example |
|---|---|---|
| URL segments | `kebab-case` | `/menu-items`, `/order-lines` |
| Query parameters | `camelCase` | `?pageSize=50&sortBy=createdAt` |
| Response fields | `camelCase` | `orderId`, `totalAmount` |

---

## Branch Naming (Git)

| Branch Type | Pattern | Example |
|---|---|---|
| Feature | `feature/{issue-id}-short-description` | `feature/123-order-placement` |
| Fix | `fix/{issue-id}-short-description` | `fix/456-menu-price-bug` |
| ADR | `adr/ADR-NNNN-short-title` | `adr/ADR-0006-database-choice` |
| RFC | `rfc/RFC-NNNN-short-title` | `rfc/RFC-0002-ui-technology` |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial naming conventions |
