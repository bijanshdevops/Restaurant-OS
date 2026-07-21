import { IWebhookSubscriptionRepository } from '../../application/ports/IWebhookSubscriptionRepository';
import { WebhookSubscription } from '../../domain/aggregates/WebhookSubscription';

type PrismaClient = any;

export class PrismaWebhookSubscriptionRepository implements IWebhookSubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(subscription: WebhookSubscription): Promise<void> {
    await this.prisma.webhookSubscription.upsert({
      where: { id: subscription.id },
      update: {
        eventType: subscription.eventType,
        callbackUrl: subscription.callbackUrl
      },
      create: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        eventType: subscription.eventType,
        callbackUrl: subscription.callbackUrl
      }
    });
  }

  public async findByTenantAndEvent(tenantId: string, eventType: string): Promise<WebhookSubscription[]> {
    const records = await this.prisma.webhookSubscription.findMany({
      where: {
        tenantId,
        eventType
      }
    });

    return records.map((record: any) => WebhookSubscription.from(
      record.id,
      record.tenantId,
      record.eventType,
      record.callbackUrl
    ));
  }
}
