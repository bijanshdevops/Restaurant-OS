# ADR-0017: Payment Gateway Integration

## Status
Proposed

## Context
As we expand Restaurants OS to handle transactions, we need to integrate external payment gateways (e.g., Stripe, Adyen). Tightly coupling the core `Orders` or `Kitchen` modules to specific payment providers would violate Clean Architecture and Domain-Driven Design principles, hindering our ability to swap providers or support multiple gateways simultaneously.

## Decision
We will implement a webhook-driven `Payment` module that verifies provider signatures, processes the external payload, and dispatches an `OrderPaidEvent` via an internal Event Bus. The `Orders` module (and any other interested modules) will listen to this event rather than interacting with the payment provider directly.

## Justification
This approach aligns perfectly with our Modular Monolith First and Event-Driven integration principles. 
- **Isolation**: External vendor dependencies and SDKs are strictly confined to the `Payment` module.
- **Resilience**: Webhook-driven status updates ensure our system remains eventually consistent even if a payment takes time to clear.
- **Decoupling**: The core `Orders` module is only aware of the standard `OrderPaidEvent`, allowing us to completely change payment providers without modifying core business logic.

## Consequences
- **Positive**: High decoupling; easier testing through event simulation; readiness for a microservices split if necessary.
- **Negative/Risk**: Eventual consistency introduces complexity in the UI (e.g., waiting for the payment to clear). Requires a robust internal Event Bus implementation to ensure events are not lost.
