import { IEventBus } from '../../../../shared/application/ports/IEventBus';
import { PrismaCrmRepository } from '../../infrastructure/repositories/PrismaCrmRepository';
import { CustomerProfile } from '../../domain/aggregates/CustomerProfile';
import { IDomainEventPublisher } from '../../../../shared/domain/events/IDomainEventPublisher';

export class CustomerUpdateSubscriber {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly crmRepository: PrismaCrmRepository,
    private readonly eventDispatcher: IDomainEventPublisher
  ) {}

  public subscribe(): void {
    // We listen to OrderPlacedEvent (the raw unsegmented event)
    this.eventBus.subscribe('OrderPlacedEvent', async (event: any) => {
      try {
        if (!event.tenantId || !event.customerId || !event.totalAmount) {
          // If customerId is missing (guest checkout), we skip CRM profiling
          return;
        }

        // 1. Fetch or Create Customer Profile
        let profile = await this.crmRepository.findById(event.tenantId, event.customerId);
        
        if (!profile) {
          // In a real app, you might fetch their email from an Auth service here
          // For this exercise, we'll use a mocked contact based on customerId
          const mockEmail = `${event.customerId.substring(0, 5)}@example.com`;
          profile = CustomerProfile.create(event.customerId, event.tenantId, mockEmail);
        }

        // 2. Execute Domain Logic: record purchase and evaluate segment
        profile.recordPurchase(event.totalAmount);

        // 3. Persist the updated state
        await this.crmRepository.save(profile);

        // 4. Flush domain events (e.g. CustomerPurchaseRecordedEvent) to Analytics
        const events = profile.domainEvents;
        for (const domainEvent of events) {
          // Publishing via EventDispatcher so it hits the InMemoryEventBus where Analytics listens
          await this.eventDispatcher.publish(domainEvent as any, null as any);
        }
        profile.clearEvents();

      } catch (error) {
        console.error(`[CRM] Failed to process OrderPlacedEvent for customer ${event?.customerId}`, error);
      }
    });
  }
}
