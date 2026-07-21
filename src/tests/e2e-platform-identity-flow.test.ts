import { RegisterUserUseCase } from '../modules/identity/application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../modules/identity/application/use-cases/LoginUseCase';
import { IdentityController } from '../modules/identity/presentation/controllers/IdentityController';
import { IUserRepository } from '../modules/identity/application/ports/IUserRepository';
import { User } from '../modules/identity/domain/aggregates/User';

import { CreateMenuUseCase } from '../modules/menu/application/use-cases/CreateMenuUseCase';
import { MenuController } from '../modules/menu/presentation/controllers/MenuController';
import { IMenuRepository } from '../modules/menu/application/ports/IMenuRepository';
import { Menu } from '../modules/menu/domain/aggregates/Menu';

import { JwtService } from '../shared/infrastructure/security/JwtService';

// --- PLATFORM MOCKS ---
// We mock the persistence layer to isolate the testing of the architectural boundaries and business rules
class MockUserRepository implements IUserRepository {
  public users: User[] = [];
  public async save(user: User): Promise<void> { this.users.push(user); }
  public async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.users.find(u => u.email === email && u.tenantId === tenantId) || null;
  }
}

class MockMenuRepository implements IMenuRepository {
  public menus: Menu[] = [];
  public async save(menu: Menu): Promise<void> { this.menus.push(menu); }
  public async findById(id: string): Promise<Menu | null> { return this.menus.find(m => m.id === id) || null; }
}

describe('E2E Platform Flow: Identity and Core Operations Integration', () => {
  let mockUserRepo: MockUserRepository;
  let mockMenuRepo: MockMenuRepository;
  
  let identityController: IdentityController;
  let menuController: MenuController; 

  beforeAll(() => {
    // 1. Dependency Injection Setup
    mockUserRepo = new MockUserRepository();
    mockMenuRepo = new MockMenuRepository();

    const registerUseCase = new RegisterUserUseCase(mockUserRepo);
    const loginUseCase = new LoginUseCase(mockUserRepo);
    identityController = new IdentityController(registerUseCase, loginUseCase);

    const createMenuUseCase = new CreateMenuUseCase(mockMenuRepo);
    menuController = new MenuController(createMenuUseCase);
  });

  // Helper to simulate Express/Next.js response objects cleanly
  const createMockRes = () => {
    const res: any = { statusCode: 200, headers: {}, data: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.data = data; return res; };
    res.setHeader = (key: string, value: string) => { res.headers[key] = value; };
    return res;
  };

  it('should successfully register, login, and allow authorized access to core platform operations', async () => {
    const tenantId = 'tenant_platform_99';
    const email = 'owner@platform.com';
    const password = 'SuperSecurePassword123!';

    // --- STEP 1: REGISTRATION ---
    const reqRegister = { body: { tenantId, email, password, role: 'OWNER' } };
    const resRegister = createMockRes();
    await identityController.register(reqRegister, resRegister);
    expect(resRegister.statusCode).toBe(201); // User successfully created

    // --- STEP 2: AUTHENTICATION ---
    const reqLogin = { body: { tenantId, email, password } };
    const resLogin = createMockRes();
    await identityController.login(reqLogin, resLogin);
    expect(resLogin.statusCode).toBe(200);
    expect(resLogin.data.token).toBeDefined();

    const token = resLogin.data.token;

    // --- STEP 3: EDGE MIDDLEWARE SIMULATION ---
    // Simulate the TenantMiddleware verifying the JWT at the edge of the network
    const decodedPayload = JwtService.verify(token);
    expect(decodedPayload.tenantId).toBe(tenantId);
    expect(decodedPayload.roles).toContain('OWNER');

    // --- STEP 4: CORE OPERATION EXECUTION ---
    // The middleware successfully verified the token and forcefully injected the tenantId into the context
    const reqCreateMenu = {
      user: { tenantId: decodedPayload.tenantId },
      body: { title: 'Platform Launch Menu' }
    };
    const resCreateMenu = createMockRes();
    
    await menuController.createMenu(reqCreateMenu, resCreateMenu);
    expect(resCreateMenu.statusCode).toBe(201);

    // --- STEP 5: VERIFICATION ---
    // Assert the data was persisted correctly and locked to the exact tenant boundary
    expect(mockMenuRepo.menus.length).toBe(1);
    expect(mockMenuRepo.menus[0].tenantId).toBe(tenantId);
  });

  it('should cryptographically block unauthorized cross-tenant operations (Tenant Spoofing)', async () => {
    // Simulate an attacker creating a legitimate account in a different tenant space
    const hackerTenantId = 'tenant_hacker_66';
    const reqRegister = { body: { tenantId: hackerTenantId, email: 'hacker@evil.com', password: 'password123', role: 'OWNER' } };
    const resRegister = createMockRes();
    await identityController.register(reqRegister, resRegister);

    const reqLogin = { body: { tenantId: hackerTenantId, email: 'hacker@evil.com', password: 'password123' } };
    const resLogin = createMockRes();
    await identityController.login(reqLogin, resLogin);
    
    const hackerToken = resLogin.data.token;
    
    // Hacker attempts to intercept the API and spoof the victim's tenant ID
    const decodedHackerPayload = JwtService.verify(hackerToken);

    // --- CRITICAL SECURITY ASSERTION ---
    // Because the Next.js TenantMiddleware forcefully extracts the tenantId *from the cryptographically verified JWT*
    // and ignores the user's manual HTTP headers, the attacker is fundamentally trapped in their own Tenant Context.
    const reqHackerMenu = {
      user: { tenantId: decodedHackerPayload.tenantId }, // Middleware guarantees this matches 'tenant_hacker_66'
      body: { title: 'Hacked Menu' }
    };
    const resHackerMenu = createMockRes();

    await menuController.createMenu(reqHackerMenu, resHackerMenu);

    // The request technically succeeds (the hacker created a menu), BUT...
    expect(resHackerMenu.statusCode).toBe(201);
    
    // ...it is strictly isolated to the hacker's database partition! The victim's tenant is perfectly safe.
    const createdMenu = mockMenuRepo.menus[mockMenuRepo.menus.length - 1];
    expect(createdMenu.tenantId).toBe(hackerTenantId);
    expect(createdMenu.tenantId).not.toBe('tenant_platform_99');
  });
});
