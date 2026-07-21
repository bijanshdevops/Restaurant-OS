import { User } from '../../domain/aggregates/User';
import { Role } from '../../domain/value-objects/Role';

export class UserMapper {
  /**
   * Reconstitutes a rich Domain Aggregate from raw database properties.
   */
  public static toDomain(raw: any): User {
    // 1. Rehydrate Value Objects
    const roles = (raw.roles || []).map((roleStr: string) => Role.fromString(roleStr));
    
    // 2. Bypass Domain Factory (User.create) to prevent executing creation invariants
    // on an entity that already historically exists. We use a casted private constructor.
    return new (User as any)({
      tenantId: raw.tenantId,
      email: raw.email,
      hashedPassword: raw.passwordHash,
      roles: roles
    }, raw.id);
  }

  /**
   * Flattens the Domain Aggregate into database-friendly primitives.
   */
  public static toPersistence(user: User): any {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      passwordHash: user.hashedPassword, // Notice the mapping: hashedPassword -> passwordHash
      roles: user.roles.map(r => r.name)
    };
  }
}
