import { StockLevel } from '../../domain/aggregates/StockLevel';
import { IInventoryRepository } from '../../application/ports/IInventoryRepository';

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: any) {}

  public async findByMenuItemId(tenantId: string, menuItemId: string, tx?: any): Promise<StockLevel | null> {
    const db = tx || this.prisma;
    const record = await db.stockLevel.findUnique({
      where: {
        tenantId_menuItemId: {
          tenantId,
          menuItemId
        }
      }
    });

    if (!record) return null;

    return StockLevel.create(
      record.id,
      record.tenantId,
      record.menuItemId,
      record.currentStock,
      record.threshold,
      record.version
    );
  }

  public async save(stockLevel: StockLevel, tx: any): Promise<void> {
    // 1. Check if the record exists
    const existing = await tx.stockLevel.findUnique({
      where: { id: stockLevel.id }
    });

    if (!existing) {
      // Create new record
      await tx.stockLevel.create({
        data: {
          id: stockLevel.id,
          tenantId: stockLevel.tenantId,
          menuItemId: stockLevel.menuItemId,
          currentStock: stockLevel.currentStock,
          threshold: stockLevel.threshold,
          version: stockLevel.version
        }
      });
      return;
    }

    // 2. Optimistic Concurrency Control Update
    // We strictly match the PREVIOUS version to ensure no other transaction mutated it
    const updateResult = await tx.stockLevel.updateMany({
      where: {
        id: stockLevel.id,
        version: stockLevel.version - 1 // The aggregate bumped it locally in memory
      },
      data: {
        currentStock: stockLevel.currentStock,
        version: stockLevel.version
      }
    });

    // 3. Collision Detection
    if (updateResult.count === 0) {
      throw new Error(`Domain Exception: Concurrency conflict detected while updating inventory for item ${stockLevel.menuItemId}.`);
    }
  }
}
