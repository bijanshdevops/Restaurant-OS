import { AnalyticsController } from '../controllers/AnalyticsController';
import { GetTenantStatsUseCase } from '../../application/use-cases/GetTenantStatsUseCase';
import { PrismaTenantStatsRepository } from '../../infrastructure/repositories/PrismaTenantStatsRepository';
import { CachedTenantStatsRepository } from '../../infrastructure/repositories/CachedTenantStatsRepository';
import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';

export function makeAnalyticsController(): AnalyticsController {
  const baseRepo = new PrismaTenantStatsRepository(prismaClient);
  const cachedRepo = new CachedTenantStatsRepository(baseRepo);
  const useCase = new GetTenantStatsUseCase(cachedRepo);
  
  return new AnalyticsController(useCase);
}
