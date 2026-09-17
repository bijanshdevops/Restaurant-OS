"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { requireCustomer } from '@/lib/customerAuth';

/**
 * مشتریِ واردشده برای یکی از سفارش‌های خودش بازخورد/امتیاز ثبت می‌کند.
 * فقط برای سفارش‌های COMPLETED و فقط یک‌بار به ازای هر سفارش مجاز است.
 * (سفارش می‌تواند از هر کانالی باشد — صندوق یا آنلاین — تا وقتی متعلق به
 * همین مشتری باشد؛ getMyOnlineOrder/getCustomerProfile هم به همین ترتیب
 * سفارش‌های هر دو کانال را برمی‌گردانند.)
 */
export async function submitOrderFeedback(orderId: string, rating: number, comment?: string) {
  const auth = await requireCustomer();
  if (!auth.ok) return { success: false, error: auth.error };

  const normalizedRating = Math.round(rating);
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return { success: false, error: 'امتیاز باید بین ۱ تا ۵ باشد' };
  }

  try {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: auth.customer.id } });
    if (!order) return { success: false, error: 'سفارش یافت نشد' };
    if (order.status !== 'COMPLETED') {
      return { success: false, error: 'فقط برای سفارش‌های تکمیل‌شده می‌توان بازخورد ثبت کرد' };
    }

    const existing = await prisma.orderFeedback.findUnique({ where: { orderId } });
    if (existing) return { success: false, error: 'برای این سفارش قبلاً بازخورد ثبت شده است' };

    const feedback = await prisma.orderFeedback.create({
      data: {
        orderId,
        customerId: auth.customer.id,
        rating: normalizedRating,
        comment: comment?.trim() || '',
      },
    });
    return { success: true, feedback };
  } catch (error) {
    console.error('Error submitting order feedback:', error);
    return { success: false, error: 'خطا در ثبت بازخورد' };
  }
}

/** فهرست همه‌ی بازخوردها برای پنل CRM؛ به‌همراه میانگین امتیاز کلی. فقط ADMIN. */
export async function getFeedbackList() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const feedbacks = await prisma.orderFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        order: { select: { orderNumber: true, totalAmount: true, channel: true } },
      },
    });
    const averageRating =
      feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;

    return { success: true, feedbacks, averageRating };
  } catch (error) {
    console.error('Error fetching feedback list:', error);
    return { success: false, error: 'خطا در دریافت بازخوردها' };
  }
}
