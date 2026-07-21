import { IDomainEventPublisher, DomainEvent } from '../../../../shared/domain/events/IDomainEventPublisher';
import { IEventBus } from '../../../../shared/application/ports/IEventBus';
import { PrismaOutboxRepository } from '../../infrastructure/repositories/PrismaOutboxRepository';
import { CorrelationContext } from '../../../../shared/infrastructure/observability/CorrelationContext';
import { logger } from '../../../../shared/infrastructure/observability/logger';

export class EventDispatcher implements IDomainEventPublisher {
  constructor(
    private readonly outboxRepository: PrismaOutboxRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async publish(event: DomainEvent, tx: any): Promise<void> {
    // Task 1: Check if there are internal subscribers registered in InMemoryEventBus
    if (this.eventBus.hasSubscribers(event.eventType)) {
      try {
        // Immediately trigger internal subscribers (async but inline).
        // Task 2: Isolation of Concerns. By catching errors here, we guarantee
        // that a failing local subscriber does not halt the Outbox registration process.
        await this.eventBus.publish(event as any);
      } catch (error) {
        logger.error(`[EventDispatcher] Failed to dispatch internal event ${event.eventType}`, error);
      }
    }

    // Task 1: Simultaneously trigger the PrismaOutboxRepository.enqueue()
    // so the event is durably queued for external webhook delivery within the ACID transaction.
    const correlationId = CorrelationContext.getId();
    await this.outboxRepository.enqueue(event, correlationId, tx);
  }
}
