import { IUserRepository } from '../ports/IUserRepository';
import { User } from '../../domain/aggregates/User';
import { Role } from '../../domain/value-objects/Role';
import { PasswordHasher } from '../../../../shared/infrastructure/security/PasswordHasher';
import { randomUUID } from 'crypto';

export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(tenantId: string, email: string, plainTextPassword: string, roleName: string): Promise<void> {
    // 1. Verify Uniqueness Constraint across the explicit tenant boundary
    const existingUser = await this.userRepository.findByEmail(email, tenantId);
    if (existingUser) {
      throw new Error('Application Exception: Email already registered in this tenant.');
    }

    // 2. Hash password utilizing secure BCrypt implementation
    const hashedPassword = await PasswordHasher.hash(plainTextPassword);

    // 3. Resolve Business Role (Validates Domain Integrity)
    const role = Role.fromString(roleName);

    // 4. Aggregate Instantiation
    const newUser = User.create(
      randomUUID(),
      tenantId,
      email,
      hashedPassword,
      [role]
    );

    // 5. Atomic Persistence
    await this.userRepository.save(newUser);
  }
}
