import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZarinPalPayment } from '@/lib/zarinpal';
import { finalizeOnlineOrderAfterPayment, markOnlineOrderPaymentFailed } from '@/app/actions/order';

/**
 * ZarinPal redirects the customer's browser here (GET) after they finish
 * (or abandon) the payment on the gateway's own page. This is intentionally
 * a plain route handler, not a Server Action — it's an incoming redirect
 * from an external service, not a client-invoked mutation.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('Status');
  const authority = searchParams.get('Authority');

  const base = process.env.APP_BASE_URL || new URL(request.url).origin;

  if (!orderId || !authority) {
    return NextResponse.redirect(`${base}/order/checkout?payment=error`);
  }

  // فاز ۱۶: در صورتِ شکست/لغوِ پرداخت، مشتری باید به همان صفحه‌ی
  // تسویه‌حسابی برگردد که از آن آمده — برای سفارشِ QR روی میز یعنی
  // /order/table/[tableId]/checkout، نه صفحه‌ی تسویه‌حسابِ آنلاینِ ارسالی.
  const orderForRedirect = await prisma.order.findUnique({
    where: { id: orderId },
    select: { channel: true, tableId: true },
  });
  const checkoutUrl =
    orderForRedirect?.channel === 'QR_DINE_IN' && orderForRedirect.tableId
      ? `${base}/order/table/${orderForRedirect.tableId}/checkout`
      : `${base}/order/checkout`;

  if (status !== 'OK') {
    await markOnlineOrderPaymentFailed(orderId);
    return NextResponse.redirect(`${checkoutUrl}?payment=cancelled`);
  }

  try {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) {
      return NextResponse.redirect(`${checkoutUrl}?payment=error`);
    }

    // Already finalized by an earlier callback for the same order — just
    // send the customer to their order's tracking page.
    if (payment.status === 'PAID') {
      return NextResponse.redirect(`${base}/order/orders/${orderId}`);
    }

    const verification = await verifyZarinPalPayment(authority, payment.amount);
    if (!verification.ok) {
      await prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED', errorMessage: verification.error },
      });
      await markOnlineOrderPaymentFailed(orderId);
      return NextResponse.redirect(`${checkoutUrl}?payment=failed`);
    }

    await prisma.payment.update({
      where: { orderId },
      data: { status: 'PAID', refId: verification.refId, paidAt: new Date() },
    });
    await finalizeOnlineOrderAfterPayment(orderId);

    return NextResponse.redirect(`${base}/order/orders/${orderId}`);
  } catch (error) {
    console.error('ZarinPal callback error:', error);
    return NextResponse.redirect(`${checkoutUrl}?payment=error`);
  }
}
