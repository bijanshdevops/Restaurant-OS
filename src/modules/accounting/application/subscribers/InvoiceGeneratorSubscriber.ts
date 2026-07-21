import { IEventBus } from '../../../../shared/application/ports/IEventBus';
import { PrismaAccountingRepository } from '../../infrastructure/repositories/PrismaAccountingRepository';
import { Invoice } from '../../domain/aggregates/Invoice';
import { randomUUID } from 'crypto';
import { IDomainEventPublisher } from '../../../../shared/domain/events/IDomainEventPublisher';

export class InvoiceGeneratorSubscriber {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly accountingRepository: PrismaAccountingRepository,
    private readonly eventDispatcher: IDomainEventPublisher
  ) {}

  public subscribe(): void {
    this.eventBus.subscribe('OrderPaidEvent', async (event: any) => {
      try {
        if (!event.tenantId || !event.orderId || event.totalAmount === undefined) {
          throw new Error('Malformed OrderPaidEvent: Missing required financial properties.');
        }

        // 1. Generate the structured immutable Invoice
        const invoice = Invoice.generate(
          randomUUID(),
          event.tenantId,
          event.orderId,
          event.totalAmount,
          event.currency || 'USD'
        );

        // 2. Persist the Invoice
        // We use a separate local transaction/connection here since this is triggered async via the EventBus
        await this.accountingRepository.save(invoice);

        // Optional: If we want this to sync to external APIs like Quickbooks, 
        // we could emit an `InvoiceGeneratedEvent` through the eventDispatcher here to hit the Outbox.

      } catch (error) {
        // Log the failure heavily. A dead-letter queue (DLQ) should catch this in production.
        console.error(`[Accounting] Failed to generate invoice for order ${event?.orderId}`, error);
      }
    });
  }
}
