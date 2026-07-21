import { NextRequest, NextResponse } from 'next/server';

// Mock inventory data for development (no DB required)
const MOCK_INVENTORY = [
  { id: '1', itemName: 'Gourmet Burger', menuItemId: 'item-1', currentStock: 45, threshold: 10, status: 'IN_STOCK' },
  { id: '2', itemName: 'Truffle Fries', menuItemId: 'item-2', currentStock: 5, threshold: 20, status: 'LOW_STOCK' },
  { id: '3', itemName: 'Craft Cola', menuItemId: 'item-3', currentStock: 0, threshold: 50, status: 'OUT_OF_STOCK' },
  { id: '4', itemName: 'Caesar Salad', menuItemId: 'item-4', currentStock: 30, threshold: 15, status: 'IN_STOCK' },
  { id: '5', itemName: 'Chocolate Lava Cake', menuItemId: 'item-5', currentStock: 8, threshold: 10, status: 'LOW_STOCK' },
];

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') ?? 'demo-tenant';

  try {
    // In production: query from DB using prismaClient
    // const stock = await prismaClient.stockLevel.findMany({ where: { tenantId } });
    return NextResponse.json({ data: MOCK_INVENTORY });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
