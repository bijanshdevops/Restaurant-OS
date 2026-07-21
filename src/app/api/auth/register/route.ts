import { NextResponse } from 'next/server';
import { makeIdentityController } from '@/modules/identity/presentation/factories/IdentityControllerFactory';

export async function POST(request: Request) {
  const controller = makeIdentityController();

  let body: any = {};
  try {
    body = await request.json();
  } catch (error) {}

  const adaptedReq = { body };

  return new Promise<NextResponse>((resolve) => {
    const adaptedRes = {
      statusCode: 200,
      headers: new Headers(),
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader(key: string, value: string) {
        this.headers.set(key, value);
      },
      json(data: any) {
        const response = NextResponse.json(data, { status: this.statusCode });
        // Apply attached headers (e.g., Set-Cookie)
        this.headers.forEach((value: string, key: string) => {
          response.headers.set(key, value);
        });
        resolve(response);
      }
    };

    controller.register(adaptedReq, adaptedRes).catch((error) => {
      console.error('[Next API Route] Unhandled Register error:', error);
      resolve(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
    });
  });
}
