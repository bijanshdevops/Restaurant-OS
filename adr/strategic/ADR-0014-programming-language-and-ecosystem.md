# ADR-0014: Programming Language and Ecosystem

## Status
Approved

## Context
As we transition from Phase 0 (Enterprise Foundation) to Phase 1 (Core Operations) for the Restaurants OS platform, we must finalize the primary programming language and ecosystem. The architecture mandates Domain-Driven Design (DDD), Clean Architecture, and a Modular Monolith First approach. To effectively enforce domain boundaries, implement DDD concepts (Entities, Value Objects, Aggregates), and minimize runtime anomalies, we require a language that provides robust type safety, extensive tooling, and a vibrant ecosystem capable of supporting both backend and frontend development (if applicable).

## Decision
We will adopt **TypeScript** as the primary programming language across the stack (Node.js for backend, and Next.js for web/UI components where applicable).

## Justification
The project's governance rule states: *"Domain drives technical decisions."*
1. **Domain Safety**: Strong typing is mandatory for safely and accurately implementing DDD concepts. TypeScript allows us to strictly define Value Objects, Entities, and Aggregates, ensuring that domain rules are validated at compile-time rather than runtime.
2. **Boundary Enforcement**: In a Modular Monolith, enforcing strict boundaries between modules is critical. TypeScript's module system, combined with tools like ESLint and structural typing, allows us to define clear API contracts between domains, preventing accidental coupling.
3. **Ecosystem & Tooling**: The Node.js/TypeScript ecosystem provides mature libraries for event-driven architectures, testing, and modern cloud-native deployments. 
4. **Full-Stack Synergy**: Sharing types between the frontend (Next.js) and the modular monolith backend reduces duplication, accelerates feature development, and ensures end-to-end type safety.

## Consequences
- **Positive**: Enhanced developer experience and confidence through compile-time checks; explicit domain modeling; reduction in a significant class of runtime errors.
- **Negative/Risk**: TypeScript requires a compilation step and diligent type maintenance. Developers must be trained to avoid bypassing the type system (e.g., using `any`).
- **Mitigation**: We will enforce strict TypeScript compiler options (`strict: true`) and use CI/CD quality gates to reject PRs that compromise type safety.
