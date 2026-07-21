# ADR-0021: Transactional Outbox Pattern for Webhooks

## Status
**Proposed**

## Context
As the Restaurants OS Platform enters Phase 3 (Integration & Ecosystem), we must support real-time data dissemination to external systems via Webhooks. Currently, the system fires Domain Events (e.g., `OrderPaidEvent`) internally via an in-memory Event Bus. 

However, firing webhooks directly and synchronously from within application business logic is inherently unreliable and dangerous:
1. **Network Latency**: Synchronous external HTTP calls severely degrade internal database transaction times and block the main Node.js thread.
2. **External Unavailability**: If a third-party webhook endpoint is down or timing out, our internal transaction might fail (or the event is permanently lost if caught without retries).
3. **Dual Write Problem**: If our application crashes immediately after persisting an entity to PostgreSQL but *before* firing the webhook, the external system never receives the critical update, resulting in permanent data inconsistency.

We require a mechanism that guarantees 100% "at-least-once" delivery of events to external systems while strictly isolating our internal business logic from external network failures.

## Decision
We will implement the **Transactional Outbox Pattern** to decouple internal state changes from external webhook delivery.

1. **The Outbox Table**: We will introduce an `Outbox` table in our PostgreSQL database (managed via Prisma). This table will act as a highly-available, durable message queue.
2. **ACID Compliance**: Any business operation (Command/UseCase) that requires emitting an event must persist its core Aggregate *and* insert a serialized record into the `Outbox` table **within the exact same database transaction**. This guarantees that if the business data saves, the event is irrevocably scheduled for delivery.
3. **The Outbox Processor**: A background worker process (`OutboxProcessor`) will periodically poll the `Outbox` table for 'PENDING' events.
4. **Resiliency and Retries**: The processor will attempt to deliver the payload via HTTP POST to the registered webhook endpoint.
   - **Success**: The record is marked as `PROCESSED`.
   - **Failure**: The system implements an **Exponential Backoff** strategy. Retry intervals will increase exponentially (e.g., 2s, 4s, 8s, 16s...) to avoid overwhelming failing third-party endpoints. After a maximum threshold is reached, the event is marked `FAILED` and moved to a Dead Letter Queue (DLQ) for manual intervention.

## Consequences

### Positive
- **Guaranteed Delivery**: Achieves strict "at-least-once" delivery semantics. Events are never lost due to network timeouts, hardware failures, or application crashes.
- **High Performance**: Business transactions complete in milliseconds because they only write to a local database table; they do not wait for external HTTP requests to resolve.
- **Fault Tolerance**: The core platform becomes highly resilient to external system outages.

### Negative
- **Eventual Consistency**: External systems will receive events milliseconds or seconds after the fact, rather than synchronously.
- **Database Load**: Introduces additional write and polling load onto the PostgreSQL primary database instance.
- **Idempotency Requirements**: Because the pattern guarantees "at-least-once" (not "exactly-once"), the consuming external webhooks MUST be designed to handle occasional duplicate deliveries idempotently.
