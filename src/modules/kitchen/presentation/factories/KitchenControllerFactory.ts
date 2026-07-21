import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { PrismaKitchenTicketRepository } from '../../infrastructure/repositories/PrismaKitchenTicketRepository';
import { UpdateTicketStatusUseCase } from '../../application/use-cases/UpdateTicketStatusUseCase';
import { KitchenController } from '../controllers/KitchenController';

export function makeKitchenController(tenantId: string): KitchenController {
  // 1. Instantiate the Repository with request-scoped tenant context
  const repo = new PrismaKitchenTicketRepository(prismaClient, tenantId);
  
  // 2. Instantiate the Use Case
  const useCase = new UpdateTicketStatusUseCase(repo);
  
  // 3. Instantiate and return the Controller
  return new KitchenController(useCase);
}
