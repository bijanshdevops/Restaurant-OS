import { IOrderRepository } from '../../application/ports/IOrderRepository';
import { Order } from '../../domain/aggregates/Order';
import { OrderMapper } from '../mappers/OrderMapper';

type PrismaClient = any;

export class PrismaOrderRepository implements IOrderRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly currentTenantId: string
  ) {}

  public async save(order: Order, tx?: any): Promise<void> {
    const rawOrder = OrderMapper.toPersistence(order);
    const client = tx || this.prisma;

    await client.order.upsert({
      where: { 
        id: rawOrder.id 
      },
      update: {
        status: rawOrder.status,
        paymentTransactionId: rawOrder.paymentTransactionId,
        totalAmount: rawOrder.totalAmount,
        currency: rawOrder.currency,
      },
      create: {
        id: rawOrder.id,
        tenantId: this.currentTenantId,
        customerId: rawOrder.customerId,
        status: rawOrder.status,
        paymentTransactionId: rawOrder.paymentTransactionId,
        totalAmount: rawOrder.totalAmount,
        currency: rawOrder.currency,
        items: {
          create: rawOrder.items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal
          }))
        }
      }
    });
  }

  public async findById(id: string): Promise<Order | null> {
    const rawOrder = await this.prisma.order.findFirst({
      where: { 
        id: id,
        tenantId: this.currentTenantId 
      },
      include: {
        items: true
      }
    });

    if (!rawOrder) {
      return null;
    }

    return OrderMapper.toDomain(rawOrder);
  }
}
