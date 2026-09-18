"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { DELIVERY_PROVIDERS, getActiveProviderId } from '@/lib/deliveryProviders';
import type { DeliveryStatus } from '@prisma/client';

/**
 * Automatically dispatches a freshly-paid ONLINE_DELIVERY order to the
 * configured third-party provider. Called from finalizeOnlineOrderAfterPayment
 * (src/app/actions/order.ts) right after the order leaves AWAITING_PAYMENT —
 * per the confirmed scope, dispatch is automatic and never staff-triggered.
 *
 * Not itself auth-gated (same reasoning as finalizeOnlineOrderAfterPayment:
 * it's only ever called server-side from that flow, never directly by a
 * client), but also exposed to tests via test-helpers for direct exercise.
 *
 * On provider failure (or an unconfigured/unknown provider id), this
 * deliberately does NOT throw — it just returns success:false and leaves the
 * order exactly as finalizeOnlineOrderAfterPayment left it
 * (deliveryStatus: 'PENDING_ASSIGNMENT', deliveryProvider: null), so the
 * order simply falls back to the pre-existing manual/internal delivery board
 * (src/app/actions/delivery.ts) — added *alongside* the internal courier
 * workflow, per the confirmed scope, not a replacement for it.
 */
export async function dispatchOrderToThirdPartyProvider(orderId: string) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.channel !== 'ONLINE_DELIVERY') {
      return { success: false, error: 'این سفارش قابل ارسال به شخص ثالث نیست' };
    }
    if (order.deliveryProvider) {
      return { success: true, order }; // already dispatched — idempotent, safe to call twice
    }

    const providerId = getActiveProviderId();
    const provider = DELIVERY_PROVIDERS[providerId];
    if (!provider) {
      console.error(`Unknown/unconfigured delivery provider: ${providerId}`);
      return { success: false, error: 'سرویس ارسال شخص ثالث پیکربندی نشده است' };
    }

    const result = await provider.dispatch({
      id: order.id,
      orderNumber: order.orderNumber,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
    });

    if (!result.ok || !result.externalDeliveryId) {
      console.error(`Third-party dispatch failed for order ${order.orderNumber}: ${result.error}`);
      return { success: false, error: result.error || 'ارسال به شخص ثالث ناموفق بود' };
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryProvider: provider.id,
        externalDeliveryId: result.externalDeliveryId,
        externalTrackingUrl: result.trackingUrl,
        // تخصیص همان لحظه‌ی پذیرشِ سفارش توسط شخص‌ثالث اتفاق می‌افتد —
        // برخلاف مسیر داخلی که ابتدا PENDING_ASSIGNMENT می‌ماند تا کارمند
        // دستی پیک تخصیص دهد.
        deliveryStatus: 'ASSIGNED',
      },
    });
    return { success: true, order: updated };
  } catch (error) {
    console.error('Error dispatching order to third-party provider:', error);
    return { success: false, error: 'خطا در ارسال به شخص ثالث' };
  }
}

const EXTERNAL_STATUS_MAP: Record<string, DeliveryStatus> = {
  ACCEPTED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  EN_ROUTE: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'FAILED',
};

/**
 * Receives an asynchronous delivery-status update from a third-party
 * provider — mirrors the ZarinPal payment-callback pattern
 * (src/app/api/payment/zarinpal/callback/route.ts): an external service
 * calling back into our app, not a client-invoked mutation.
 *
 * The real HTTP entrypoint a provider would POST to is
 * src/app/api/delivery-provider/webhook/route.ts, which verifies a shared
 * secret (when configured) before calling this. This function itself is
 * intentionally not auth-gated so it can also be exercised directly from
 * tests and from the staff-facing "simulate" actions below (no real
 * provider exists yet to send a real webhook).
 */
export async function receiveDeliveryProviderStatusUpdate(externalDeliveryId: string, externalStatus: string) {
  try {
    const order = await prisma.order.findUnique({ where: { externalDeliveryId } });
    if (!order) return { success: false, error: 'سفارش مرتبط با این شناسه یافت نشد' };

    const mapped = EXTERNAL_STATUS_MAP[externalStatus];
    if (!mapped) return { success: false, error: 'وضعیت نامعتبر است' };

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: mapped,
        status: mapped === 'DELIVERED' ? 'COMPLETED' : undefined,
      },
    });
    return { success: true, order: updated };
  } catch (error) {
    console.error('Error applying delivery provider status update:', error);
    return { success: false, error: 'خطا در ثبت وضعیت ارسال' };
  }
}

const NEXT_EXTERNAL_STATUS: Partial<Record<DeliveryStatus, string>> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'EN_ROUTE',
  ON_THE_WAY: 'DELIVERED',
};

/**
 * Staff-facing "simulate the provider's next webhook" action, shown on the
 * delivery board (/dashboard/delivery) only for orders that were auto-
 * dispatched to the third-party provider. Since MOCK_EXPRESS is simulated
 * (no real courier device exists to actually move the order along), this is
 * how staff progress a demo order through the pipeline — it calls exactly
 * the same receiveDeliveryProviderStatusUpdate the real webhook route would.
 */
export async function simulateNextProviderStatus(orderId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.externalDeliveryId || !order.deliveryStatus) {
      return { success: false, error: 'این سفارش به شخص ثالث ارسال نشده است' };
    }
    const nextExternal = NEXT_EXTERNAL_STATUS[order.deliveryStatus];
    if (!nextExternal) {
      return { success: false, error: 'این سفارش در وضعیت قابل پیشروی نیست' };
    }
    return receiveDeliveryProviderStatusUpdate(order.externalDeliveryId, nextExternal);
  } catch (error) {
    console.error('Error simulating provider status advance:', error);
    return { success: false, error: 'خطا در شبیه‌سازی وضعیت' };
  }
}

/** Staff-facing "simulate a failed delivery" counterpart to markDeliveryFailed (internal couriers). */
export async function simulateProviderDeliveryFailure(orderId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.externalDeliveryId) {
      return { success: false, error: 'این سفارش به شخص ثالث ارسال نشده است' };
    }
    return receiveDeliveryProviderStatusUpdate(order.externalDeliveryId, 'FAILED');
  } catch (error) {
    console.error('Error simulating provider delivery failure:', error);
    return { success: false, error: 'خطا در ثبت شکست ارسال' };
  }
}
