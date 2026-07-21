import { CreateMenuUseCase } from '../../application/use-cases/CreateMenuUseCase';
import { CreateMenuCommand } from '../../application/commands/CreateMenuCommand';

export class MenuController {
  constructor(private readonly createMenuUseCase: CreateMenuUseCase) {}

  /**
   * Handles POST /api/menus
   */
  public async createMenu(req: any, res: any): Promise<void> {
    try {
      // 1. Extract payload from the request
      const { title, description } = req.body || {};

      // 2. Extract tenant context 
      // (Assumes authentication middleware attached this to the request object)
      const tenantId = req.user?.tenantId;

      // 3. Basic Syntactic Validation (No business logic here)
      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      if (!title || typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ error: 'Bad Request: "title" is required and must be a valid string.' });
        return;
      }

      // 4. Construct the Command for the Application Layer
      const command: CreateMenuCommand = {
        title: title.trim(),
        description: description?.trim(),
        tenantId: tenantId
      };

      // 5. Execute the Use Case
      const menuId = await this.createMenuUseCase.execute(command);

      // Return 201 Created
      res.status(201).json({
        message: 'Menu created successfully',
        data: { id: menuId }
      });

    } catch (error: any) {
      // 6. Error Handling
      // Log the error securely (avoids logging PII or sensitive data directly to client)
      console.error('[MenuController.createMenu] Error:', error.message);

      // Check if it's a known domain exception (e.g., business rule violation)
      // In a real app, this would be an `instanceof DomainException` check
      if (error.message && error.message.includes('Domain Exception')) {
        res.status(422).json({ error: error.message });
        return;
      }

      // Fallback: 500 Internal Server Error (Do not leak the stack trace to the client)
      res.status(500).json({ error: 'An unexpected internal server error occurred.' });
    }
  }
}
