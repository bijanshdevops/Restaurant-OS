import { OutboxProcessor } from '../../application/services/OutboxProcessor';
import { PrismaOutboxRepository } from '../../infrastructure/repositories/PrismaOutboxRepository';
import { NodeFetchHttpClient } from '../../infrastructure/http/NodeFetchHttpClient';
import { PrismaWebhookSubscriptionRepository } from '../../infrastructure/repositories/PrismaWebhookSubscriptionRepository';
import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { inMemoryEventBus } from '../../../../shared/infrastructure/events/InMemoryEventBus';

export function makeOutboxProcessor(): OutboxProcessor {
  // 1. Instantiate Repositories
  const outboxRepo = new PrismaOutboxRepository(prismaClient);
  const subscriptionRepo = new PrismaWebhookSubscriptionRepository(prismaClient);
  
  // 2. Instantiate Network Driver
  const httpClient = new NodeFetchHttpClient();
  
  // 3. Wire and Return
  return new OutboxProcessor(outboxRepo, httpClient, subscriptionRepo, inMemoryEventBus);
}
