# Deployment Reference Model — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Canonical reference model for deployment topologies across all phases |
| **Scope**          | All deployment environments |
| **Status**         | Draft |
| **Owner**          | SRE Lead + Principal Architect |
| **Assumptions**    | Cloud-native, Kubernetes-first deployment |
| **Constraints**    | Edge deployment required for Kitchen and POS; offline-first mandatory |
| **Risks**          | Edge deployment complexity; sync conflicts |
| **References**     | [Deployment View](../../docs/02-architecture/08-deployment-view.md), [ADR-0001](../../adr/strategic/ADR-0001-modular-monolith-first.md) |
| **Related Documents** | [Evolution Roadmap](../../docs/02-architecture/09-evolution-roadmap.md) |

---

## Standard Deployment Patterns

### Pattern 1: Cloud-Native (Core Application)

```
Kubernetes Cluster
  ├── Deployment (core-app, 2+ replicas)
  ├── HPA (scale on RPS / CPU)
  ├── Service (ClusterIP)
  ├── Ingress (HTTPS)
  └── ConfigMap + Secret (externalized config)
```

### Pattern 2: Edge Deployment (Kitchen / POS)

```
Branch Edge Node
  ├── Edge App Container (Kitchen Module)
  ├── Local Event Store (SQLite / embedded)
  ├── Sync Agent (background process)
  │     └── Sync queue → Cloud Event Bus (when connected)
  └── Offline Mode (100% functional without network)
```

### Pattern 3: Platform Services

```
Kubernetes Cluster (isolated namespace)
  ├── Identity Service (high-availability, 99.99% SLO)
  ├── Configuration Service
  ├── Plugin Host
  └── Audit Service
```

---

## Environment Tiers

| Tier | Purpose | Data | Replication |
|---|---|---|---|
| `dev` | Development and integration | Synthetic | No |
| `staging` | Pre-production validation | Anonymized production | No |
| `production` | Live tenant data | Real | Yes (multi-AZ) |
| `dr` | Disaster recovery standby | Replicated production | Yes |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial deployment reference model |
