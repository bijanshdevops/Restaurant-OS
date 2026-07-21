import { NextResponse } from 'next/server';
import { makeMenuController } from '@/modules/menu/presentation/factories/MenuControllerFactory';

export async function POST(request: Request) {
  // 1. Extract VERIFIED tenantId from sanitized headers (Guaranteed by TenantMiddleware)
  const tenantId = request.headers.get('x-tenant-id') as string;

  // 2. Request-Scoped DI: Call the factory with the extracted tenant ID
  const controller = makeMenuController(tenantId);

  // 3. Extract JSON body safely
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    // If JSON parsing fails, we pass an empty object. The controller's validation will handle missing fields.
  }

  // 4. Create an adapter for the Request object expected by our agnostic controller
  const adaptedReq = {
    body,
    // The controller currently expects tenantId to be populated in req.user
    user: { tenantId }
  };

  // 5. Create an adapter for the Response object expected by the controller 
  // and map its output to a Next.js NextResponse
  return new Promise<NextResponse>((resolve) => {
    const adaptedRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this; // support chaining: res.status(201).json(...)
      },
      json(data: any) {
        resolve(NextResponse.json(data, { status: this.statusCode }));
      }
    };

    // 6. Delegate flow control to the Clean Architecture controller
    controller.createMenu(adaptedReq, adaptedRes).catch((error) => {
      // Failsafe catch for any unhandled Promise rejections bubble-up
      console.error('[Next API Route] Unhandled controller error:', error);
      resolve(
        NextResponse.json(
          { error: 'An unexpected internal server error occurred.' },
          { status: 500 }
        )
      );
    });
  });
}
