import { UpdateTicketStatusUseCase } from '../../application/use-cases/UpdateTicketStatusUseCase';
import { PreparationStatus } from '../../domain/value-objects/PreparationStatus';

export class KitchenController {
  constructor(private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase) {}

  /**
   * Handles PATCH /api/kitchen/tickets/:id
   */
  public async updateStatus(req: any, res: any): Promise<void> {
    try {
      // 1. Extract params and payload
      const { id } = req.params || {}; 
      const { status } = req.body || {};
      
      // 2. Extract tenant context
      const tenantId = req.user?.tenantId;

      // 3. Basic Syntactic Validation
      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      if (!id || !status) {
        res.status(400).json({ error: 'Bad Request: "id" and "status" are required.' });
        return;
      }

      // 4. Execute Use Case
      await this.updateTicketStatusUseCase.execute(id, status as PreparationStatus);

      // 5. Return 200 OK
      res.status(200).json({ message: 'Ticket status updated successfully.' });

    } catch (error: any) {
      console.error('[KitchenController.updateStatus] Error:', error.message);

      if (error.message && error.message.includes('Domain Exception')) {
        // Map Domain Rule Violations to 422 Unprocessable Entity
        res.status(422).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'An unexpected internal server error occurred.' });
    }
  }
}
