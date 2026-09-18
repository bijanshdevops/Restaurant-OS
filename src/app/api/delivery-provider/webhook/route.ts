import { NextRequest, NextResponse } from 'next/server';
import { receiveDeliveryProviderStatusUpdate } from '@/app/actions/deliveryProvider';

/**
 * The real-world entrypoint a third-party courier provider would POST
 * delivery-status updates to — mirrors src/app/api/payment/zarinpal/
 * callback/route.ts: an incoming call from an external service, not a
 * client-invoked Server Action.
 *
 * No real provider exists yet, so nothing external calls this today; it
 * exists so that swapping the simulated MOCK_EXPRESS adapter
 * (src/lib/deliveryProviders.ts) for a real one later needs no new
 * endpoint, only a new adapter implementation. Expected JSON body:
 * { "externalDeliveryId": string, "status": string } — status is one of
 * the keys of EXTERNAL_STATUS_MAP in src/app/actions/deliveryProvider.ts.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.DELIVERY_PROVIDER_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get('x-webhook-secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body?.externalDeliveryId || !body?.status) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const result = await receiveDeliveryProviderStatusUpdate(body.externalDeliveryId, body.status);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
