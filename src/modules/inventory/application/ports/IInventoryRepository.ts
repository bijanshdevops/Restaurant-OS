import { StockLevel } from '../../domain/aggregates/StockLevel';

export interface IInventoryRepository {
  /**
   * Finds a stock level by tenant and menu item.
   * Note: The `tx` argument allows this read to participate in a broader transaction.
   */
  findByMenuItemId(tenantId: string, menuItemId: string, tx?: any): Promise<StockLevel | null>;

  /**
   * Saves the StockLevel, leveraging optimistic locking using the version field.
   * Must throw if a concurrency conflict occurs.
   */
  save(stockLevel: StockLevel, tx: any): Promise<void>;
}
