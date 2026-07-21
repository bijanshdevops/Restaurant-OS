import { IEventBus } from '../../../../shared/application/ports/IEventBus';
import { PrismaTenantStatsRepository } from '../../infrastructure/repositories/PrismaTenantStatsRepository';

export class CustomerPurchaseRecordedSubscriber {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly statsRepository: PrismaTenantStatsRepository
  ) {}

  public subscribe(): void {
    this.eventBus.subscribe('CustomerPurchaseRecordedEvent', async (event: any) => {
      try {
        if (!event.tenantId || !event.segment || event.purchaseAmount === undefined) {
          throw new Error('Malformed CustomerPurchaseRecordedEvent');
        }

        const stats = await this.statsRepository.getByTenantId(event.tenantId);
        
        // Record segmented revenue ONLY
        // The total overall revenue was already handled by OrderPlacedSubscriber
        stats.recordSegmentPurchase(event.segment, event.purchaseAmount);

        await this.statsRepository.save(stats);

      } catch (error) {
        console.error(`[Analytics] Failed to process CustomerPurchaseRecordedEvent for tenant ${event?.tenantId}`, error);
      }
    });
  }
}
