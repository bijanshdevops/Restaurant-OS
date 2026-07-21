import { WebhookSubscription } from '../../domain/aggregates/WebhookSubscription';

export interface IWebhookSubscriptionRepository {
  /**
   * Saves a new webhook subscription.
   */
  save(subscription: WebhookSubscription): Promise<void>;

  /**
   * Fetches all subscriptions for a specific tenant and event type.
   * This is heavily utilized by the OutboxProcessor.
   */
  findByTenantAndEvent(tenantId: string, eventType: string): Promise<WebhookSubscription[]>;
}
