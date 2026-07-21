import { randomUUID } from 'crypto';
import { prismaClient } from '../shared/infrastructure/database/prismaClient';
import { inMemoryEventBus } from '../shared/infrastructure/events/InMemoryEventBus';

import { makeIdentityController } from '../modules/identity/presentation/factories/IdentityControllerFactory';
import { makeMenuController } from '../modules/menu/presentation/factories/MenuControllerFactory';
import { makeOrderController } from '../modules/orders/presentation/factories/OrderControllerFactory';
import { makeAnalyticsController } from '../modules/analytics/presentation/factories/AnalyticsControllerFactory';

import { OrderPlacedSubscriber } from '../modules/analytics/application/subscribers/OrderPlacedSubscriber';
import { CustomerPurchaseRecordedSubscriber } from '../modules/analytics/application/subscribers/CustomerPurchaseRecordedSubscriber';
import { PrismaTenantStatsRepository } from '../modules/analytics/infrastructure/repositories/PrismaTenantStatsRepository';
import { CustomerUpdateSubscriber } from '../modules/crm/application/subscribers/CustomerUpdateSubscriber';
import { PrismaCrmRepository } from '../modules/crm/infrastructure/repositories/PrismaCrmRepository';
import { InvoiceGeneratorSubscriber } from '../modules/accounting/application/subscribers/InvoiceGeneratorSubscriber';
import { PrismaAccountingRepository } from '../modules/accounting/infrastructure/repositories/PrismaAccountingRepository';
import { EventDispatcher } from '../modules/integration/application/services/EventDispatcher';
import { PrismaOutboxRepository } from '../modules/integration/infrastructure/repositories/PrismaOutboxRepository';

describe('E2E Flow: Order Placement to Analytics Updates', () => {
  let identityController: any;
  let menuController: any;
  let orderController: any;
  let analyticsController: any;

  const tenantId = `tenant_${randomUUID()}`;
  const otherTenantId = `tenant_${randomUUID()}`;

  // Helper to simulate Express/Next.js response objects cleanly
  const createMockRes = () => {
    const res: any = { statusCode: 200, headers: {}, data: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.data = data; return res; };
    res.setHeader = (key: string, value: string) => { res.headers[key] = value; };
    return res;
  };

  beforeAll(() => {
    // 1. Initialize Controllers
    identityController = makeIdentityController();
    menuController = makeMenuController(tenantId);
    orderController = makeOrderController(tenantId);
    analyticsController = makeAnalyticsController();

    // 2. Wire up the background Subscribers to the InMemoryEventBus
    const statsRepo = new PrismaTenantStatsRepository(prismaClient);
    const orderPlacedSubscriber = new OrderPlacedSubscriber(inMemoryEventBus, statsRepo);
    orderPlacedSubscriber.subscribe();

    const crmRepo = new PrismaCrmRepository(prismaClient);
    const outboxRepo = new PrismaOutboxRepository(prismaClient);
    const eventDispatcher = new EventDispatcher(outboxRepo, inMemoryEventBus);
    
    const customerUpdateSubscriber = new CustomerUpdateSubscriber(inMemoryEventBus, crmRepo, eventDispatcher);
    customerUpdateSubscriber.subscribe();

    const customerPurchaseSubscriber = new CustomerPurchaseRecordedSubscriber(inMemoryEventBus, statsRepo);
    customerPurchaseSubscriber.subscribe();

    const accountingRepo = new PrismaAccountingRepository(prismaClient);
    const invoiceSubscriber = new InvoiceGeneratorSubscriber(inMemoryEventBus, accountingRepo, eventDispatcher);
    invoiceSubscriber.subscribe();
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  it('should process a full end-to-end order and update analytics accurately', async () => {
    // --- 1. Register Owner ---
    const reqRegister = { body: { tenantId, email: `owner_${tenantId}@test.com`, password: 'password123', role: 'OWNER' } };
    const resRegister = createMockRes();
    await identityController.register(reqRegister, resRegister);
    expect(resRegister.statusCode).toBe(201);

    // --- 2. Create Menu ---
    const reqMenu = { user: { tenantId }, body: { title: 'Test Menu', description: 'Delicious items' } };
    const resMenu = createMockRes();
    await menuController.createMenu(reqMenu, resMenu);
    expect(resMenu.statusCode).toBe(201);
    const menuId = resMenu.data.data.id;

    // We must manually inject a menu item directly via Prisma for the test since the Menu domain 
    // might not expose a direct "addItem" endpoint yet, or we assume it exists. 
    // To strictly test the Order/Analytics bound, we'll quickly seed an item.
    const menuItemId = randomUUID();
    await prismaClient.menuItem.create({
      data: {
        id: menuItemId,
        menuId: menuId,
        name: 'Gourmet Burger',
        price: 15.50
      }
    });

    // Insert stock for the Inventory Reservation
    await prismaClient.stockLevel.create({
      data: {
        id: randomUUID(),
        tenantId: tenantId,
        menuItemId: menuItemId,
        currentStock: 100,
        threshold: 10,
        version: 1
      }
    });

    // --- 3. Place Order ---
    // Simulating a customer order with 2 Gourmet Burgers
    const reqOrder = {
      user: { tenantId },
      body: {
        customerId: 'customer_123',
        items: [
          { menuItemId: menuItemId, quantity: 2 } // 2 * 15.50 = 31.00
        ]
      }
    };
    const resOrder = createMockRes();
    await orderController.placeOrder(reqOrder, resOrder);
    expect(resOrder.statusCode).toBe(201);

    // --- 4. Await Asynchronous Event Processing ---
    // EventDispatcher pushes to InMemoryEventBus via setImmediate, so we yield the event loop
    await new Promise((resolve) => setTimeout(resolve, 100));

    // --- 5. Verify Analytics ---
    const reqAnalytics = { user: { tenantId } };
    const resAnalytics = createMockRes();
    await analyticsController.getStats(reqAnalytics, resAnalytics);
    
    expect(resAnalytics.statusCode).toBe(200);
    expect(resAnalytics.data.data).toMatchObject({
      tenantId: tenantId,
      totalOrders: 1,
      totalRevenue: 31.00
    });
    // Check Segment tracking
    expect(resAnalytics.data.data.revenueBySegment).toHaveProperty('REGULAR', 31.00);

    // --- 6. Verify Tenant Isolation ---
    const reqOtherAnalytics = { user: { tenantId: otherTenantId } };
    const resOtherAnalytics = createMockRes();
    await analyticsController.getStats(reqOtherAnalytics, resOtherAnalytics);
    
    // The other tenant should have initialized from zero seamlessly
    expect(resOtherAnalytics.statusCode).toBe(200);
    expect(resOtherAnalytics.data.data).toMatchObject({
      tenantId: otherTenantId,
      totalOrders: 0,
      totalRevenue: 0.00
    });
  });
});
