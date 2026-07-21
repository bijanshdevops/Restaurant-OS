import { TenantStats } from '../../domain/aggregates/TenantStats';

export interface ITenantStatsRepository {
  /**
   * Fetches the analytics aggregate for a tenant.
   * If one does not exist, it should return a newly initialized aggregate (starting at 0).
   */
  getByTenantId(tenantId: string): Promise<TenantStats>;
  
  /**
   * Persists the updated analytics aggregate back to the database.
   */
  save(stats: TenantStats): Promise<void>;
}
