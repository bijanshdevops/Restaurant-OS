import { IEventBus } from '../../../../shared/application/ports/IEventBus';
import { ITenantStatsRepository } from '../ports/ITenantStatsRepository';

export class OrderPlacedSubscriber {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly statsRepository: ITenantStatsRepository
  ) {}

  /**
   * Binds the subscription to the Event Bus.
   */
  public subscribe(): void {
    this.eventBus.subscribe('OrderPlacedEvent', async (event: any) => {
      // 1. Validate payload structure
      if (!event.payload || typeof event.payload.totalAmount !== 'number') {
        console.warn(`[Analytics] Malformed OrderPlacedEvent skipped: ${event.id}`);
        return;
      }

      try {
        // 2. Fetch or initialize the Tenant's stats aggregate
        const stats = await this.statsRepository.getByTenantId(event.tenantId);

        // 3. Mutate domain state
        stats.recordOrder(event.payload.totalAmount);

        // 4. Persist
        await this.statsRepository.save(stats);
        
      } catch (error) {
        // We log the error. In a robust system, the event bus might feature a DLQ 
        // for failed subscription handlers.
        console.error(`[Analytics] Failed to process OrderPlacedEvent for tenant ${event.tenantId}`, error);
      }
    });
  }
}
