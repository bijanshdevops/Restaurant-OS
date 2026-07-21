# Decision Process — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the end-to-end architecture decision-making process — from idea to approved ADR |
| **Scope**          | All architectural decisions |
| **Status**         | Approved |
| **Owner**          | Architecture Board |
| **Assumptions**    | RFC and ADR processes are followed; no implementation before approval |
| **Constraints**    | No source code produced before corresponding ADR is Approved (REPOSITORY_RULES.md Rule 1) |
| **Risks**          | Process bypassed; decisions made informally and not documented |
| **References**     | [ARCHITECTURE_BOARD](ARCHITECTURE_BOARD.md), [REPOSITORY_RULES](../REPOSITORY_RULES.md) |
| **Related Documents** | [ADR Template](../templates/ADR_TEMPLATE.md), [RFC Template](../templates/RFC_TEMPLATE.md) |

---

## Decision Lifecycle

```
IDEA
  │
  ▼
Need a decision?
  │
  ├── Small, reversible, tactical → ADR (no RFC needed)
  │
  └── Large, strategic, or cross-cutting → RFC First
        │
        ▼
      RFC Created (Author)
        │
        ▼
      RFC Review Period (≥ 5 business days)
        │
        ▼
      Architecture Board Closes RFC
        │
        ├── Rejected → Record rationale
        │
        └── Accepted → Author creates ADR
                │
                ▼
              ADR Created (Author)
                │
                ▼
              Architecture Board Reviews ADR
                │
                ├── Rejected → Return with feedback
                │
                ├── Approved with Conditions → Author addresses conditions
                │
                └── Approved → ADR is binding
                        │
                        ▼
                      Implementation may begin
```

---

## Decision Categories

| Category | Examples | Requires RFC | Requires ADR |
|---|---|---|---|
| Strategic | Technology stack, architecture style, platform design | Yes | Yes |
| Tactical | Module design, pattern adoption, API design | No | Yes |
| Operational | Tool selection, runbook, configuration | No | Yes (if persistent) |

---

## ADR Status Lifecycle

```
Draft → In Review → Approved / Rejected → Deprecated → Superseded
```

---

## RFC Status Lifecycle

```
Draft → Open for Comment → Closed (Accepted / Rejected / Deferred)
```

---

## SLA Targets

| Activity | Target |
|---|---|
| First review of submitted RFC | 3 business days |
| RFC comment period | 5 business days minimum |
| ADR review and decision | 5 business days |
| Architecture Board meeting to decision | Same meeting or next meeting |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial decision process |
