# Restaurants OS

> **Enterprise Restaurant Operating System**

[![Status](https://img.shields.io/badge/status-Phase%207%20%E2%80%94%20Production%20Ready-green)]()
[![Architecture](https://img.shields.io/badge/architecture-Modular%20Monolith%20%E2%86%92%20Platform-green)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey)]()

---

## What Is Restaurants OS?

**Restaurants OS** is an enterprise-grade Restaurant Operating System designed to run the full operational, financial, and strategic lifecycle of food-service businesses at any scale.

This is **not a POS application**. Restaurants OS is a platform.

| Deployment Model | Supported |
|---|---|
| Single Restaurant | ✅ |
| Restaurant Chain | ✅ |
| Franchise | ✅ |
| Cloud Kitchen | ✅ |
| Multi-Brand | ✅ |
| Multi-Country | ✅ |
| Enterprise | ✅ |

---

## Architecture Philosophy

Restaurants OS is built on the following non-negotiable foundations:

- **Domain-Driven Design** — the business domain drives every technical decision
- **Clean Architecture** — dependency direction is always inward toward the domain
- **Modular Monolith First** — start cohesive, decompose when justified
- **Event-Driven** — integration through events, not direct calls
- **Multi-Tenant by Design** — tenant isolation is a first-class concern
- **Cloud Native** — Kubernetes, OpenTelemetry, infrastructure as code
- **Offline-First POS** — operational continuity without network dependency
- **Plugin Architecture** — extensibility without core modification

> **Governance Rule**: No source code, project, solution, infrastructure, API contract, or database artifact may be created before the corresponding Product, Domain, Architecture, ADR, and RFC documentation reaches **Approved** status.

---

## Repository Structure

```
Restaurant-OS/
├── docs/                   # Narrative documentation
│   ├── 00-product/         # Product vision, charter, capabilities
│   ├── 01-domain/          # Domain model, DDD artifacts
│   ├── 02-architecture/    # Architecture views and decisions
│   ├── 03-security/        # Security model and threat analysis
│   ├── 04-platform/        # Platform engineering
│   ├── 05-api/             # API and integration contracts
│   ├── 06-ui/              # UI platform
│   ├── 07-devops/          # DevOps, SRE, observability
│   ├── 08-quality/         # Quality gates and fitness functions
│   └── 09-decisions/       # Decision log
├── architecture/           # Reusable architecture assets
│   ├── principles/         # Architecture principles (authoritative)
│   ├── constraints/        # Architecture constraints
│   ├── decisions/          # Decision assets
│   └── reference-models/   # Canonical reference models
├── adr/                    # Architecture Decision Records
│   ├── strategic/
│   ├── tactical/
│   └── operational/
├── rfc/                    # Requests for Comment
│   ├── strategic/
│   ├── tactical/
│   └── operational/
├── governance/             # Architecture Board and policies
├── standards/              # Enterprise standards (naming, API, events)
├── specs/                  # Feature and module specifications
├── templates/              # Document templates
├── decision-log/           # Chronological decision index
├── prompts/                # AI-assisted authoring prompts
├── tools/                  # Tooling guides
├── scripts/                # Automation scripts
└── .github/                # GitHub workflow and templates
```

---

## Quick Navigation

| I want to... | Go to |
|---|---|
| Read the Master Architecture Decisions | [Top-Level ADR](ADR.md) |
| Read the Operations & Runbook | [Operations Manual](OPERATIONS.md) |
| Understand the product | [Product Vision](docs/00-product/00-product-vision.md) |
| Explore the domain | [Domain Landscape](docs/01-domain/00-domain-landscape.md) |
| Review architecture | [Architecture Vision](docs/02-architecture/00-architecture-vision.md) |
| Find detailed architecture decisions | [ADR Index](adr/) |
| Find RFCs | [RFC Index](rfc/) |
| Read standards | [Standards](standards/) |
| Understand governance | [Governance](governance/DECISION_PROCESS.md) |
| Find all documents | [Master Index](docs/INDEX.md) |
| Read the glossary | [Glossary](docs/GLOSSARY.md) |

---

## Current Status

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the historical phases, milestones, and risk register.

**Current Phase**: Phase 7 — Production Ready
**Phase Goal**: Ensure all architectural boundaries are secured, load-tested, documented, and wrapped in Docker containers for enterprise deployment.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, review process, and branching model.

All contributions must comply with [REPOSITORY_RULES.md](REPOSITORY_RULES.md) and pass the [Documentation Quality Gate](DOCUMENTATION_STANDARD.md).

---

## License

[MIT License](LICENSE) — Copyright © 2026 Restaurants OS Project
