"use server";

import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customerAuth';
import { requestZarinPalPayment } from '@/lib/zarinpal';

/**
 * Starts a ZarinPal payment for an order the calling customer owns, and
 * returns the gateway URL to redirect the browser to.
 */
export async function initiatePayment(orderId: string) {
  const auth = await requireCustomer();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: auth.customer.id, status: 'AWAITING_PAYMENT' },
      include: { payment: true },
    });
    if (!order || !order.payment) {
      return { success: false, error: 'سفارش یافت نشد یا قبلاً پردازش شده است' };
    }
    if (order.payment.status !== 'PENDING') {
      return { success: false, error: 'این سفارش قبلاً پرداخت شده است' };
    }

    const result = await requestZarinPalPayment(
      order.totalAmount,
      `پرداخت سفارش ${order.orderNumber}`,
      order.id
    );

    if (!result.ok || !result.redirectUrl) {
      return { success: false, error: result.error || 'خطا در اتصال به درگاه پرداخت' };
    }

    await prisma.payment.update({
      where: { orderId: order.id },
      data: { authority: result.authority },
    });

    return { success: true, redirectUrl: result.redirectUrl };
  } catch (error) {
    console.error('Error initiating payment:', error);
    return { success: false, error: 'خطا در شروع فرآیند پرداخت' };
  }
}
