import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { Role } from '../value-objects/Role';
import { Permission } from '../value-objects/Permission';

interface UserProps {
  tenantId: string; // Immutable after creation
  email: string;
  hashedPassword: string;
  roles: Role[];
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public get email(): string {
    return this.props.email;
  }

  public get hashedPassword(): string {
    return this.props.hashedPassword;
  }

  public get roles(): Role[] {
    return [...this.props.roles]; // Defensive copy
  }

  public addRole(role: Role): void {
    const hasRole = this.props.roles.some(r => r.name === role.name);
    if (!hasRole) {
      this.props.roles.push(role);
      // In a robust implementation, we would register a 'UserRoleAddedEvent' here.
    }
  }

  public changePassword(newHash: string): void {
    if (!newHash || newHash.length < 8) {
      throw new Error('Domain Exception: Invalid password hash string.');
    }
    this.props.hashedPassword = newHash;
    // We would register a 'UserPasswordChangedEvent' here to invalidate active sessions if stateful.
  }

  public isAuthorized(requiredPermission: Permission): boolean {
    return this.props.roles.some(role => role.hasPermission(requiredPermission));
  }

  public static create(id: string, tenantId: string, email: string, hashedPassword: string, roles: Role[]): User {
    // 1. Core Invariants Validation
    if (!tenantId) throw new Error('Domain Exception: tenantId is strictly required and immutable.');
    if (!email || !email.includes('@')) throw new Error('Domain Exception: Invalid email format.');
    
    // 2. Factory Instantiation
    return new User({
      tenantId,
      email,
      hashedPassword,
      roles: roles.length ? roles : [Role.WAITER] // Safe fallback to least-privileged role
    }, id);
  }
}
