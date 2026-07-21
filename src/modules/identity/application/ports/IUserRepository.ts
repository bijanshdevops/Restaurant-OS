import { User } from '../../domain/aggregates/User';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findByEmail(email: string, tenantId: string): Promise<User | null>;
}
