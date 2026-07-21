import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';
import { OrderPaidEvent } from '../../../orders/domain/events/OrderPaidEvent';
import { CreateTicketsFromOrderUseCase } from '../use-cases/CreateTicketsFromOrderUseCase';

export class OrderPaidSubscriber {
  constructor(
    private readonly createTicketsUseCase: CreateTicketsFromOrderUseCase
  ) {}

  /**
   * Handles the generic IDomainEvent from the EventBus.
   * Subscriber logic is strictly an adapter: NO business rules exist here.
   */
  public async handle(event: IDomainEvent): Promise<void> {
    const orderPaidEvent = event as OrderPaidEvent;
    
    console.log(`\n[Kitchen Module] 🔔 Received Domain Event: ${orderPaidEvent.eventName}`);
    console.log(`[Kitchen Module] 🍳 Translating event into Application Command for Order: ${orderPaidEvent.orderId}`);
    
    // Translate external Event into internal UseCase payload and execute
    await this.createTicketsUseCase.execute({
      orderId: orderPaidEvent.orderId,
      tenantId: orderPaidEvent.tenantId,
      items: orderPaidEvent.items || []
    });
  }
}
