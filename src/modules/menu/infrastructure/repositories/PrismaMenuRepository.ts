import { IMenuRepository } from '../../application/ports/IMenuRepository';
import { Menu } from '../../domain/aggregates/Menu';
import { MenuMapper } from '../mappers/MenuMapper';

// In a real implementation, this would be imported from '@prisma/client'.
// Used 'any' here to satisfy the compiler since the Prisma client isn't generated yet.
type PrismaClient = any;

export class PrismaMenuRepository implements IMenuRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly currentTenantId: string // Injected via Request Scope or TenantContext Service
  ) {}

  public async save(menu: Menu): Promise<void> {
    const rawMenu = MenuMapper.toPersistence(menu);

    // Using Prisma 'upsert' to handle both creation and updates within a single transaction
    await this.prisma.menu.upsert({
      where: { 
        id: rawMenu.id 
      },
      update: {
        title: rawMenu.title,
        status: rawMenu.status,
        // In a complex aggregate, item synchronization (updates, deletes) would be explicitly 
        // calculated here. For this foundation, we focus on the root boundary.
      },
      create: {
        id: rawMenu.id,
        tenantId: this.currentTenantId, // Multi-Tenant enforcement on insertion
        title: rawMenu.title,
        status: rawMenu.status,
        items: {
          create: rawMenu.items.map((item: any) => ({
            id: item.id,
            tenantId: this.currentTenantId, // Multi-Tenant enforcement on nested insertion
            title: item.title,
            description: item.description,
            priceAmount: item.priceAmount,
            priceCurrency: item.priceCurrency,
            isActive: item.isActive
          }))
        }
      }
    });
  }

  public async findById(id: string): Promise<Menu | null> {
    const rawMenu = await this.prisma.menu.findFirst({
      where: { 
        id: id,
        tenantId: this.currentTenantId // Multi-Tenant enforcement on retrieval
      },
      include: {
        items: true // Fetch the entire aggregate boundary
      }
    });

    if (!rawMenu) {
      return null;
    }

    return MenuMapper.toDomain(rawMenu);
  }
}
