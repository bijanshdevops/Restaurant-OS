# ADR-0015: Database and ORM Strategy

## Status
Approved

## Context
Restaurants OS requires a robust, transactional data store capable of handling complex operations across multiple domains (Order, Menu, Kitchen, Finance). Additionally, the system must support Multi-Tenant data isolation by design, without compromising the principles of a Modular Monolith. We need an Object-Relational Mapping (ORM) solution that complements our chosen language (TypeScript) and facilitates Clean Architecture by keeping domain logic isolated from persistence concerns.

## Decision
We will use **PostgreSQL** as the relational database and **Prisma** as the primary ORM.

## Justification
The project's governance rule states: *"Domain drives technical decisions."*
1. **Type Safety & Synergy**: Prisma generates a fully type-safe database client based on its schema. This integrates perfectly with TypeScript, ensuring that our domain layer interacts with the persistence layer via strictly typed interfaces, reducing impedance mismatch.
2. **Multi-Tenant Isolation**: PostgreSQL supports Row-Level Security (RLS) and schema-per-tenant isolation models. To align with our Multi-Tenant requirement while maintaining a Modular Monolith, we will leverage PostgreSQL's RLS (Row-Level Security). Prisma supports injecting tenant context into queries via middleware/extensions, allowing us to enforce tenant boundaries automatically at the query level without littering domain logic with `tenantId` checks.
3. **Modular Monolith Boundaries**: While Prisma uses a single schema file natively, we will enforce strict conventions (and potentially tooling) to ensure that tables belonging to different domains (e.g., `Order`, `Inventory`) do not have hard foreign-key constraints if those domains are intended to be decoupled. Integration between domains will remain event-driven, with Prisma handling persistence within the boundary of a single domain.
4. **Reliability & ACID Compliance**: PostgreSQL is the industry standard for enterprise-grade, ACID-compliant relational data, perfectly suited for the complex transactional needs of a restaurant operating system.

## Consequences
- **Positive**: End-to-end type safety from the database to the domain layer; strong multi-tenant data isolation handled at the database level (RLS); excellent developer ergonomics.
- **Negative/Risk**: Prisma's single schema file can become a bottleneck in a large modular monolith if not managed carefully.
- **Mitigation**: We will establish strict code-review guidelines to prevent cross-domain database relationships in the Prisma schema, favoring eventual consistency and event-driven integration across domain boundaries.
