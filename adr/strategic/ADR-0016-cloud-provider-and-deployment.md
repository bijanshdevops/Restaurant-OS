# ADR-0016: Cloud Provider and Deployment

## Status
Approved

## Context
Restaurants OS is an enterprise-level platform that must operate reliably under high load, support various deployment models (single restaurant to enterprise chain), and adhere to Cloud-Native principles. We require an infrastructure foundation that supports containerization, orchestration, and seamless scalability. The architecture is currently a Modular Monolith, but it must be deployed in a way that allows for future extraction of microservices if justified.

## Decision
We will standardize on **Google Cloud Platform (GCP)** as the primary cloud provider, utilizing **Docker** for containerization and **Google Kubernetes Engine (GKE)** for orchestration.

## Justification
The project's governance rule states: *"Domain drives technical decisions."*
1. **Cloud-Native Principles**: Packaging the Modular Monolith into Docker containers ensures consistency across all environments (local, staging, production) and fulfills the cloud-native mandate.
2. **Scalability and Enterprise Support**: GCP's Kubernetes Engine (GKE) is widely regarded as the most mature managed Kubernetes service. It provides the necessary scaling, self-healing, and rollout capabilities required for a highly available restaurant platform.
3. **Evolutionary Architecture**: Deploying a Modular Monolith in a Kubernetes cluster simplifies the transition path. If a specific domain (e.g., `Finance`) needs to be scaled independently or extracted, GKE allows us to deploy that extracted service alongside the monolith seamlessly, managing traffic via Kubernetes networking and ingresses.
4. **Managed Services**: GCP offers robust managed services for our selected database (Cloud SQL for PostgreSQL) and event-driven infrastructure (Pub/Sub), allowing the engineering team to focus on the business domain rather than infrastructure management.

## Consequences
- **Positive**: Highly scalable, resilient, and standardized deployment pipeline; vendor-backed managed Kubernetes; clear path for future architectural evolution.
- **Negative/Risk**: Kubernetes introduces operational complexity and a steep learning curve. Vendor lock-in to GCP specific managed services (like Cloud SQL or Pub/Sub) may occur.
- **Mitigation**: We will use Infrastructure as Code (e.g., Terraform) to define our GCP resources, and encapsulate vendor-specific integrations behind domain-driven interfaces (Clean Architecture), ensuring that the core business logic remains agnostic to the underlying cloud provider.
