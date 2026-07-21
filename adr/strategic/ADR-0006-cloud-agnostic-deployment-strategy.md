# ADR-0006: Cloud Agnostic Deployment Strategy

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Establish that Restaurants OS is cloud-agnostic and must deploy without architectural changes on any Kubernetes-compatible environment |
| **Scope**          | All infrastructure, deployment tooling, and third-party service integrations |
| **Status**         | Draft |
| **Owner**          | Principal Architect + SRE Lead |
| **Assumptions**    | Kubernetes is available in all target deployment environments; containers are the unit of deployment; application source code must never import cloud provider SDKs |
| **Constraints**    | No architectural dependency on any single cloud provider; all required services must be self-hostable; managed cloud services are permitted as optional operational optimisations but must be replaceable |
| **Risks**          | Increased initial operational complexity vs. managed services; team must maintain knowledge of self-hosted OSS alternatives; some managed services provide capabilities that are hard to replicate (e.g., managed DBaaS failover) |
| **References**     | [Deployment View](../../docs/02-architecture/08-deployment-view.md), [ADR-0001](ADR-0001-modular-monolith-first.md), [Deployment Reference Model](../../architecture/reference-models/deployment-reference-model.md) |
| **Related Documents** | [ADR-0007](ADR-0007-technology-stack.md), [ADR-0009](ADR-0009-identity-and-access-management.md), [ADR-0011](ADR-0011-observability-strategy.md), [ADR-0013](ADR-0013-production-operability-model.md) |

---

## Context

Restaurants OS must serve operators across diverse geographic markets, including regions where major western cloud providers (AWS, Azure, GCP) are unavailable, inappropriate, or commercially unacceptable. Target deployment contexts include:

- Public cloud: AWS, Microsoft Azure, Google Cloud Platform
- Community/budget cloud: Hetzner, DigitalOcean, Linode
- Sovereign / regional cloud: Iranian cloud providers and equivalent sovereign infrastructure in other jurisdictions
- On-Premises data centres
- Private cloud (OpenStack, VMware)
- Container platforms: OpenShift, Rancher, k3s, Talos

A system with hard architectural dependencies on any single cloud provider's managed services cannot be deployed in this breadth of environments without architectural rework. The architecture must treat cloud providers as deployment environments, not as architectural foundations.

## Problem Statement

How should Restaurants OS be designed so that it can be deployed and operated on any Kubernetes-compatible environment — public cloud, private cloud, sovereign cloud, or bare metal — without architectural changes, vendor lock-in, or proprietary dependency?

---

## Alternatives Considered

### Option A: Primary Cloud Vendor with Abstraction Layer

Nominate one cloud provider (e.g., Azure) as primary. Abstract cloud-specific services behind interfaces. Provide adapters for other environments.

**Pros**: Managed services reduce operational burden; best-in-class PaaS features available to the primary platform

**Cons**: Abstraction layer adds maintenance burden; primary provider's managed services are often deeply integrated (identity, networking, storage) and difficult to abstract cleanly; secondary environments are always second-class; sovereign/regional cloud requirements cannot be met without significant adaptation work; violates the portability principle

---

### Option B: Cloud Agnostic — Kubernetes-Native with OSS Service Stack (Selected)

The platform runs entirely on Kubernetes. All required services (identity, storage, observability, messaging, secrets) are provided by open-source, self-hostable components. Cloud-provider managed services are permitted as optional deployment-time substitutions (e.g., use RDS PostgreSQL instead of self-hosted PostgreSQL on AWS) but are never referenced in the application architecture.

**Pros**: Deploys anywhere Kubernetes runs; no architectural rework for new deployment targets; operators have full infrastructure control; no vendor-imposed pricing changes can affect the architecture; open standards throughout; sovereign cloud and regional requirements met by default

**Cons**: Requires operational capability to run OSS infrastructure components; no managed service SLAs for self-hosted components; higher operational overhead than fully-managed cloud

---

### Option C: Multi-Cloud from Day One (Multiple Primary Providers)

