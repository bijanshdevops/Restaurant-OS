import { IDomainEventPublisher, DomainEvent } from '../../../../shared/domain/events/IDomainEventPublisher';
import { PrismaOutboxRepository } from '../repositories/PrismaOutboxRepository';

export class OutboxEventPublisher implements IDomainEventPublisher {
  constructor(private readonly outboxRepository: PrismaOutboxRepository) {}

  public async publish(event: DomainEvent, tx: any): Promise<void> {
    // Delegates to the OutboxRepository, ensuring the event is durably enqueued
    // inside the exact same PostgreSQL transaction that persisted the Business Aggregate.
    await this.outboxRepository.enqueue(event, tx);
  }
}
