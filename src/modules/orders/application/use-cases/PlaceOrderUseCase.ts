import { IOrderRepository } from '../ports/IOrderRepository';
import { IMenuPricingService } from '../ports/IMenuPricingService';
import { PlaceOrderCommand } from '../commands/PlaceOrderCommand';
import { Order } from '../../domain/aggregates/Order';
import { OrderLineItem } from '../../domain/value-objects/OrderLineItem';
import { IDomainEventPublisher } from '../../../../shared/domain/events/IDomainEventPublisher';
import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { randomUUID } from 'crypto';
import { InventoryService } from '../../../inventory/application/services/InventoryService';

export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly menuPricingService: IMenuPricingService,
    private readonly eventDispatcher: IDomainEventPublisher,
    private readonly inventoryService: InventoryService
  ) {}

  public async execute(command: PlaceOrderCommand): Promise<string> {
    const orderId = randomUUID();
    
    // 1. Create a new Order aggregate
    const order = Order.create(command.tenantId, orderId, command.customerId);

    // 2. Iterate through requested items
    for (const item of command.items) {
      try {
        const unitPrice = await this.menuPricingService.getPrice(item.menuItemId, command.tenantId);
        
        if (!unitPrice) {
          throw new Error("Price returned as undefined or null.");
        }

        const orderLineItem = OrderLineItem.create(item.menuItemId, item.quantity, unitPrice);
        order.addItem(orderLineItem);

      } catch (error: any) {
        throw new Error(
          `Domain Exception: Menu item ${item.menuItemId} not found or unavailable. Details: ${error.message}`
        );
      }
    }

    // Finalize the creation to emit OrderPlacedEvent
    order.finalizeCreation();

    // 3. The ACID Transaction Boundary
    // We encapsulate Aggregate persistence, Inventory Reservation, and Outbox Event emission
    // inside the exact same database transaction.
    await prismaClient.$transaction(async (tx: any) => {
      
      // 3.1. Synchronous Cross-Module Inventory Reservation
      // Optimistic concurrency locking guarantees thread-safety
      const reservationItems = order.items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity
      }));
      await this.inventoryService.reserveItems(command.tenantId, reservationItems, tx);

      // 3.2. Persist the core business state
      await this.orderRepository.save(order, tx);

      // 4. Fire Domain Event using the unified EventDispatcher Router
      const events = order.domainEvents;
      for (const event of events) {
        // Enqueues into Outbox AND dispatches to fast in-memory subscribers synchronously
        await this.eventDispatcher.publish(event as any, tx);
      }

      order.clearEvents();
      
    });

    return orderId;
  }
}
