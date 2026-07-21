# Health Checks — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define health probe design for all services — liveness, readiness, and startup probes aligned to Kubernetes |
| **Scope**          | All modules and platform services |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | Services run in Kubernetes; health probes are consumed by Kubernetes |
| **Constraints**    | Liveness probe must never check external dependencies (database, event bus) |
| **Risks**          | Misconfigured probes causing unnecessary pod restarts or keeping broken pods in service |
| **References**     | Kubernetes Probes documentation, [OBSERVABILITY](OBSERVABILITY.md) |
| **Related Documents** | [Deployment View](../02-architecture/08-deployment-view.md), [METRICS](METRICS.md) |

---

## Probe Types

| Probe | Failure Action | Checks |
|---|---|---|
| **Liveness** | Pod restart | Internal process health only (no external deps) |
| **Readiness** | Removed from load balancer | Application ready + dependencies reachable |
| **Startup** | Pod restart (on timeout) | Application started successfully |

---

## Health Check Endpoints

All services must expose:

| Endpoint | Probe | Response |
|---|---|---|
| `GET /health/live` | Liveness | 200 OK (process alive), 503 (restart needed) |
| `GET /health/ready` | Readiness | 200 OK (ready to serve), 503 (not ready) |
| `GET /health/startup` | Startup | 200 OK (started), 503 (still starting) |
| `GET /health` | General | Full health report (internal use only) |

---

## Liveness Check Rules

✅ Check: Application process is running correctly  
✅ Check: No deadlock detected  
✅ Check: Memory usage within bounds  
❌ Do NOT check: Database connectivity  
❌ Do NOT check: Event bus connectivity  
❌ Do NOT check: External service availability

**Rationale**: If the database is down, killing the pod does not fix the database. Only restart the pod if the pod itself is broken.

---

## Readiness Check Rules

✅ Check: Database connection pool is healthy  
✅ Check: Event bus connection is active  
✅ Check: Configuration service is reachable  
✅ Check: Required cache is populated  

**Rationale**: Remove the pod from traffic until it can actually serve requests correctly.

---

## Kubernetes Configuration Template

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
```

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial health check standard |
