import { PrismaOutboxRepository } from '../../infrastructure/repositories/PrismaOutboxRepository';
import { IHttpClient } from '../ports/IHttpClient';
import { IWebhookSubscriptionRepository } from '../ports/IWebhookSubscriptionRepository';
import { IEventBus } from '../../../../shared/application/ports/IEventBus';

export class OutboxProcessor {
  // Configurable threshold before an event is permanently sent to the Dead Letter Queue
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly outboxRepository: PrismaOutboxRepository,
    private readonly httpClient: IHttpClient,
    private readonly subscriptionRepository: IWebhookSubscriptionRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * The core engine loop. Designed to be invoked periodically (e.g., via cron or setInterval).
   * It is highly resilient and catches all errors internally to prevent worker death.
   * Returns the total number of successfully evaluated/attempted events.
   */
  public async process(batchSize: number = 50): Promise<number> {
    let processedCount = 0;
    try {
      // 1. Fetch eligible pending events
      const events = await this.outboxRepository.getPendingEvents(batchSize);

      for (const event of events) {
        processedCount++;
        try {
          // 2. Concurrency Lock: Mark immediately to prevent distributed race conditions
          await this.outboxRepository.lockForProcessing(event.id);

          // 3. Resolve multi-tenant webhook subscriptions for this specific event type
          const subscriptions = await this.subscriptionRepository.findByTenantAndEvent(
            event.tenantId,
            event.eventType
          );

          if (subscriptions.length === 0) {
            // If no one is listening, we can safely mark it as processed (ignored)
            await this.outboxRepository.markAsProcessed(event.id);
            continue;
          }

          // 4. Network & Local Dispatch Strategy
          // We support 'local://' callbackUrls to durably dispatch events into the local internal Event Bus
          // for maximum at-least-once reliability inside the platform.
          const dispatchPromises = subscriptions.map(sub => {
            if (sub.callbackUrl.startsWith('local://')) {
              // Task 3: Recognize 'LocalSubscriber' events as a special delivery type
              // Here we reconstruct a DomainEvent payload for internal routing
              return this.eventBus.publish({
                id: event.id,
                tenantId: event.tenantId,
                eventName: event.eventType,
                occurredOn: event.createdAt,
                payload: event.payload
              } as any);
            } else {
              // Standard External HTTP Webhook Delivery
              return this.httpClient.post(sub.callbackUrl, event.payload, {
                'x-tenant-id': event.tenantId,
                'x-event-type': event.eventType,
                'content-type': 'application/json'
              });
            }
          });

          await Promise.all(dispatchPromises);

          // 5. Success Resolution
          await this.outboxRepository.markAsProcessed(event.id);

        } catch (error: any) {
          console.error(`[OutboxProcessor] Failed to deliver event ${event.id}:`, error.message);
          
          // 6. Exponential Backoff Math (2^attempts * minutes)
          const isPermanentFailure = event.attempts >= this.MAX_ATTEMPTS - 1;
          const nextRetryAt = this.calculateNextRetry(event.attempts);
          
          await this.outboxRepository.markAsFailed(event.id, nextRetryAt, isPermanentFailure);
        }
      }
      return processedCount;
    } catch (criticalError: any) {
      // Catch-all to ensure the processor loop NEVER dies
      console.error('[OutboxProcessor] Critical framework failure in processing loop:', criticalError.message);
      return processedCount;
    }
  }

  /**
   * Calculates standard exponential backoff: nextRetryAt = now + (2 ^ attempts) * minutes
   * e.g., attempt 0 -> 1m, attempt 1 -> 2m, attempt 2 -> 4m, attempt 3 -> 8m
   */
  private calculateNextRetry(attempts: number): Date {
    const minutesToWait = Math.pow(2, attempts);
    const nextRetryDate = new Date();
    nextRetryDate.setMinutes(nextRetryDate.getMinutes() + minutesToWait);
    return nextRetryDate;
  }
}
