import { randomUUID } from 'crypto';

export class WebhookSubscription {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly eventType: string,
    public readonly callbackUrl: string
  ) {}

  public static from(
    id: string,
    tenantId: string,
    eventType: string,
    callbackUrl: string
  ): WebhookSubscription {
    return new WebhookSubscription(id, tenantId, eventType, callbackUrl);
  }

  public static create(tenantId: string, eventType: string, callbackUrl: string): WebhookSubscription {
    // Basic validation
    if (!callbackUrl.startsWith('https://')) {
      throw new Error('Webhook URLs must use HTTPS.');
    }
    return new WebhookSubscription(randomUUID(), tenantId, eventType, callbackUrl);
  }
}
