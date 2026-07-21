export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly tenantId: string;
}
