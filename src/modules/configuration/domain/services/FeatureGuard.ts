import { ITenantConfigRepository } from '../../application/ports/ITenantConfigRepository';
import { FeatureFlag } from '../aggregates/TenantConfiguration';

export class FeatureGuard {
  // Constant defining the fallback global configuration layer
  private static readonly GLOBAL_TENANT_ID = 'GLOBAL_PLATFORM';

  constructor(private readonly configRepository: ITenantConfigRepository) {}

  /**
   * Centralized Domain Logic to evaluate if a tenant is authorized for a feature.
   * Utilizes a cascaded fallback architecture: Tenant Settings -> Global Settings.
   */
  public async isFeatureEnabled(tenantId: string, featureName: FeatureFlag): Promise<boolean> {
    // 1. Fetch Tenant Specific Configuration
    const tenantConfig = await this.configRepository.getByTenantId(tenantId);
    
    // If the tenant explicitly has the feature mapped (true OR false), respect it strictly.
    if (tenantConfig.features.has(featureName)) {
      return tenantConfig.isFeatureEnabled(featureName);
    }

    // 2. Fallback to Global Platform Tenant Configuration
    if (tenantId !== FeatureGuard.GLOBAL_TENANT_ID) {
      const globalConfig = await this.configRepository.getByTenantId(FeatureGuard.GLOBAL_TENANT_ID);
      return globalConfig.isFeatureEnabled(featureName);
    }

    // Default to false if entirely undefined in the system
    return false;
  }

  /**
   * Retrieves a setting with the same cascaded Global Platform Fallback.
   */
  public async getSetting<T>(tenantId: string, key: string): Promise<T | undefined> {
    const tenantConfig = await this.configRepository.getByTenantId(tenantId);
    
    const tenantSetting = tenantConfig.getSetting<T>(key);
    if (tenantSetting !== undefined) {
      return tenantSetting;
    }

    if (tenantId !== FeatureGuard.GLOBAL_TENANT_ID) {
      const globalConfig = await this.configRepository.getByTenantId(FeatureGuard.GLOBAL_TENANT_ID);
      return globalConfig.getSetting<T>(key);
    }

    return undefined;
  }
}
