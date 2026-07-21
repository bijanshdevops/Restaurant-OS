# Architectural Decision Records (ADR) Summary

This document compiles the foundational architectural decisions that define Restaurant-OS. By understanding the "Why" behind these choices, developers can safely extend the system without violating its core principles.

## 1. The Modular Monolith (Clean Architecture)
**Status**: Accepted
**Context**: We need to build a system that scales like microservices but deploys like a monolith to keep operational overhead low for early-stage development.
**Decision**: We adopted a **Modular Monolith** structure under `src/modules/*`.
**Rationale**:
- **Strict Boundaries**: Each module (Orders, CRM, Inventory, Accounting, Analytics) encapsulates its own Domain, Application, and Infrastructure layers.
- **No Cross-Table Joins**: Modules cannot directly query another module's database tables using Prisma `include` or raw SQL. This ensures that if we ever need to split `Analytics` into its own physical microservice, we simply drag and drop the folder.

## 2. Event-Driven Decoupling
**Status**: Accepted
**Context**: How do modules communicate if they can't join tables? For example, how does CRM know when an Order is placed?
**Decision**: We use an **Internal Event Bus** (Publish/Subscribe pattern).
**Rationale**:
- **Isolation of Concerns**: The `PlaceOrderUseCase` only cares about saving an Order. It publishes an `OrderPlacedEvent`. The CRM module independently listens to this event via `CustomerUpdateSubscriber`.
- **Resilience**: If the CRM subscriber throws an error, it does not rollback or fail the core Order creation.

## 3. The Transactional Outbox Pattern
**Status**: Accepted
**Context**: We need to guarantee that Domain Events (like `OrderPlaced`) are reliably forwarded to external Webhooks, even if the Node process crashes milliseconds after the database commits.
**Decision**: We implemented the **Transactional Outbox**.
**Rationale**:
- **ACID Guarantees**: The `PlaceOrderUseCase` saves the Order and the `OutboxEvent` inside the *exact same Prisma `$transaction`*. 
- **Eventually Consistent Delivery**: A background `OutboxProcessor` safely polls the database and dispatches events via HTTP, employing Exponential Backoff for retries. No events are ever lost.

## 4. Distributed Tracing (Zero-Config)
**Status**: Accepted
**Context**: In an asynchronous Event-Driven system, how do we track a request that spans API Controllers, Background Outbox processors, and multiple Subscribers?
**Decision**: We utilize Node's `AsyncLocalStorage` via the `CorrelationContext` utility.
**Rationale**:
- **Clean Domain Signatures**: We avoid polluting our clean Domain Aggregates by passing `correlationId` through every function. Instead, the `logger` and the `EventDispatcher` seamlessly extract it from the execution context.

## 5. Optimistic Concurrency Control
**Status**: Accepted
**Context**: How do we prevent overselling inventory when 50 customers try to order the last Gourmet Burger at the same millisecond?
**Decision**: We implemented **Optimistic Concurrency Control (OCC)** using Prisma `version` integers on the `StockLevel` aggregate.
**Rationale**:
- **Performance**: Row-level locking (Pessimistic) degrades database throughput. OCC allows all reads to proceed instantly, and relies on a `WHERE version = expected` clause to abort collisions.
