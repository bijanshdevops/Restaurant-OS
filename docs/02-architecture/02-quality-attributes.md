# Quality Attributes — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the quality attribute utility tree for Restaurants OS |
| **Scope**          | All system quality concerns |
| **Status**         | Draft |
| **Owner**          | Principal Architect |
| **Assumptions**    | Priority order reflects business constraints |
| **Constraints**    | All quality attributes must have measurable scenarios in QAS |
| **Risks**          | Quality attributes not consulted during design; trade-offs not made explicit |
| **References**     | [Quality Attribute Scenarios](00-quality-attribute-scenarios.md) |
| **Related Documents** | [Architecture Metrics](../08-quality/ARCHITECTURE_METRICS.md) |

---

## Quality Attribute Utility Tree

```
Quality
├── Runtime Quality
│   ├── Availability (99.9% monthly — highest priority)
│   ├── Reliability (zero data loss, event delivery guarantee)
│   ├── Performance
│   │   ├── Latency (order creation p99 < 300ms)
│   │   └── Throughput (multi-location concurrent operations)
│   └── Security
│       ├── Tenant Isolation (structural)
│       └── Data Privacy (PII handling)
│
├── Structural Quality
│   ├── Maintainability
│   │   ├── Modularity (fitness functions)
│   │   ├── Testability (90%+ domain coverage)
│   │   └── Understandability (DDD, documented ADRs)
│   ├── Extensibility (plugin architecture)
│   └── Scalability (horizontal scaling per module)
│
└── Operational Quality
    ├── Observability (OpenTelemetry traces, metrics, logs)
    ├── Deployability (independent module deployments Phase 3+)
    ├── Recoverability (MTTR < 15 minutes)
    └── Compliance (audit trails, financial accuracy)
```

---

## Priority Order

In cases of conflict, quality attributes are prioritized:

1. Correctness (financial, domain invariants)
2. Reliability (data durability)
3. Availability
4. Security
5. Maintainability
6. Performance
7. Scalability
8. Extensibility

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial utility tree |
