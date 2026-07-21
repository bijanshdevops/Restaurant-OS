import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Mock recent orders data for development (no DB required)
const MOCK_ORDERS = [
  {
    id: 'order-001',
    status: 'PAID',
    totalAmount: 45.50,
    currency: 'USD',
    customerId: 'cust_A',
    correlationId: 'corr_123',
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-002',
    status: 'PENDING',
    totalAmount: 12.00,
    currency: 'USD',
    customerId: 'cust_B',
    correlationId: 'corr_124',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-003',
    status: 'PREPARING',
    totalAmount: 120.00,
    currency: 'USD',
    customerId: 'cust_C',
    correlationId: 'corr_125',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-004',
    status: 'COMPLETED',
    totalAmount: 88.00,
    currency: 'USD',
    customerId: 'cust_D',
    correlationId: 'corr_126',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') ?? 'demo-tenant';

  try {
    // In production: query from DB using prismaClient
    // const orders = await prismaClient.order.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10 });
    return NextResponse.json({ data: MOCK_ORDERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
