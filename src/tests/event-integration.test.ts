import { inMemoryEventBus } from '../shared/infrastructure/events/InMemoryEventBus';
import { OrderPaidSubscriber } from '../modules/kitchen/application/subscribers/OrderPaidSubscriber';
import { OrderPaidEvent } from '../modules/orders/domain/events/OrderPaidEvent';

describe('Event Bus Integration', () => {
  let subscriber: OrderPaidSubscriber;

  beforeAll(() => {
    // 1. Instantiate the Kitchen subscriber
    subscriber = new OrderPaidSubscriber();

    // 2. Register the subscriber to the Singleton Event Bus
    inMemoryEventBus.subscribe('OrderPaidEvent', async (event) => {
      await subscriber.handle(event);
    });
  });

  it('should successfully deliver an OrderPaidEvent to the Kitchen subscriber', async () => {
    // Spy on the subscriber's handle method to verify execution and payload
    const handleSpy = jest.spyOn(subscriber, 'handle');

    // Setup Test Data
    const testTenantId = 'tenant_123';
    const testOrderId = 'order_456';
    const testTransactionId = 'txn_789';

    // 3. Construct and fire the event
    const event = new OrderPaidEvent(testTenantId, testOrderId, testTransactionId);
    
    // Publish the event (our InMemoryEventBus uses setImmediate to dispatch asynchronously)
    await inMemoryEventBus.publish(event);

    // Yield control to the event loop so the setImmediate callback has time to execute
    await new Promise((resolve) => setImmediate(resolve));

    // 4. Assert the subscriber received the exact event correctly
    expect(handleSpy).toHaveBeenCalledTimes(1);
    
    const receivedEvent = handleSpy.mock.calls[0][0] as OrderPaidEvent;
    
    expect(receivedEvent.eventName).toBe('OrderPaidEvent');
    expect(receivedEvent.tenantId).toBe(testTenantId);
    expect(receivedEvent.orderId).toBe(testOrderId);
    expect(receivedEvent.paymentTransactionId).toBe(testTransactionId);
    expect(receivedEvent.occurredOn).toBeInstanceOf(Date);

    // Teardown
    handleSpy.mockRestore();
  });
});