Design for AWS and Azure simultaneously; cross-cloud failover.

**Pros**: Maximum cloud availability

**Cons**: Engineering cost is prohibitive; configuration complexity multiplies; active-active multi-cloud is one of the highest-complexity infrastructure patterns; unjustified at this stage

---

## Decision

> **Restaurants OS is cloud agnostic. Kubernetes is the primary and sole required deployment substrate. Application source code must never import or reference cloud provider SDKs. Cloud provider managed services are optional operational optimisations, not architectural requirements.**

---

### Cloud Agnostic Principles

The following principles are binding for all infrastructure and integration decisions:

| Principle | Rule |
|---|---|
| **No vendor lock-in** | No cloud provider SDK in application code; no proprietary protocol required |
| **Infrastructure portability** | Every component must run on any CNCF-conformant Kubernetes distribution |
| **Container-first deployment** | All services packaged as OCI-compliant container images |
| **Kubernetes-native architecture** | Deployments, Services, ConfigMaps, Secrets, Ingress — standard Kubernetes primitives only |
| **Open standards preferred** | OIDC, AMQP, S3-compatible API, OpenTelemetry, OCI — over proprietary equivalents |
| **Self-hosting supported** | Every required service must have a self-hosted open-source default |
| **Managed services are optional** | Cloud managed services (RDS, Azure Blob, Google Cloud Storage) may substitute self-hosted components at deployment time; the application must not know the difference |

---

### Canonical Service Stack

The following table defines the canonical technology for each platform service category. The canonical stack must work in every deployment environment. Cloud managed alternatives are listed where applicable.

