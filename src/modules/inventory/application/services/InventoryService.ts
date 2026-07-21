import { IInventoryRepository } from '../ports/IInventoryRepository';
import { IDomainEventPublisher } from '../../../../shared/domain/events/IDomainEventPublisher';

export interface ReservationItem {
  menuItemId: string;
  quantity: number;
}

export class InventoryService {
  constructor(
    private readonly inventoryRepository: IInventoryRepository,
    private readonly eventDispatcher: IDomainEventPublisher
  ) {}

  /**
   * Reserves items atomically.
   * Must be wrapped in a transaction (tx).
   * Will throw if stock is insufficient.
   */
  public async reserveItems(tenantId: string, items: ReservationItem[], tx: any): Promise<void> {
    for (const item of items) {
      // 1. Load the StockLevel Aggregate
      const stockLevel = await this.inventoryRepository.findByMenuItemId(tenantId, item.menuItemId, tx);
      
      if (!stockLevel) {
        throw new Error(`Domain Exception: Inventory tracking is not initialized for menu item ${item.menuItemId}.`);
      }

      // 2. Perform the domain logic reservation
      stockLevel.reserve(item.quantity);

      // 3. Persist the updated StockLevel (includes optimistic locking)
      await this.inventoryRepository.save(stockLevel, tx);

      // 4. Flush any pending domain events (e.g., InventoryLowEvent)
      const events = stockLevel.domainEvents;
      for (const event of events) {
        // Pushes the low event out to webhooks synchronously within the ACID transaction lifecycle
        await this.eventDispatcher.publish(event as any, tx);
      }
      stockLevel.clearEvents();
    }
  }
}
