import { randomUUID } from 'crypto';

export class TenantStats {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public totalOrders: number,
    public totalRevenue: number,
    public currency: string,
    public ordersBySegment: Record<string, number>,
    public revenueBySegment: Record<string, number>
  ) {}

  /**
   * Factory method for hydrating an existing aggregate from the database.
   */
  public static from(
    id: string,
    tenantId: string,
    totalOrders: number,
    totalRevenue: number,
    currency: string,
    ordersBySegment: Record<string, number>,
    revenueBySegment: Record<string, number>
  ): TenantStats {
    return new TenantStats(id, tenantId, totalOrders, totalRevenue, currency, ordersBySegment, revenueBySegment);
  }

  /**
   * Factory method for creating a brand new aggregate.
   */
  public static create(tenantId: string, currency: string = 'USD'): TenantStats {
    return new TenantStats(randomUUID(), tenantId, 0, 0, currency, {}, {});
  }

  /**
   * Domain Logic: Process a new order's financial impact.
   */
  public recordOrder(amount: number): void {
    if (amount < 0) {
      throw new Error('Cannot record negative order revenue.');
    }
    this.totalOrders += 1;
    this.totalRevenue += amount;
  }

  /**
   * Domain Logic: Process a segment-specific purchase
   */
  public recordSegmentPurchase(segment: string, amount: number): void {
    if (amount < 0) return;
    
    // Initialize if absent
    if (!this.ordersBySegment[segment]) this.ordersBySegment[segment] = 0;
    if (!this.revenueBySegment[segment]) this.revenueBySegment[segment] = 0;

    this.ordersBySegment[segment] += 1;
    this.revenueBySegment[segment] += amount;
  }
}
