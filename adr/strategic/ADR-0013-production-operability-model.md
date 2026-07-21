# ADR-0013: Production Operability Model

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Define the production deployment model, release process, environment strategy, and operational runbook framework for Restaurants OS |
| **Scope**          | All production operations: deployment, release, configuration, incident response |
| **Status**         | Draft |
| **Owner**          | SRE Lead |
| **Assumptions**    | AKS on Azure is the compute platform (ADR-0006); GitOps is the deployment paradigm; zero-downtime deployments are required for all production changes |
| **Constraints**    | POS terminals cannot accept disruptive maintenance windows during service hours (7am–11pm local per branch); financial data in production must never be touched by ad-hoc queries |
| **Risks**          | Deployment causing POS outage during service hours; configuration drift between environments; ad-hoc production changes circumventing governance |
| **References**     | [CI_CD](../../docs/07-devops/CI_CD.md), [SRE](../../docs/07-devops/SRE.md), [BACKUP](../../docs/07-devops/BACKUP.md), [ADR-0011](ADR-0011-observability-strategy.md) |
| **Related Documents** | [ADR-0006](ADR-0006-cloud-platform-selection.md), [ADR-0012](ADR-0012-failure-recovery-model.md), [RELEASE_POLICY](../../governance/RELEASE_POLICY.md) |

---

## Context

Production operations for Restaurants OS must be zero-touch (automated), auditable (everything via GitOps), and safe (deployment to POS-adjacent services must not disrupt active orders). The operational model defines how changes flow from a developer's commit to production, how the environment is configured, and how the team responds to incidents.

## Problem Statement

What deployment paradigm, environment strategy, and operational runbook model should Restaurants OS adopt to ensure safe, auditable, zero-downtime production deployments with rapid incident response?

---

## Alternatives Considered

### Deployment: Option A — GitOps with ArgoCD (Recommended)

**Mechanism**: Git is the single source of truth for all deployment state. ArgoCD continuously reconciles the Kubernetes cluster state with the manifests in the `gitops/` repository. No human logs into the cluster to make changes.

**Pros**:
- All changes auditable via Git history — full deployment audit trail
- Automated drift detection and correction
- Pull-based: cluster pulls from Git → no inbound network access to cluster required
- Built-in rollback: `git revert` → previous state auto-applied
- Multi-environment support (dev, staging, production, DR) as separate ArgoCD Applications

**Cons**:
- Learning curve for teams unfamiliar with GitOps
- Secrets must be managed carefully (GitOps + Sealed Secrets or Azure Key Vault CSI)

---

### Deployment: Option B — CI/CD Push (Azure DevOps Pipelines direct kubectl apply)

**Pros**: Simpler initial setup; familiar to most teams

**Cons**: Pipeline credentials need cluster access (security risk); no drift detection; audit trail only in pipeline logs (not version-controlled state); rollback is harder

---

### Deployment: Option C — Helm + Argo Rollouts (Canary / Blue-Green)

Helm for packaging; Argo Rollouts for progressive delivery.

**Pros**: Fine-grained traffic splitting during rollout; automatic rollback on metric degradation; ideal for zero-downtime requirements

**Cons**: Additional complexity; overkill for Phase 1 (simple rolling update is sufficient)

**Decision**: Rolling updates in Phase 1; introduce Argo Rollouts canary in Phase 2 for high-risk services (payment, identity).

---

## Decision

> **Deployment**: GitOps with ArgoCD
> **Packaging**: Helm charts (per module)
> **Secrets**: Azure Key Vault CSI Driver (secrets injected into pods, not stored in Git)
> **Release strategy**: Rolling update (Phase 1); Canary via Argo Rollouts (Phase 2+ high-risk services)
> **Configuration**: ConfigMaps (non-secret) + Key Vault (secrets); environment-specific overrides via Helm values files
> **Container builds**: Azure Container Registry; images tagged with Git SHA

---

### Environment Strategy

| Environment | Purpose | Data | Refresh Cadence |
|---|---|---|---|
| `dev` | Developer integration; automated | Synthetic (seeded) | Auto-deploy on merge to `main` |
| `staging` | Pre-production validation; performance testing | Anonymised production snapshot | Auto-deploy on release candidate tag |
| `production` | Live tenant workload | Real tenant data | Manual gate (Release Policy) |
| `dr` | Disaster recovery standby | Replicated production | Always current; failover-ready |

**Environment promotion**:
```
Commit → dev (auto) → staging (auto on RC tag) → production (manual gate + Architecture Board sign-off)
```

---

### Deployment Safety Rules

