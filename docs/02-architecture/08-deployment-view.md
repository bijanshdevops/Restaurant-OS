# Deployment View — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Document the deployment topology for Restaurants OS on Kubernetes |
| **Scope**          | Phase 1-2 deployment target; evolution noted |
| **Status**         | Draft |
| **Owner**          | SRE Lead + Principal Architect |
| **Assumptions**    | Cloud-native deployment on Kubernetes; cloud provider TBD |
| **Constraints**    | Edge deployments for Kitchen module must support disconnected operation |
| **Risks**          | Cloud provider lock-in; edge deployment complexity |
| **References**     | [SRE](../07-devops/SRE.md), [CI_CD](../07-devops/CI_CD.md) |
| **Related Documents** | [Container View](05-container-view.md), [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md) |

---

## Deployment Topology (Phase 1-2)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUD REGION (Primary)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Kubernetes Cluster                      │   │
│  │                                                          │   │
│  │  ┌───────────────┐  ┌───────────────┐                  │   │
│  │  │  API Gateway  │  │  Identity     │                  │   │
│  │  │  (Ingress)    │  │  Service      │                  │   │
│  │  └───────────────┘  └───────────────┘                  │   │
│  │                                                          │   │
│  │  ┌───────────────────────────────────┐                  │   │
│  │  │    Core Application (Modular       │                  │   │
│  │  │    Monolith Deployment Unit)       │                  │   │
│  │  │  [Menu][Order][Table][Guest][Staff]│                  │   │
│  │  └───────────────────────────────────┘                  │   │
│  │                                                          │   │
│  │  ┌───────────────┐  ┌───────────────┐                  │   │
│  │  │  Config       │  │  Plugin Host  │                  │   │
│  │  │  Service      │  │               │                  │   │
│  │  └───────────────┘  └───────────────┘                  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     BRANCH EDGE (Per Location)                  │
│                                                                 │
│  ┌─────────────────┐   ┌────────────────────────────────────┐  │
│  │  POS Terminals  │   │  Kitchen Edge Node                 │  │
│  │  (Web / Native) │   │  Kitchen Module (offline-capable)  │  │
│  │                 │   │  Local Event Store                 │  │
│  └─────────────────┘   └────────────────────────────────────┘  │
│                                                                 │
│                    Sync Agent (background)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kubernetes Resources (Phase 1 — indicative)

| Resource | Description |
|---|---|
| `Deployment: core-app` | Main application pods (2+ replicas) |
| `Deployment: api-gateway` | Ingress controller |
| `Deployment: identity-service` | Auth service pods |
| `Deployment: config-service` | Configuration service |
| `Service: core-app` | Internal ClusterIP service |
| `Ingress: restaurants-os` | External HTTPS entry point |
| `HorizontalPodAutoscaler` | Scale core-app on CPU/RPS |
| `PersistentVolumeClaim` | Durable storage for event store |

---

## Health Check Strategy

- **Liveness probe**: Fails → pod restart (catches deadlocks)
- **Readiness probe**: Fails → removed from load balancer (catches startup, dependency issues)
- **Startup probe**: Allows slow startup without triggering liveness

See [HEALTH_CHECKS.md](../07-devops/HEALTH_CHECKS.md) for probe definitions.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial deployment view |
