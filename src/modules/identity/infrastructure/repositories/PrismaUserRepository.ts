import { IUserRepository } from '../../application/ports/IUserRepository';
import { User } from '../../domain/aggregates/User';
import { UserMapper } from '../mappers/UserMapper';

type PrismaClient = any;

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(user: User): Promise<void> {
    const rawData = UserMapper.toPersistence(user);
    
    await this.prisma.user.upsert({
      where: {
        id: rawData.id
      },
      update: {
        email: rawData.email,
        passwordHash: rawData.passwordHash,
        roles: rawData.roles
      },
      create: {
        id: rawData.id,
        tenantId: rawData.tenantId,
        email: rawData.email,
        passwordHash: rawData.passwordHash,
        roles: rawData.roles
      }
    });
  }

  /**
   * Retrieves a User securely bounded by the requested tenantId.
   */
  public async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: {
        // Utilizing the composite unique index defined in schema.prisma: @@unique([tenantId, email])
        tenantId_email: {
          tenantId: tenantId,
          email: email
        }
      }
    });

    if (!rawUser) {
      return null;
    }

    return UserMapper.toDomain(rawUser);
  }
}
