import { ITenantStatsRepository } from '../ports/ITenantStatsRepository';

export interface TenantStatsDto {
  tenantId: string;
  totalOrders: number;
  totalRevenue: number;
  currency: string;
}

export class GetTenantStatsUseCase {
  constructor(private readonly statsRepository: ITenantStatsRepository) {}

  public async execute(tenantId: string): Promise<TenantStatsDto> {
    const stats = await this.statsRepository.getByTenantId(tenantId);
    
    // Return a decoupled DTO rather than the rich Domain Aggregate
    return {
      tenantId: stats.tenantId,
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      currency: stats.currency
    };
  }
}
