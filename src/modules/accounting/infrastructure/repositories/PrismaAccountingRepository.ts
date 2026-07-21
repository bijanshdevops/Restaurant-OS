import { Invoice } from '../../domain/aggregates/Invoice';

export class PrismaAccountingRepository {
  constructor(private readonly prisma: any) {}

  public async save(invoice: Invoice, tx?: any): Promise<void> {
    const db = tx || this.prisma;
    
    // Invoices are strictly append-only (immutable)
    await db.invoice.create({
      data: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        orderId: invoice.orderId,
        amount: invoice.amount,
        currency: invoice.currency,
        createdAt: invoice.createdAt
      }
    });
  }
}
