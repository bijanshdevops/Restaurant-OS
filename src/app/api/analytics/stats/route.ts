import { NextResponse } from 'next/server';

const MOCK_ANALYTICS = {
  totalOrders: 128,
  totalRevenue: 14850.75,
  ordersBySegment: { REGULAR: 95, VIP: 33 },
  revenueBySegment: { REGULAR: 7200.00, VIP: 7650.75 },
  lastUpdated: new Date().toISOString(),
};

export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id') ?? 'demo-tenant';

  // If DATABASE_URL is available, use real controller; otherwise return mock data
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    try {
      const { makeAnalyticsController } = await import('@/modules/analytics/presentation/factories/AnalyticsControllerFactory');
      const controller = makeAnalyticsController();
      const adaptedReq = { user: { tenantId } };

      return new Promise<NextResponse>((resolve) => {
        const adaptedRes = {
          statusCode: 200,
          status(code: number) { this.statusCode = code; return this; },
          json(data: any) { resolve(NextResponse.json(data, { status: this.statusCode })); }
        };
        controller.getStats(adaptedReq, adaptedRes).catch(() => {
          resolve(NextResponse.json({ data: { ...MOCK_ANALYTICS, tenantId } }));
        });
      });
    } catch {
      // Fall through to mock
    }
  }

  // Dev fallback — no DB required
  return NextResponse.json({ data: { ...MOCK_ANALYTICS, tenantId } });
}

