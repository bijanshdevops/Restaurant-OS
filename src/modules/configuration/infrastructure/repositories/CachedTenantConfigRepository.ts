import { ITenantConfigRepository, FetchOptions } from '../../application/ports/ITenantConfigRepository';
import { TenantConfiguration } from '../../domain/aggregates/TenantConfiguration';

interface CacheEntry {
  data: TenantConfiguration;
  timestamp: number;
  optionsHash: string; // Tracks what was requested
}

export class CachedTenantConfigRepository implements ITenantConfigRepository {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 60000; 

  constructor(private readonly baseRepository: ITenantConfigRepository) {}

  private hashOptions(options?: FetchOptions): string {
    const feats = options?.fetchFeatures !== false;
    const sets = options?.fetchSettings !== false;
    return `${feats}-${sets}`;
  }

  public async getByTenantId(tenantId: string, options?: FetchOptions): Promise<TenantConfiguration> {
    const targetHash = this.hashOptions(options);
    const cached = this.cache.get(tenantId);
    
    // Cache Hit: Valid TTL AND the cached payload contains at least what we are asking for
    // A fully cached object ("true-true") can satisfy a partial request ("true-false")
    if (cached && (Date.now() - cached.timestamp < this.TTL_MS)) {
      if (cached.optionsHash === targetHash || cached.optionsHash === 'true-true') {
        return cached.data;
      }
    }

    // Cache Miss
    const config = await this.baseRepository.getByTenantId(tenantId, options);
    
    // Write to Cache
    this.cache.set(tenantId, { data: config, timestamp: Date.now(), optionsHash: targetHash });
    
    return config;
  }

  public async save(config: TenantConfiguration): Promise<void> {
    await this.baseRepository.save(config);
    // Overwrite cache with a fully populated config object
    this.cache.set(config.tenantId, { data: config, timestamp: Date.now(), optionsHash: 'true-true' });
  }
}
