import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';

export class OrderPaidEvent implements IDomainEvent {
  public readonly eventName: string = 'OrderPaidEvent';
  public readonly occurredOn: Date;

  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly paymentTransactionId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly items: any[] // Carries order items to facilitate decoupled downstream processing
  ) {
    this.occurredOn = new Date();
  }
}
