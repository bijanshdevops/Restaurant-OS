import { ITenantStatsRepository } from '../../application/ports/ITenantStatsRepository';
import { TenantStats } from '../../domain/aggregates/TenantStats';

type PrismaClient = any;

export class PrismaTenantStatsRepository implements ITenantStatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByTenantId(tenantId: string): Promise<TenantStats> {
    const rawStats = await this.prisma.tenantStats.findUnique({
      where: { tenantId }
    });

    if (!rawStats) {
      return TenantStats.create(tenantId);
    }

    return TenantStats.from(
      rawStats.id,
      rawStats.tenantId,
      rawStats.totalOrders,
      rawStats.totalRevenue,
      rawStats.currency,
      (rawStats.ordersBySegment as Record<string, number>) || {},
      (rawStats.revenueBySegment as Record<string, number>) || {}
    );
  }

  public async save(stats: TenantStats): Promise<void> {
    await this.prisma.tenantStats.upsert({
      where: { tenantId: stats.tenantId },
      update: {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        currency: stats.currency,
        ordersBySegment: stats.ordersBySegment,
        revenueBySegment: stats.revenueBySegment
      },
      create: {
        id: stats.id,
        tenantId: stats.tenantId,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        currency: stats.currency,
        ordersBySegment: stats.ordersBySegment,
        revenueBySegment: stats.revenueBySegment
      }
    });
  }
}
