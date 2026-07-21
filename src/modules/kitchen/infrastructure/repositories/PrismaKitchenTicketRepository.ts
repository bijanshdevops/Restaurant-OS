import { IKitchenTicketRepository } from '../../application/ports/IKitchenTicketRepository';
import { KitchenTicket } from '../../domain/aggregates/KitchenTicket';
import { KitchenTicketMapper } from '../mappers/KitchenTicketMapper';

type PrismaClient = any;

export class PrismaKitchenTicketRepository implements IKitchenTicketRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly currentTenantId: string
  ) {}

  public async save(ticket: KitchenTicket): Promise<void> {
    const rawTicket = KitchenTicketMapper.toPersistence(ticket);

    // Persist securely leveraging Upsert to handle both creation and status updates
    await this.prisma.kitchenTicket.upsert({
      where: { 
        id: rawTicket.id 
      },
      update: {
        status: rawTicket.status,
      },
      create: {
        id: rawTicket.id,
        tenantId: this.currentTenantId,
        orderId: rawTicket.orderId,
        status: rawTicket.status,
        stationType: rawTicket.stationType,
        items: {
          create: rawTicket.items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity
          }))
        }
      }
    });
  }

  public async findById(id: string): Promise<KitchenTicket | null> {
    const rawTicket = await this.prisma.kitchenTicket.findFirst({
      where: {
        id: id,
        tenantId: this.currentTenantId
      },
      include: {
        items: true
      }
    });

    if (!rawTicket) {
      return null;
    }

    return KitchenTicketMapper.toDomain(rawTicket);
  }
}
