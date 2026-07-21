import { prismaClient } from '../../../../shared/infrastructure/database/prismaClient';
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { IdentityController } from '../controllers/IdentityController';

export function makeIdentityController(): IdentityController {
  // Instantiate Persistence
  const repo = new PrismaUserRepository(prismaClient);
  
  // Instantiate Use Cases
  const registerUseCase = new RegisterUserUseCase(repo);
  const loginUseCase = new LoginUseCase(repo);
  
  // Assemble and return the Controller
  return new IdentityController(registerUseCase, loginUseCase);
}
