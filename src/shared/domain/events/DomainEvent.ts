/**
 * Abstract base class for Domain Events that can be extended by concrete event types.
 * This allows InventoryLowEvent and similar classes to use `extends DomainEvent`.
 */
export abstract class DomainEvent {
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;

  constructor(eventType: string, aggregateId: string) {
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }
}
