import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { PrismaOrderRepository } from '../../infrastructure/repositories/PrismaOrderRepository';
import { MenuPricingAdapter } from '../../infrastructure/adapters/MenuPricingAdapter';
import { PlaceOrderUseCase } from '../../application/use-cases/PlaceOrderUseCase';
import { OrderController } from '../controllers/OrderController';
import { PrismaOutboxRepository } from '../../../integration/infrastructure/repositories/PrismaOutboxRepository';
import { EventDispatcher } from '../../../integration/application/services/EventDispatcher';
import { inMemoryEventBus } from '../../../../shared/infrastructure/events/InMemoryEventBus';
import { PrismaInventoryRepository } from '../../../inventory/infrastructure/repositories/PrismaInventoryRepository';
import { InventoryService } from '../../../inventory/application/services/InventoryService';

export function makeOrderController(tenantId: string): OrderController {
  // 1. Instantiate the Repository with request-scoped tenant context
  const orderRepo = new PrismaOrderRepository(prismaClient, tenantId);
  
  // 2. Instantiate the Adapter for cross-module integration
  const pricingAdapter = new MenuPricingAdapter(prismaClient);
  
  // 3. Instantiate Event Dispatcher for outbox
  const outboxRepo = new PrismaOutboxRepository(prismaClient);
  const eventDispatcher = new EventDispatcher(outboxRepo, inMemoryEventBus);

  // 4. Instantiate Inventory Service for synchronous stock reservations
  const inventoryRepo = new PrismaInventoryRepository(prismaClient);
  const inventoryService = new InventoryService(inventoryRepo, eventDispatcher);

  // 5. Instantiate the Use Case, injecting ports
  const useCase = new PlaceOrderUseCase(orderRepo, pricingAdapter, eventDispatcher, inventoryService);
  
  // 6. Instantiate and return the Controller
  return new OrderController(useCase);
}
