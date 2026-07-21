import { AggregateRoot } from '@/shared/domain/AggregateRoot';
import { InventoryLowEvent } from '../events/InventoryLowEvent';

export class StockLevel extends AggregateRoot<string> {
  private _tenantId: string;
  private _menuItemId: string;
  private _currentStock: number;
  private _threshold: number;
  private _version: number;

  private constructor(
    id: string,
    tenantId: string,
    menuItemId: string,
    currentStock: number,
    threshold: number,
    version: number
  ) {
    super({} as string, id);
    this._tenantId = tenantId;
    this._menuItemId = menuItemId;
    this._currentStock = currentStock;
    this._threshold = threshold;
    this._version = version;
  }

  public static create(
    id: string,
    tenantId: string,
    menuItemId: string,
    currentStock: number,
    threshold: number,
    version: number = 1
  ): StockLevel {
    return new StockLevel(id, tenantId, menuItemId, currentStock, threshold, version);
  }

  /**
   * Reserves a specific quantity of stock.
   * Throws if insufficient stock.
   */
  public reserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Domain Exception: Cannot reserve a zero or negative quantity.');
    }

    if (this._currentStock < quantity) {
      throw new Error(`Domain Exception: Insufficient stock for menu item ${this._menuItemId}. Requested: ${quantity}, Available: ${this._currentStock}`);
    }

    this._currentStock -= quantity;

    // Concurrency control: signal that this aggregate has mutated
    this._version += 1;

    // Check if we dropped below the threshold and should alert the owner
    if (this._currentStock <= this._threshold) {
      this.addDomainEvent(
        new InventoryLowEvent(this._tenantId, this._menuItemId, this._currentStock, this._threshold, this.id)
      );
    }
  }

  // Getters
  get tenantId(): string { return this._tenantId; }
  get menuItemId(): string { return this._menuItemId; }
  get currentStock(): number { return this._currentStock; }
  get threshold(): number { return this._threshold; }
  get version(): number { return this._version; }
}
