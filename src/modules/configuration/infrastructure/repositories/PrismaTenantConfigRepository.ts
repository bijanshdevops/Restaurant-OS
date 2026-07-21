import { ITenantConfigRepository, FetchOptions } from '../../application/ports/ITenantConfigRepository';
import { TenantConfiguration, FeatureFlag } from '../../domain/aggregates/TenantConfiguration';

type PrismaClient = any;

export class PrismaTenantConfigRepository implements ITenantConfigRepository {
  private static readonly GLOBAL_PLATFORM_TENANT = 'GLOBAL_PLATFORM';

  constructor(private readonly prisma: PrismaClient) {}

  public async getByTenantId(tenantId: string, options?: FetchOptions): Promise<TenantConfiguration> {
    const selectClause = {
      tenantId: true,
      features: options?.fetchFeatures !== false,
      settings: options?.fetchSettings !== false
    };

    const rawConfig = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: selectClause
    });

    if (!rawConfig) {
      if (tenantId !== PrismaTenantConfigRepository.GLOBAL_PLATFORM_TENANT) {
        const globalConfig = await this.prisma.tenantConfig.findUnique({
          where: { tenantId: PrismaTenantConfigRepository.GLOBAL_PLATFORM_TENANT },
          select: selectClause
        });

        if (globalConfig) {
          return this.mapToDomain(tenantId, globalConfig.features, globalConfig.settings);
        }
      }

      return TenantConfiguration.create(tenantId);
    }

    return this.mapToDomain(tenantId, rawConfig.features, rawConfig.settings);
  }

  public async save(config: TenantConfiguration): Promise<void> {
    // Transform JS Maps to JSON-serializable standard Objects
    const featuresObj = Object.fromEntries(config.features.entries());
    const settingsObj = Object.fromEntries(config.settings.entries());

    // Safely Upsert: Create if it's a new tenant, Update if they are mutating flags
    await this.prisma.tenantConfig.upsert({
      where: { tenantId: config.tenantId },
      update: {
        features: featuresObj,
        settings: settingsObj
      },
      create: {
        tenantId: config.tenantId,
        features: featuresObj,
        settings: settingsObj
      }
    });
  }

  /**
   * Helper logic mapping un-typed PostgreSQL JSON blobs into safe, 
   * statically-typed Domain Value Objects.
   */
  private mapToDomain(tenantId: string, rawFeatures: any, rawSettings: any): TenantConfiguration {
    const featuresMap = new Map<FeatureFlag, boolean>();
    const settingsMap = new Map<string, any>();

    if (rawFeatures && typeof rawFeatures === 'object') {
      Object.entries(rawFeatures).forEach(([key, value]) => {
        // Enforce strict boolean casting
        featuresMap.set(key as FeatureFlag, Boolean(value));
      });
    }

    if (rawSettings && typeof rawSettings === 'object') {
      Object.entries(rawSettings).forEach(([key, value]) => {
        settingsMap.set(key, value);
      });
    }

    return TenantConfiguration.create(tenantId, featuresMap, settingsMap);
  }
}
