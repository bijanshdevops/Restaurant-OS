import { IKitchenTicketRepository } from '../ports/IKitchenTicketRepository';
import { TicketRouter, RoutableItem } from '../../domain/services/TicketRouter';
import { StationType } from '../../domain/value-objects/StationType';

export class CreateTicketsFromOrderUseCase {
  constructor(
    private readonly kitchenTicketRepository: IKitchenTicketRepository,
    private readonly ticketRouter: TicketRouter = new TicketRouter()
  ) {}

  public async execute(orderData: { orderId: string; items: any[]; tenantId: string }): Promise<void> {
    // In a real implementation, we would inject an interface (Port) here to fetch the Menu Items
    // from the Menu Bounded Context to discover their actual StationType.
    // For this milestone, we map the incoming items and provide a default routing.
    
    const routableItems: RoutableItem[] = orderData.items.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      // Mocking station type resolution. Ideally fetched via a Port like `IMenuStationService.getStationType(menuItemId)`
      stationType: item.stationType || StationType.GRILL 
    }));

    // 1. Domain Service: Route items into distinct physical tickets
    const tickets = this.ticketRouter.route(orderData.tenantId, orderData.orderId, routableItems);

    // 2. Persist the generated tickets
    for (const ticket of tickets) {
      await this.kitchenTicketRepository.save(ticket);
    }
  }
}