| Category | Canonical (Self-Hosted Default) | Managed Cloud Alternative |
|---|---|---|
| **Identity Provider** | Keycloak | Microsoft Entra External ID (Azure), Amazon Cognito (AWS) |
| **Identity Alternative** | OpenIddict (embedded) | — |
| **Object Storage** | MinIO (S3-compatible) | Amazon S3, Azure Blob Storage, Google Cloud Storage |
| **Cache** | Redis (Valkey) | Amazon ElastiCache, Azure Cache for Redis |
| **Relational Database** | PostgreSQL (self-hosted) | Amazon RDS, Azure Database for PostgreSQL, Cloud SQL |
| **Message Broker** | RabbitMQ (AMQP) | Amazon MQ, Azure Service Bus (AMQP mode), Google Pub/Sub |
| **Secrets Management** | HashiCorp Vault (or Kubernetes Secrets + Sealed Secrets) | AWS Secrets Manager, Azure Key Vault, GCP Secret Manager |
| **Logs** | Grafana Loki | Cloud logging (optional sink) |
| **Traces** | Grafana Tempo | — |
| **Metrics** | Prometheus + Grafana Mimir | — |
| **Dashboards + Alerting** | Grafana | — |
| **Instrumentation** | OpenTelemetry Collector | — |
| **Ingress** | NGINX Gateway Fabric or Traefik | Cloud load balancer (as Kubernetes Ingress backend) |
| **GitOps** | Argo CD | — |
| **Container Registry** | Harbor (self-hosted) or any OCI-compatible registry | Amazon ECR, Azure Container Registry, Google Artifact Registry |
| **Certificate Management** | cert-manager (Let's Encrypt / internal CA) | Cloud certificate services |

---

### Identity: Keycloak as Default

Keycloak is the default Identity Provider across all deployment environments:

- Supports OIDC, SAML 2.0, LDAP, Active Directory federation
- Multi-tenant realm isolation
- B2C and B2B flows
- MFA enforcement
- Self-hosted: runs on Kubernetes with PostgreSQL backend
- OpenIddict may be used as an embedded alternative for deployments where a standalone IdP is undesirable

**Deployment**: Keycloak runs as a Kubernetes Deployment with PostgreSQL persistence. HA mode (active-active) is supported for production environments.

---

### Object Storage: MinIO as Default

MinIO provides S3-compatible object storage for all environments:

- S3-compatible API — application code uses the S3 SDK (standard), not a cloud-specific SDK
- Self-hosted: runs on Kubernetes with persistent volumes
- Erasure coding for data durability
- Compatible with Amazon S3, Azure Blob (via S3 compatibility layer), and GCS when operating on public cloud

**Application code interface**: AWS S3 SDK (standard S3 API calls only). The endpoint URL is configurable — points to MinIO in self-hosted environments, Amazon S3 on AWS, or an S3-compatible adapter on other clouds.

---

### Ingress: NGINX Gateway Fabric (Primary) / Traefik (Alternative)

- NGINX Gateway Fabric implements Kubernetes Gateway API (CNCF standard)
- Traefik provides an alternative with stronger dynamic configuration support
- Both run entirely on Kubernetes — no cloud load balancer required (though cloud load balancers may front them)
- TLS termination via cert-manager + Let's Encrypt (or internal CA for sovereign environments)

---

### Deployment Environments

All of the following must be deployment targets with no application code changes:

| Environment | Kubernetes Distribution | Notes |
|---|---|---|
| AWS | EKS | RDS PostgreSQL, S3, Amazon MQ may substitute self-hosted defaults |
| Microsoft Azure | AKS | Azure PostgreSQL, Blob Storage, Service Bus may substitute |
| Google Cloud | GKE | Cloud SQL, GCS, Pub/Sub may substitute |
| Hetzner | k3s or Talos | Self-hosted full stack |
| DigitalOcean | DOKS | Self-hosted or managed alternatives |
| Iranian cloud providers | Kubernetes (provider-specific) | Full self-hosted stack required |
| VMware | Tanzu Kubernetes Grid | Self-hosted full stack |
| OpenShift | OpenShift Kubernetes | Security context constraints observed |
| On-Premises bare metal | k3s, Kubeadm, Talos | Self-hosted full stack |
| Private cloud (OpenStack) | Magnum or kubeadm | Self-hosted full stack |

---

### Helm Charts as the Deployment Interface

All Restaurants OS services are packaged as Helm charts:

- Each service has its own Helm chart with configurable values
- Cloud-specific values files override defaults for each environment
- Argo CD applies charts from a GitOps repository — no manual `kubectl apply` in production
- Chart repository: OCI-compatible (Harbor or any OCI registry)

```
gitops/
  environments/
    self-hosted/     ← Full self-hosted stack values
    aws/             ← AWS managed service overrides
    azure/           ← Azure managed service overrides
    hetzner/         ← Hetzner / k3s values
    openshift/       ← OpenShift-specific security contexts
```

---

## Consequences

### Positive
- Deploys to any Kubernetes environment without architectural changes
- No dependency on any cloud provider's commercial terms, availability, or pricing
- Sovereign cloud and regulated environments (Iran, Russia, China, etc.) are supported by default
- Operators retain full infrastructure control — no vendor-imposed observability, identity, or billing
- Open standards (OIDC, AMQP, S3 API, OpenTelemetry) protect integration investments
- Cost model is predictable: compute + storage + bandwidth only; no per-seat or per-MAU vendor fees
- Self-hosted stack is auditable — every component's source code is inspectable

### Negative
- Self-hosted services require operational knowledge and maintenance (Keycloak, MinIO, RabbitMQ)
- No managed service SLAs — HA and disaster recovery are the operator's responsibility
- Helm chart and Argo CD configuration management across multiple environments requires discipline
- Keycloak HA configuration is complex; requires dedicated expertise
- Without managed DBaaS, PostgreSQL HA (Patroni, CloudNativePG) must be maintained

---

## Trade-offs

| Trade-off | Decision |
|---|---|
| Managed service convenience vs. portability | Portability wins — managed services are optional optimisations, not requirements |
| Best-in-class cloud identity vs. universal identity | Keycloak — universal, open, self-hosted; equivalent to Entra External ID for the required use cases |
| Cloud-specific features vs. open standards | Open standards always; cloud-specific features only if available via an abstraction |
| Operational simplicity vs. deployment freedom | Deployment freedom — the operator accepts the operational responsibility |
| Per-MAU identity cost vs. self-hosted | Self-hosted Keycloak — zero per-MAU cost; operator controls the data |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Self-hosted Keycloak misconfiguration causing auth failure | Medium | High | Keycloak HA mode; automated health checks; DR runbook |
| MinIO data loss on single node | Medium | High | MinIO erasure coding (minimum 4 nodes for production); PITR backup |
| RabbitMQ broker unavailability | Low | High | RabbitMQ HA (mirrored queues or Quorum queues); circuit breaker on producer |
| Team unfamiliar with OSS infrastructure stack | High | Medium | Training plan; dedicated platform SRE; documented runbooks |
| OpenShift security context incompatibility | Medium | Medium | Helm chart security context values per environment; OpenShift tested in CI |
| Iranian cloud network restrictions affecting container pulls | Low | High | Private Harbor registry hosted in-region; air-gapped deployment documented |

---

## Architecture Principles Impact

| Principle | Impact |
|---|---|
| No vendor lock-in | This ADR is the primary enforcement of the no-lock-in principle |
| Infrastructure portability | Kubernetes-native + Helm + Argo CD = portable by design |
| Container-first | OCI images; Helm charts; no VM-specific deployment assumptions |
| Open standards preferred | OIDC, AMQP, S3 API, OpenTelemetry — all standards-based |
| Self-hosting supported | Every component has a self-hosted default |

---

## Quality Attribute Impact

| Quality Attribute | Impact | Detail |
|---|---|---|
| **Portability** | Significantly improved | Deploys to any Kubernetes environment without code change |
| **Availability** | Improved | No dependency on a single cloud provider's regional availability |
| **Maintainability** | Improved | Open standards and open-source components; community-maintained documentation |
| **Operational Independence** | Significantly improved | Operators control all infrastructure; no vendor-imposed changes |
| **Disaster Recovery** | Improved | DR is self-contained; no cloud provider coordination required for failover |
| **Cost Control** | Significantly improved | No per-seat, per-MAU, or per-API-call vendor fees; compute + storage only |

---

## Traceability

| Dimension | Link |
|---|---|
| **Architecture Vision** | [00-architecture-vision.md](../../docs/02-architecture/00-architecture-vision.md) |
| **Architecture Principle** | No vendor lock-in; Infrastructure portability; Container-first |
| **Deployment Reference Model** | [deployment-reference-model.md](../../architecture/reference-models/deployment-reference-model.md) |
| **Quality Attribute** | QAS-AVAIL-001 (Availability), Portability, Cost Control |
| **Architecture Driver** | TD-001: Cloud Native on Kubernetes; TD-002: Sovereign Cloud Support |
| **Related ADRs** | ADR-0001, ADR-0007, ADR-0009, ADR-0011, ADR-0013 |
| **Related RFCs** | RFC-0001 |

---

## Review Checklist

- [ ] Architecture Board confirms cloud-agnostic principle is binding
- [ ] Security Architect has reviewed Keycloak as the canonical IdP
- [ ] SRE Lead has reviewed Keycloak HA and MinIO erasure coding requirements
- [ ] OpenShift security context compatibility reviewed
- [ ] Iranian / sovereign cloud network isolation requirements reviewed
- [ ] Air-gapped deployment (private Harbor registry) approach reviewed
- [ ] Helm chart environment value file structure approved
- [ ] Argo CD GitOps multi-environment structure approved
- [ ] All other ADRs that referenced Azure-specific services have been updated (ADR-0009, ADR-0011, ADR-0013)
- [ ] Architecture Board vote recorded

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Principal Architect | Initial draft — Azure as primary cloud platform |
| 2026-07-09 | Architecture Board | **Rejected** — vendor lock-in not acceptable; revision required |
| 2026-07-09 | Principal Architect | Complete revision — Cloud Agnostic Deployment Strategy; Kubernetes-native; Keycloak; MinIO; RabbitMQ; open standards throughout |
