import { ITenantStatsRepository } from '../../application/ports/ITenantStatsRepository';
import { TenantStats } from '../../domain/aggregates/TenantStats';

export class CachedTenantStatsRepository implements ITenantStatsRepository {
  private cache = new Map<string, { data: TenantStats; timestamp: number }>();
  // 5 minute TTL for analytics to prioritize performance over real-time accuracy
  private readonly TTL_MS = 5 * 60 * 1000; 

  constructor(private readonly baseRepository: ITenantStatsRepository) {}

  public async getByTenantId(tenantId: string): Promise<TenantStats> {
    const cached = this.cache.get(tenantId);
    
    if (cached && (Date.now() - cached.timestamp < this.TTL_MS)) {
      return cached.data;
    }

    const stats = await this.baseRepository.getByTenantId(tenantId);
    this.cache.set(tenantId, { data: stats, timestamp: Date.now() });
    
    return stats;
  }

  public async save(stats: TenantStats): Promise<void> {
    await this.baseRepository.save(stats);
    // Write-through cache strategy
    this.cache.set(stats.tenantId, { data: stats, timestamp: Date.now() });
  }
}
