import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';

export class OrderPlacedEvent implements IDomainEvent {
  public readonly eventName: string = 'OrderPlacedEvent';
  public readonly occurredOn: Date;

  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly customerId: string | undefined,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly items: any[]
  ) {
    this.occurredOn = new Date();
  }
}
