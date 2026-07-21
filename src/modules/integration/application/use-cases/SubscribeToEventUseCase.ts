import { IWebhookSubscriptionRepository } from '../ports/IWebhookSubscriptionRepository';
import { WebhookSubscription } from '../../domain/aggregates/WebhookSubscription';

export interface SubscribeToEventCommand {
  tenantId: string;
  eventType: string;
  callbackUrl: string;
}

export class SubscribeToEventUseCase {
  constructor(private readonly subscriptionRepository: IWebhookSubscriptionRepository) {}

  public async execute(command: SubscribeToEventCommand): Promise<string> {
    // Business logic rules: Validate URL, ensure tenant isolation, etc.
    const subscription = WebhookSubscription.create(
      command.tenantId,
      command.eventType,
      command.callbackUrl
    );

    await this.subscriptionRepository.save(subscription);

    return subscription.id;
  }
}
