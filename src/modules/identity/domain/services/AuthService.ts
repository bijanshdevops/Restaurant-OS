import { User } from '../aggregates/User';
import { Permission } from '../value-objects/Permission';

export class AuthService {
  /**
   * Domain Service function to evaluate if a User has the required permission 
   * AND strictly operates within the requested tenant context.
   * 
   * This pure function bridges the gap between the stateless JWT Middleware payload 
   * and strict Core Business Logic enforcement.
   */
  public static verifyAccess(user: User, requiredPermission: Permission, targetTenantId: string): boolean {
    // 1. Strict Tenant Isolation Guard (Zero-Trust)
    if (user.tenantId !== targetTenantId) {
      console.warn(`[AuthService - SECURITY] User ${user.id} from tenant [${user.tenantId}] attempted an unauthorized access into tenant [${targetTenantId}]`);
      return false;
    }

    // 2. Aggregate Permission Evaluation Guard
    return user.isAuthorized(requiredPermission);
  }
}
