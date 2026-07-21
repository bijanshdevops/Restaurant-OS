type PrismaTransactionClient = any;

export interface DomainEvent {
  eventType: string;
  payload: any;
  tenantId: string;
}

export interface IDomainEventPublisher {
  /**
   * Publishes a domain event.
   * MUST be executed within an existing database transaction (tx) to guarantee
   * ACID coupling between the aggregate state change and the event emission.
   */
  publish(event: DomainEvent, tx: PrismaTransactionClient): Promise<void>;
}
