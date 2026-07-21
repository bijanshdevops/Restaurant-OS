export async function register() {
  // Ensure we only execute this registration on the Node.js server runtime
  // This prevents issues if Next.js attempts to bundle this for the Edge runtime or Client
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    
    // Dynamically import the singletons and subscribers to prevent premature execution
    const { inMemoryEventBus } = await import('./shared/infrastructure/events/InMemoryEventBus');
    const { OrderPaidSubscriber } = await import('./modules/kitchen/application/subscribers/OrderPaidSubscriber');
    const { CreateTicketsFromOrderUseCase } = await import('./modules/kitchen/application/use-cases/CreateTicketsFromOrderUseCase');
    const { PrismaKitchenTicketRepository } = await import('./modules/kitchen/infrastructure/repositories/PrismaKitchenTicketRepository');
    const { PrismaClient } = await import('@prisma/client');

    // 1. Wire up the dependency chain for the Kitchen subscriber
    const prisma = new PrismaClient();
    // tenantId is resolved per-request in actual use cases; here we pass a placeholder
    // since the subscriber re-uses the tenantId from the event payload itself.
    const kitchenRepo = new PrismaKitchenTicketRepository(prisma, '__system__');
    const createTicketsUseCase = new CreateTicketsFromOrderUseCase(kitchenRepo);
    const orderPaidSubscriber = new OrderPaidSubscriber(createTicketsUseCase);

    // 2. Subscribe it to the generic 'OrderPaidEvent'
    inMemoryEventBus.subscribe('OrderPaidEvent', async (event) => {
      await orderPaidSubscriber.handle(event);
    });

    console.log('[Instrumentation] 🚀 EventBus initialized and Kitchen subscribers registered successfully.');
  }
}
