# Metrics Catalog — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the metrics catalog — RED method, USE method, and business KPI metrics emitted by all modules |
| **Scope**          | All modules and platform services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | Metrics are emitted via OpenTelemetry; no proprietary metric SDKs |
| **Constraints**    | All metric names must follow the naming convention; cardinality must be controlled |
| **Risks**          | High cardinality metrics causing metric store issues; missing key metrics |
| **References**     | [SRE](SRE.md), OpenTelemetry Metrics Specification |
| **Related Documents** | [TRACING](TRACING.md), [HEALTH_CHECKS](HEALTH_CHECKS.md) |

---

## Metric Naming Convention

```
restaurants_os_{module}_{metric_name}_{unit}

Examples:
  restaurants_os_order_created_total
  restaurants_os_order_request_duration_seconds
  restaurants_os_kitchen_ticket_duration_seconds
  restaurants_os_inventory_stock_level_items
```

---

## RED Method (Per Service)

| Metric | Type | Description |
|---|---|---|
| `{module}_request_total` | Counter | Total requests received |
| `{module}_request_errors_total` | Counter | Total error responses |
| `{module}_request_duration_seconds` | Histogram | Request duration (p50, p95, p99) |

---

## USE Method (Infrastructure)

| Metric | Type | Description |
|---|---|---|
| `node_cpu_utilization` | Gauge | CPU utilization per pod |
| `node_memory_utilization` | Gauge | Memory usage per pod |
| `container_restarts_total` | Counter | Pod restart count |
| `event_bus_queue_depth` | Gauge | Pending events per queue |

---

## Business KPI Metrics

| Metric | Type | Description |
|---|---|---|
| `restaurants_os_order_created_total` | Counter | Orders created per tenant/branch |
| `restaurants_os_order_value_total` | Counter | Total order value (currency units) |
| `restaurants_os_kitchen_ticket_duration_seconds` | Histogram | Time from order to kitchen completion |
| `restaurants_os_menu_published_total` | Counter | Menu publication events |
| `restaurants_os_payment_processed_total` | Counter | Payments processed per tender type |
| `restaurants_os_refund_issued_total` | Counter | Refunds issued |
| `restaurants_os_void_total` | Counter | Voids processed |
| `restaurants_os_inventory_stock_low_total` | Counter | Low stock events fired |

---

## Alerting Thresholds (Starter)

| Metric | Alert Condition | Severity |
|---|---|---|
| `request_errors_total` | Error rate > 1% over 5 minutes | Warning |
| `request_errors_total` | Error rate > 5% over 2 minutes | Critical |
| `request_duration_seconds` | p99 > 500ms | Warning |
| `container_restarts_total` | > 3 restarts in 10 minutes | Critical |
| `event_bus_queue_depth` | > 1000 pending events | Warning |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial metrics catalog |