| Rule | Mechanism |
|---|---|
| Zero-downtime rolling update | PodDisruptionBudget: minAvailable 1 at all times |
| No deployment during peak hours | ArgoCD deployment window: blocked 12:00–14:00 and 18:00–22:00 local time |
| Automatic rollback on health probe failure | ArgoCD rollback triggered if rollout readiness probe fails |
| All images signed | Notary v2 image signing; Kubernetes admission webhook validates signature |
| No direct `kubectl apply` in production | RBAC: production cluster access requires break-glass procedure + audit log |

---

### Runbook Framework

All operational procedures are documented as runbooks in `docs/runbooks/`:

| Runbook Category | Examples |
|---|---|
| Deployment | Standard release, hotfix release, rollback |
| Incident | P1 escalation, P2 triage, DLQ drain |
| Database | PITR restore, read replica failover, index rebuild |
| Edge | POS reconnect, SQLite sync reset, terminal re-provisioning |
| Security | Certificate rotation, key vault secret rotation, break-glass activation |

**Runbook standard**:
- Objective and when to use
- Prerequisites
- Step-by-step instructions (numbered)
- Verification steps
- Rollback instructions
- Escalation path

---

### Incident Response Model

| Severity | Response Time | Escalation |
|---|---|---|
| P1 (revenue impact) | < 5 minutes | On-call SRE → SRE Lead → Architecture Board |
| P2 (degraded service) | < 15 minutes | On-call SRE → SRE Lead |
| P3 (non-critical) | < 1 business day | On-call SRE |

**On-call rotation**: Grafana Alerting → PagerDuty → on-call SRE (7x24 coverage)

**Post-Incident Requirements**:
- P1: Post-mortem within 48 hours; action items in GitHub Issues; incident report in `docs/incidents/`
- P2: Incident review within 1 week

---

### Configuration Management

- **Non-sensitive config**: `ConfigMap` in Helm chart values per environment
- **Sensitive config**: Azure Key Vault → AKS Key Vault CSI Driver → pod-mounted secrets
- **Feature flags**: Config Service (ADR platform service) — runtime-toggled, no redeploy required
- **No config in application code** — FF-010 (no hardcoded values)

---

## Consequences

### Positive
- GitOps provides full audit trail of every production state change
- Drift detection ensures production matches declared state at all times
- Deployment windows prevent high-risk changes during service peaks
- Key Vault CSI means secrets are never in Git or container images

### Negative
- GitOps requires team discipline — all changes must go through Git
- ArgoCD adds platform maintenance responsibility
- Break-glass procedure must be documented and tested before go-live

### Neutral
- Feature flags (Config Service) reduce deployment risk by decoupling feature release from code deployment

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| GitOps (auditable, automated) vs. manual kubectl (simpler) | GitOps — audit trail and drift detection justify the setup cost |
| Rolling update (simple) vs. canary (safer) | Rolling update Phase 1; canary Phase 2 for high-risk services |
| ConfigMap vs. Helm values vs. external config | Both: Helm values for environment config; Key Vault for secrets |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Deployment during peak hours causing incident | Low | High | ArgoCD deployment window blocks deployment in peak hours |
| Secrets committed to Git accidentally | Medium | Critical | Gitleaks in CI (Gate 1); Key Vault CSI for all secrets |
| ArgoCD cluster compromised | Low | Critical | Least-privilege ArgoCD service account; network policy |
| Break-glass misused | Low | High | Break-glass access is logged; reviewed in next Architecture Board meeting |
| Runbook missing for a new failure mode | Medium | High | Runbook completeness reviewed in each Architecture Review |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| Principle 5: Security by Design | Secrets in Key Vault; no hardcoded config; RBAC on cluster access |
| Principle 10: Observe Everything | Grafana alerting + PagerDuty is the detection mechanism |

---

## Quality Attribute Impact

| Quality Attribute | Impact |
|---|---|
| Operability | GitOps audit trail; runbook framework; on-call model |
| Reliability | Deployment safety rules; PDB; rollback |
| Security | Image signing; Key Vault CSI; break-glass audit |
| Recoverability | Automated rollback; PITR integration in DR runbooks |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Principle** | Principle 5, 10 |
| **Quality Attribute** | QAS-OPS-001 (MTTR < 15 min), QAS-AVAIL-001 |
| **Related ADRs** | ADR-0006, ADR-0011, ADR-0012 |
| **Related RFCs** | RFC-0001 |
| **Governance** | [RELEASE_POLICY](../../governance/RELEASE_POLICY.md) |

---

## Review Checklist

- [ ] SRE Lead has reviewed deployment window configuration
- [ ] Security Architect has reviewed Key Vault CSI model and break-glass procedure
- [ ] ArgoCD access model reviewed (least-privilege service account)
- [ ] Runbook framework committed to — who owns runbook creation in Phase 1
- [ ] On-call rotation coverage reviewed (7x24)
- [ ] DR runbook for PITR restore scheduled for Phase 1 test
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | SRE Lead | Initial draft |
