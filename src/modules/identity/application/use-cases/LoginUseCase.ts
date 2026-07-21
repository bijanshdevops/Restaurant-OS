import { IUserRepository } from '../ports/IUserRepository';
import { PasswordHasher } from '../../../../shared/infrastructure/security/PasswordHasher';
import { JwtService } from '../../../../shared/infrastructure/security/JwtService';

export class LoginUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(tenantId: string, email: string, plainTextPassword: string): Promise<string> {
    // 1. Fetch User constrained strictly by the Tenant boundary (Zero-Trust)
    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user) {
      throw new Error('Application Exception: Invalid credentials.');
    }

    // 2. Verify cryptographically hashed password
    const isValidPassword = await PasswordHasher.compare(plainTextPassword, user.hashedPassword);
    if (!isValidPassword) {
      throw new Error('Application Exception: Invalid credentials.');
    }

    // 3. Construct Immutable JWT Payload ensuring isolation
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles.map(r => r.name)
    };

    // 4. Cryptographically sign and return the Token
    return JwtService.sign(payload);
  }
}
