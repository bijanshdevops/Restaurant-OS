import { GetTenantStatsUseCase } from '../../application/use-cases/GetTenantStatsUseCase';

export class AnalyticsController {
  constructor(private readonly getTenantStatsUseCase: GetTenantStatsUseCase) {}

  /**
   * @swagger
   * /api/analytics/stats:
   *   get:
   *     summary: Fetch aggregate statistics for the tenant
   *     description: Retrieves total orders and total revenue. The route is isolated per tenant.
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Tenant statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     tenantId:
   *                       type: string
   *                     totalOrders:
   *                       type: integer
   *                     totalRevenue:
   *                       type: number
   *                     currency:
   *                       type: string
   *       401:
   *         description: Unauthorized - Missing tenant context
   */
  public async getStats(req: any, res: any): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      // Security Check: If you wanted role-based access control, you would check req.user.roles here
      // For now, the edge middleware guarantees this is a valid tenant request.

      const stats = await this.getTenantStatsUseCase.execute(tenantId);

      res.status(200).json({
        message: 'Tenant statistics retrieved successfully',
        data: stats
      });

    } catch (error: any) {
      console.error('[AnalyticsController.getStats] Error:', error.message);
      res.status(500).json({ error: 'An unexpected internal server error occurred.' });
    }
  }
}
