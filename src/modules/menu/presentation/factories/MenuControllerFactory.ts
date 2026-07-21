import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { PrismaMenuRepository } from '../../infrastructure/repositories/PrismaMenuRepository';
import { CreateMenuUseCase } from '../../application/use-cases/CreateMenuUseCase';
import { MenuController } from '../controllers/MenuController';

export function makeMenuController(tenantId: string): MenuController {
  // 1. Instantiate the repository (Infrastructure) with request-scoped tenant context
  const repository = new PrismaMenuRepository(prismaClient, tenantId);
  
  // 2. Instantiate the use case (Application)
  const useCase = new CreateMenuUseCase(repository);
  
  // 3. Instantiate and return the controller (Presentation)
  return new MenuController(useCase);
}
