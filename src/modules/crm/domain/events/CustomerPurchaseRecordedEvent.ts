import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';

export class CustomerPurchaseRecordedEvent implements IDomainEvent {
  public readonly eventName: string = 'CustomerPurchaseRecordedEvent';
  public readonly occurredOn: Date;

  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly segment: string, // REGULAR or VIP
    public readonly purchaseAmount: number
  ) {
    this.occurredOn = new Date();
  }
}
