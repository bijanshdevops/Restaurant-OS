import { PlaceOrderUseCase } from '../../application/use-cases/PlaceOrderUseCase';
import { PlaceOrderCommand } from '../../application/commands/PlaceOrderCommand';

export class OrderController {
  constructor(private readonly placeOrderUseCase: PlaceOrderUseCase) {}

  /**
   * Handles POST /api/orders
   */
  public async placeOrder(req: any, res: any): Promise<void> {
    try {
      // 1. Extract payload
      const { items, customerId } = req.body || {};
      
      // 2. Extract tenant context
      const tenantId = req.user?.tenantId;

      // 3. Basic Syntactic Validation
      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Bad Request: "items" must be a non-empty array.' });
        return;
      }

      // 4. Construct Command
      const command: PlaceOrderCommand = {
        tenantId,
        customerId,
        items
      };

      // 5. Execute Use Case
      const orderId = await this.placeOrderUseCase.execute(command);

      // 6. Return 201 Created
      res.status(201).json({
        message: 'Order created successfully',
        data: { id: orderId }
      });

    } catch (error: any) {
      console.error('[OrderController.placeOrder] Error:', error.message);

      if (error.message && error.message.includes('Domain Exception')) {
        res.status(422).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'An unexpected internal server error occurred.' });
    }
  }
}
