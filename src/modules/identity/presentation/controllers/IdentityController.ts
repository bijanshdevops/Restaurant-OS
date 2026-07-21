import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';

export class IdentityController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase
  ) {}

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Identity]
   *     security:
   *       - tenantHeader: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, role, tenantId]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, CHEF, WAITER]
   *               tenantId:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered successfully
   *       422:
   *         description: Validation Error
   */
  public async register(req: any, res: any): Promise<void> {
    try {
      // In a public registration flow, tenantId is provided explicitly by the payload
      const { email, password, role, tenantId } = req.body || {};

      if (!tenantId || !email || !password || !role) {
        res.status(400).json({ error: 'Bad Request: Missing required registration fields.' });
        return;
      }

      await this.registerUserUseCase.execute(tenantId, email, password, role);

      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error: any) {
      console.error('[IdentityController.register] Error:', error.message);
      if (error.message && error.message.includes('Application Exception')) {
        res.status(422).json({ error: error.message });
      } else if (error.message && error.message.includes('Domain Exception')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Authenticate a user and issue a JWT
   *     tags: [Identity]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, tenantId]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               tenantId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns JWT token and sets HttpOnly cookie
   *       401:
   *         description: Invalid credentials
   */
  public async login(req: any, res: any): Promise<void> {
    try {
      // Public route: tenantId must be provided by the client logging in
      const { email, password, tenantId } = req.body || {};

      if (!tenantId || !email || !password) {
        res.status(400).json({ error: 'Bad Request: Missing tenantId, email, or password.' });
        return;
      }

      const token = await this.loginUseCase.execute(tenantId, email, password);

      // Return the token securely via HttpOnly cookie to mitigate XSS per ADR-0018
      res.setHeader(
        'Set-Cookie', 
        `auth_token=${token}; HttpOnly; Path=/; Max-Age=900; SameSite=Strict; Secure`
      );
      
      res.status(200).json({ message: 'Login successful.', token: token }); // Also returning token in body for easier testing in Postman
    } catch (error: any) {
      console.error('[IdentityController.login] Error:', error.message);
      if (error.message && error.message.includes('Application Exception')) {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  }
}
