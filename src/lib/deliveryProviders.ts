/**
 * Pluggable third-party delivery-dispatch abstraction (Phase 17).
 *
 * No real courier-aggregator account exists yet — no API access or
 * documentation for any actual external courier service — so this ships
 * with a single simulated adapter, MOCK_EXPRESS, that always "succeeds"
 * synchronously and issues a fake tracking id/url. This mirrors exactly how
 * src/lib/zarinpal.ts defaults to ZarinPal's sandbox (always simulates a
 * successful payment) when no real merchant id is configured.
 *
 * Adding a real provider later means implementing DeliveryProviderAdapter
 * once and registering it in DELIVERY_PROVIDERS below — nothing else in the
 * app (the dispatch action, the webhook route, the delivery-board UI) needs
 * to change.
 */

import { randomUUID } from 'crypto';
import type { DeliveryProvider } from '@prisma/client';

export interface DispatchableOrder {
  id: string;
  orderNumber: string;
  deliveryAddress: string | null;
  totalAmount: number;
}

export interface DispatchResult {
  ok: boolean;
  externalDeliveryId?: string;
  trackingUrl?: string;
  error?: string;
}

export interface DeliveryProviderAdapter {
  id: DeliveryProvider;
  dispatch(order: DispatchableOrder): Promise<DispatchResult>;
}

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

/**
 * Simulated third-party courier network. Accepts the dispatch and returns a
 * realistic-looking tracking id/url synchronously — there is no real
 * network call here (nothing to fail against, aside from the deliberate
 * test seam below), which keeps automatic dispatch from ever blocking or
 * failing the payment-finalization flow it's called from.
 */
/**
 * Marker string that makes the simulated provider deterministically reject
 * a dispatch — purely a test seam (the same idea as a payment gateway's
 * "always declines" test card number), so automated tests can exercise the
 * "third-party dispatch failed, order stays on the internal/manual delivery
 * board" fallback path without needing to reconfigure server env vars
 * mid-test-run. No real delivery address would ever contain this string.
 */
export const TEST_FORCE_DISPATCH_FAILURE_MARKER = '[TEST_DISPATCH_FAIL]';

const mockExpressProvider: DeliveryProviderAdapter = {
  id: 'MOCK_EXPRESS',
  async dispatch(order) {
    if (order.deliveryAddress?.includes(TEST_FORCE_DISPATCH_FAILURE_MARKER)) {
      return { ok: false, error: 'شبیه‌سازیِ شکستِ ارسال (فقط برای تست)' };
    }
    const externalDeliveryId = `MEX-${randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      ok: true,
      externalDeliveryId,
      trackingUrl: `${getAppBaseUrl()}/mock-delivery-tracking/${externalDeliveryId}`,
    };
  },
};

export const DELIVERY_PROVIDERS: Partial<Record<DeliveryProvider, DeliveryProviderAdapter>> = {
  MOCK_EXPRESS: mockExpressProvider,
};

/**
 * Which provider automatic dispatch (after online-delivery payment) uses.
 * Configurable via env for future flexibility (e.g. a staging vs. a "real"
 * provider once one exists); defaults to the simulated one since it's the
 * only adapter currently implemented.
 */
export function getActiveProviderId(): DeliveryProvider {
  return (process.env.DELIVERY_PROVIDER as DeliveryProvider) || 'MOCK_EXPRESS';
}
