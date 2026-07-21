import { IMenuPricingService } from '../../application/ports/IMenuPricingService';
import { Money } from '../../../../shared/domain/value-objects/Money';

type PrismaClient = any;

/**
 * Acts as an Anti-Corruption Layer (Adapter) between the Orders Module and the Menu Module database.
 * Instead of importing Menu Entities directly (which would tightly couple the domains),
 * this adapter performs a Read-Only projection directly from the database, satisfying the Port.
 */
export class MenuPricingAdapter implements IMenuPricingService {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  public async getPrice(menuItemId: string, tenantId: string): Promise<Money> {
    const item = await this.prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        tenantId: tenantId,
        isActive: true
      },
      select: {
        priceAmount: true,
        priceCurrency: true
      }
    });

    if (!item) {
      throw new Error(`Menu item ${menuItemId} not found or is currently inactive.`);
    }

    return Money.create(item.priceAmount, item.priceCurrency);
  }
}
