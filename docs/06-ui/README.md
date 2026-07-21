# UI Platform — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Overview of the UI platform strategy for Restaurants OS |
| **Scope**          | All user-facing interfaces: POS, KDS, Management Portal |
| **Status**         | Draft |
| **Owner**          | UI Lead |
| **Assumptions**    | Web-first; native wrappers for POS/KDS where required |
| **Constraints**    | POS must function offline; KDS requires real-time updates |
| **Risks**          | UI technology choices creating maintenance burden |
| **References**     | [Architecture Principles](../02-architecture/00-architecture-principles.md) |
| **Related Documents** | [PLUGIN_PLATFORM](../04-platform/PLUGIN_PLATFORM.md), [Deployment View](../02-architecture/08-deployment-view.md) |

---

## UI Surfaces

| Surface | Primary Users | Offline Required | Real-time Required |
|---|---|---|---|
| POS Terminal | Waiters, Cashiers | Yes | Yes (order updates) |
| Kitchen Display System (KDS) | Kitchen Staff | Yes | Yes (ticket updates) |
| Management Portal | Managers, Owners | No | Yes (dashboards) |
| Franchise Portal | Franchise Admins | No | No |
| Configuration Portal | Tenant Admins | No | No |

---

## Design Principles

1. **Offline First** — POS and KDS must work without network connectivity
2. **Performance** — POS interactions < 100ms perceived response time
3. **Accessibility** — WCAG 2.1 AA compliance
4. **Pluggable** — UI extension points for plugin-contributed components
5. **Brand-aware** — UI must support per-brand theming

---

## Technology Decisions

Technology choices for UI are TBD — require RFC and ADR process.

Considerations:
- Progressive Web App (PWA) for offline support
- WebSockets / Server-Sent Events for real-time updates
- Design system: TBD

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | UI Lead | Initial UI platform overview |
