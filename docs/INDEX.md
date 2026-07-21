# Documentation Master Index — Restaurants OS

| Field              | Value |
|--------------------|-------|
| **Purpose**        | Single navigation entry point to all Restaurants OS documentation |
| **Scope**          | All documents in this repository |
| **Status**         | Living Document |
| **Owner**          | Architecture Board |
| **Last Updated**   | 2026-07-08 |
| **References**     | [README](../README.md) |
| **Related Documents** | [GLOSSARY](GLOSSARY.md) |

---

## Root Documents

| Document | Description | Status |
|---|---|---|
| [README](../README.md) | Project overview and navigation | Approved |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Architecture overview | Draft |
| [DOCUMENTATION_STANDARD.md](../DOCUMENTATION_STANDARD.md) | Documentation quality gate | Approved |
| [REPOSITORY_RULES.md](../REPOSITORY_RULES.md) | Repository governance rules | Approved |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines | Approved |
| [PROJECT_STATUS.md](../PROJECT_STATUS.md) | Phase and milestone tracker | In Progress |
| [CHANGELOG.md](../CHANGELOG.md) | Version history | Active |

---

## 00 — Product

| Document | Description | Status |
|---|---|---|
| [00-product-vision](00-product/00-product-vision.md) | Product vision statement | Draft |
| [01-product-charter](00-product/01-product-charter.md) | Project charter and mandate | Draft |
| [02-business-capabilities](00-product/02-business-capabilities.md) | High-level capability list | Draft |
| [03-stakeholders](00-product/03-stakeholders.md) | Stakeholder register | Draft |
| [04-kpi](00-product/04-kpi.md) | Key performance indicators | Draft |
| [05-roadmap](00-product/05-roadmap.md) | Phase-by-phase roadmap | Draft |
| [06-business-capability-map](00-product/06-business-capability-map.md) | Business capability hierarchy and ownership | Draft |

---

## 01 — Domain

| Document | Description | Status |
|---|---|---|
| [00-domain-landscape](01-domain/00-domain-landscape.md) | Domain overview | Draft |
| [01-core-domains](01-domain/01-core-domains.md) | Core domains (strategic value) | Draft |
| [02-subdomains](01-domain/02-subdomains.md) | Supporting and generic subdomains | Draft |
| [03-context-map](01-domain/03-context-map.md) | Bounded Context relationships | Draft |
| [04-ubiquitous-language](01-domain/04-ubiquitous-language.md) | Language per Bounded Context | Draft |
| [05-domain-events](01-domain/05-domain-events.md) | Domain event catalog | Draft |
| [06-aggregates](01-domain/06-aggregates.md) | Aggregate roots and invariants | Draft |
| [07-domain-services](01-domain/07-domain-services.md) | Domain services catalog | Draft |
| [08-domain-policies](01-domain/08-domain-policies.md) | Business policies and Saga starters | Draft |
| [09-domain-ownership](01-domain/09-domain-ownership.md) | Bounded Context ownership registry | Draft |
| [10-context-catalog](01-domain/10-context-catalog.md) | One-page descriptions per context | Draft |

---

## 02 — Architecture

| Document | Description | Status |
|---|---|---|
| [00-architecture-vision](02-architecture/00-architecture-vision.md) | Architectural north star | Draft |
| [00-architecture-goals](02-architecture/00-architecture-goals.md) | Measurable architecture goals | Draft |
| [00-architecture-principles](02-architecture/00-architecture-principles.md) | Binding principles | Draft |
| [00-quality-attribute-scenarios](02-architecture/00-quality-attribute-scenarios.md) | Formal QAS | Draft |
| [01-architecture-principles](02-architecture/01-architecture-principles.md) | Narrative principles | Draft |
| [02-quality-attributes](02-architecture/02-quality-attributes.md) | Quality utility tree | Draft |
| [03-architecture-drivers](02-architecture/03-architecture-drivers.md) | Business, technical, constraint drivers | Draft |
| [04-system-context](02-architecture/04-system-context.md) | C4 Level 1 | Draft |
| [05-container-view](02-architecture/05-container-view.md) | C4 Level 2 | Draft |
| [06-component-view](02-architecture/06-component-view.md) | C4 Level 3 | Draft |
| [07-runtime-view](02-architecture/07-runtime-view.md) | Runtime scenarios | Draft |
| [08-deployment-view](02-architecture/08-deployment-view.md) | Deployment topology | Draft |
| [09-evolution-roadmap](02-architecture/09-evolution-roadmap.md) | Architecture evolution path | Draft |

