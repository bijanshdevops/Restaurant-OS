import { TenantConfiguration } from '../../domain/aggregates/TenantConfiguration';

export interface FetchOptions {
  fetchFeatures?: boolean;
  fetchSettings?: boolean;
}

export interface ITenantConfigRepository {
  /**
   * Retrieves the configuration for a given tenant.
   * Due to the high read-volume of configurations, implementations of this port 
   * should be aggressively cached.
   * Supports partial fetching to optimize memory footprint via FetchOptions.
   */
  getByTenantId(tenantId: string, options?: FetchOptions): Promise<TenantConfiguration>;
  
  /**
   * Persists the configuration for a tenant and invalidates associated caches.
   */
  save(config: TenantConfiguration): Promise<void>;
}
