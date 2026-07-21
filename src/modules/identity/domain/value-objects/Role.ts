import { Permission } from './Permission';

export class Role {
  private constructor(
    public readonly name: string,
    public readonly permissions: Set<Permission>
  ) {}

  public static readonly OWNER = new Role('OWNER', new Set([
    Permission.READ_ORDERS, Permission.WRITE_ORDERS,
    Permission.MANAGE_MENU, Permission.MANAGE_STAFF,
    Permission.READ_KITCHEN_TICKETS, Permission.WRITE_KITCHEN_TICKETS,
    Permission.MANAGE_IDENTITY
  ]));

  public static readonly MANAGER = new Role('MANAGER', new Set([
    Permission.READ_ORDERS, Permission.WRITE_ORDERS,
    Permission.MANAGE_MENU, Permission.MANAGE_STAFF,
    Permission.READ_KITCHEN_TICKETS, Permission.WRITE_KITCHEN_TICKETS
  ]));

  public static readonly CHEF = new Role('CHEF', new Set([
    Permission.READ_KITCHEN_TICKETS, Permission.WRITE_KITCHEN_TICKETS
  ]));

  public static readonly WAITER = new Role('WAITER', new Set([
    Permission.READ_ORDERS, Permission.WRITE_ORDERS
  ]));

  public hasPermission(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  public static fromString(roleName: string): Role {
    switch(roleName.toUpperCase()) {
      case 'OWNER': return Role.OWNER;
      case 'MANAGER': return Role.MANAGER;
      case 'CHEF': return Role.CHEF;
      case 'WAITER': return Role.WAITER;
      default: throw new Error(`Domain Exception: Unknown role string: ${roleName}`);
    }
  }
}