---

## 03 — Security

| Document | Description | Status |
|---|---|---|
| [ThreatModel](03-security/ThreatModel.md) | STRIDE threat model | Draft |
| [Authentication](03-security/Authentication.md) | AuthN strategy | Draft |
| [Authorization](03-security/Authorization.md) | AuthZ strategy | Draft |
| [SecretsManagement](03-security/SecretsManagement.md) | Secret lifecycle | Draft |
| [Audit](03-security/Audit.md) | Audit trail requirements | Draft |

---

## 04 — Platform

| Document | Description | Status |
|---|---|---|
| [README](04-platform/README.md) | Platform overview | Draft |
| [PLATFORM_SERVICES](04-platform/PLATFORM_SERVICES.md) | Platform service catalog | Draft |
| [IDENTITY_PLATFORM](04-platform/IDENTITY_PLATFORM.md) | Identity service design | Draft |
| [PLUGIN_PLATFORM](04-platform/PLUGIN_PLATFORM.md) | Plugin architecture | Draft |
| [CONFIGURATION_PLATFORM](04-platform/CONFIGURATION_PLATFORM.md) | Configuration service | Draft |
| [STORAGE_PLATFORM](04-platform/STORAGE_PLATFORM.md) | Storage strategy | Draft |

---

## 05 — API

| Document | Description | Status |
|---|---|---|
| [API_GUIDELINES](05-api/API_GUIDELINES.md) | API design guidelines | Draft |
| [VERSIONING](05-api/VERSIONING.md) | API versioning strategy | Draft |
| [ERROR_HANDLING](05-api/ERROR_HANDLING.md) | Error model standard | Draft |
| [EVENT_CONVENTIONS](05-api/EVENT_CONVENTIONS.md) | Event naming and envelope | Draft |
| [EVENT_CATALOG](05-api/EVENT_CATALOG.md) | Domain event catalog | Draft |
| [INTEGRATION_PATTERNS](05-api/INTEGRATION_PATTERNS.md) | Integration patterns in use | Draft |
| [MESSAGE_CONTRACTS](05-api/MESSAGE_CONTRACTS.md) | Message contract versioning | Draft |

---

## 06 — UI

| Document | Description | Status |
|---|---|---|
| [README](06-ui/README.md) | UI platform overview | Draft |

---

## 07 — DevOps

| Document | Description | Status |
|---|---|---|
| [CI_CD](07-devops/CI_CD.md) | CI/CD pipeline design | Draft |
| [OBSERVABILITY](07-devops/OBSERVABILITY.md) | Observability strategy | Draft |
| [BACKUP](07-devops/BACKUP.md) | Backup strategy | Draft |
| [DISASTER_RECOVERY](07-devops/DISASTER_RECOVERY.md) | DR runbooks | Draft |
| [LOGGING](07-devops/LOGGING.md) | Structured logging standard | Draft |
| [TRACING](07-devops/TRACING.md) | Distributed tracing | Draft |
| [METRICS](07-devops/METRICS.md) | Metrics catalog | Draft |
| [HEALTH_CHECKS](07-devops/HEALTH_CHECKS.md) | Health probe design | Draft |
| [SRE](07-devops/SRE.md) | SLI/SLO/error budgets | Draft |

---

## 08 — Quality

| Document | Description | Status |
|---|---|---|
| [CODING_STANDARD](08-quality/CODING_STANDARD.md) | Coding standards | Draft |
| [ARCHITECTURE_REVIEW_CHECKLIST](08-quality/ARCHITECTURE_REVIEW_CHECKLIST.md) | Enterprise review checklist | Draft |
| [QUALITY_GATE](08-quality/QUALITY_GATE.md) | Pipeline quality gates | Draft |
| [ARCHITECTURE_FITNESS_FUNCTIONS](08-quality/ARCHITECTURE_FITNESS_FUNCTIONS.md) | Measurable constraints | Draft |
| [ARCHITECTURE_METRICS](08-quality/ARCHITECTURE_METRICS.md) | Architecture KPIs | Draft |

---

## 09 — Decisions

| Document | Description | Status |
|---|---|---|
| [README](09-decisions/README.md) | Decision log index | Active |

---

## Glossary

| Document | Description | Status |
|---|---|---|
| [GLOSSARY](GLOSSARY.md) | Canonical terminology | Draft |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-08 | Architecture Board | Initial index created |
