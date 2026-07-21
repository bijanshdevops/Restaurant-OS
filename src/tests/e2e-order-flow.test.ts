import { inMemoryEventBus } from '../shared/infrastructure/events/InMemoryEventBus';
import { OrderPaidSubscriber } from '../modules/kitchen/application/subscribers/OrderPaidSubscriber';
import { CreateTicketsFromOrderUseCase } from '../modules/kitchen/application/use-cases/CreateTicketsFromOrderUseCase';
import { OrderPaidEvent } from '../modules/orders/domain/events/OrderPaidEvent';
import { StationType } from '../modules/kitchen/domain/value-objects/StationType';
import { IKitchenTicketRepository } from '../modules/kitchen/application/ports/IKitchenTicketRepository';
import { KitchenTicket } from '../modules/kitchen/domain/aggregates/KitchenTicket';

// 1. Mock the Repository to isolate the domain logic from database I/O for speed and reliability
class MockKitchenTicketRepository implements IKitchenTicketRepository {
  public savedTickets: KitchenTicket[] = [];

  public async save(ticket: KitchenTicket): Promise<void> {
    this.savedTickets.push(ticket);
  }

  public async findById(id: string): Promise<KitchenTicket | null> {
    return this.savedTickets.find(t => t.id === id) || null;
  }
}

describe('E2E Flow: Payment Webhook to Kitchen Dispatch', () => {
  let mockRepository: MockKitchenTicketRepository;
  let useCase: CreateTicketsFromOrderUseCase;
  let subscriber: OrderPaidSubscriber;

  beforeAll(() => {
    // 2. Dependency Injection Setup
    mockRepository = new MockKitchenTicketRepository();
    
    // TicketRouter domain service is instantiated internally by default
    useCase = new CreateTicketsFromOrderUseCase(mockRepository);
    
    subscriber = new OrderPaidSubscriber(useCase);

    // 3. Register Subscriber to the Event Bus
    inMemoryEventBus.subscribe('OrderPaidEvent', async (event) => {
      await subscriber.handle(event);
    });
  });

  it('should successfully capture an OrderPaidEvent and correctly route it to multiple isolated Kitchen Stations', async () => {
    // Setup test payloads
    const testTenantId = 'tenant_global_1';
    const testOrderId = 'order_abc_123';
    const testTransactionId = 'txn_stripe_999';

    // Mock items payload representing a mixed order.
    // Note: In production, the UseCase fetches 'stationType' from the Menu Module via a Port.
    const orderItems = [
      { menuItemId: 'item_burger', quantity: 2, stationType: StationType.GRILL },
      { menuItemId: 'item_salad', quantity: 1, stationType: StationType.COLD_STATION },
      { menuItemId: 'item_fries', quantity: 2, stationType: StationType.FRY_STATION },
      { menuItemId: 'item_steak', quantity: 1, stationType: StationType.GRILL }
    ];

    // 4. Simulate the Trigger (e.g., Payment Module verifying webhook and firing event)
    const event = new OrderPaidEvent(testTenantId, testOrderId, testTransactionId, orderItems);
    
    await inMemoryEventBus.publish(event);

    // Yield control to the event loop so setImmediate tasks (EventBus) and async handlers can finish
    await new Promise(resolve => setTimeout(resolve, 50));

    // 5. Assertions: Ensure cross-module logic succeeded securely
    
    // Since there are 3 distinct StationTypes in the order, we expect exactly 3 separate tickets.
    expect(mockRepository.savedTickets.length).toBe(3);

    // Validate strict Multi-Tenant isolation
    const isolatedCorrectly = mockRepository.savedTickets.every(ticket => ticket.tenantId === testTenantId);
    expect(isolatedCorrectly).toBe(true);

    // Validate that tickets were created specifically for their target stations
    const grillTicket = mockRepository.savedTickets.find(t => t.stationType === StationType.GRILL);
    const coldTicket = mockRepository.savedTickets.find(t => t.stationType === StationType.COLD_STATION);
    const fryTicket = mockRepository.savedTickets.find(t => t.stationType === StationType.FRY_STATION);

    expect(grillTicket).toBeDefined();
    expect(coldTicket).toBeDefined();
    expect(fryTicket).toBeDefined();

    // Verify the Domain Service cleanly mapped the items inside the Grill aggregate
    expect(grillTicket!.items.length).toBe(2); // Burger & Steak
    
    const burgerItem = grillTicket!.items.find(i => i.menuItemId === 'item_burger');
    expect(burgerItem!.quantity).toBe(2);
  });
});
