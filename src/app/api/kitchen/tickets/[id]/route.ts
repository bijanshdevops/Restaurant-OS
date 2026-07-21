import { NextResponse } from 'next/server';
import { makeKitchenController } from '@/modules/kitchen/presentation/factories/KitchenControllerFactory';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // 1. Extract VERIFIED tenantId from sanitized headers (Guaranteed by TenantMiddleware)
  const tenantId = request.headers.get('x-tenant-id') as string;

  // 2. Resolve dependency graph via Factory
  const controller = makeKitchenController(tenantId);

  // 3. Extract JSON body securely
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    // Ignored, controller's basic validation will handle missing properties
  }

  // 4. Adapter: Map Next.js Request to framework-agnostic payload
  const adaptedReq = {
    params: { id: params.id },
    body,
    user: { tenantId }
  };

  // 5. Adapter: Capture framework-agnostic Response and resolve to NextResponse
  return new Promise<NextResponse>((resolve) => {
    const adaptedRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve(NextResponse.json(data, { status: this.statusCode }));
      }
    };

    // 6. Delegate flow control
    controller.updateStatus(adaptedReq, adaptedRes).catch((error) => {
      console.error('[Next API Route] Unhandled KitchenController error:', error);
      resolve(
        NextResponse.json(
          { error: 'An unexpected internal server error occurred.' },
          { status: 500 }
        )
      );
    });
  });
}
