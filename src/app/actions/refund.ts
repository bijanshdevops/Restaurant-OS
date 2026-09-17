"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { reverseLoyaltyForRefund } from '@/lib/loyalty';
import { getDefaultBranchId } from './branch';
import { SYSTEM_CATEGORY_IDS } from '@/lib/accountingCategories';

/**
 * Phase 10: مرجوعی و استرداد سفارش.
 *
 * دسترسی این ماژول عمداً فقط ADMIN است (طبق انتخاب کاربر) — پس نیازی به
 * منطق branch-scoping (مثل order.ts/accounting.ts) در این فایل نیست، چون
 * ADMIN همیشه از فیلتر شعبه معاف است.
 *
 * فقط سفارش‌های COMPLETED مرجوع‌پذیرند (سفارش‌هایی که هنوز در صف
 * آشپزخانه/تحویل‌اند باید اول لغو یا تکمیل شوند — خارج از محدوده‌ی این فاز).
 * وضعیت مرجوعی از طریق جدول‌های Refund/RefundItem و فیلد
 * OrderItem.refundedQuantity دنبال می‌شود، نه یک OrderStatus جدید؛
 * Order.status پس از مرجوعی همچنان COMPLETED می‌ماند.
 */

/**
 * جست‌وجوی یک سفارش تکمیل‌شده با شماره‌ی سفارش، برای شروع فرآیند مرجوعی —
 * همراه با مانده‌ی قابل‌مرجوع هر ردیف (quantity - refundedQuantity) و
 * تاریخچه‌ی مرجوعی‌های قبلیِ همان سفارش.
 */
export async function findOrderForRefund(orderNumber: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = orderNumber?.trim();
  if (!trimmed) return { success: false, error: 'شماره‌ی سفارش را وارد کنید' };

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: trimmed },
      include: {
        items: { include: { menuItem: { select: { id: true, title: true } } } },
        customer: { select: { id: true, fullName: true, phone: true } },
        branch: { select: { id: true, name: true } },
        refunds: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) return { success: false, error: 'سفارشی با این شماره یافت نشد' };
    if (order.status !== 'COMPLETED') {
      return { success: false, error: 'فقط سفارش‌های تکمیل‌شده قابل مرجوع‌شدن هستند' };
    }

    const hasRefundableItems = order.items.some((i) => i.quantity - i.refundedQuantity > 0);
    if (!hasRefundableItems) {
      return { success: false, error: 'این سفارش قبلاً به‌طور کامل مرجوع شده است' };
    }

    return { success: true, order };
  } catch (error) {
    console.error('Error finding order for refund:', error);
    return { success: false, error: 'خطا در جست‌وجوی سفارش' };
  }
}

interface RefundLineInput {
  orderItemId: string;
  quantity: number;
}

interface CreateRefundInput {
  orderId: string;
  isFullRefund: boolean;
  /** برای مرجوعی جزئی الزامی است؛ در مرجوعی کامل نادیده گرفته می‌شود. */
  items?: RefundLineInput[];
  reason: string;
}

/**
 * ثبت یک رویداد مرجوعی (جزئی یا کامل) روی یک سفارش تکمیل‌شده.
 *
 * منطق تناسبی: چون هر ردیف سفارش حداکثر به‌اندازه‌ی مانده‌اش قابل مرجوع
 * است (کنترل‌شده با refundedQuantity)، نسبت "مبلغ اقلام این مرجوعی به
 * مجموع مبلغ اقلام کل سفارش" برای تسهیم مالیات و امتیاز/آمار مشتری به‌کار
 * می‌رود؛ مجموع این نسبت‌ها در طول عمر سفارش هرگز از ۱ بیشتر نمی‌شود، پس
 * نیازی به دانستن تاریخچه‌ی مرجوعی‌های قبلی نیست.
 *
 * تصمیم‌های محدوده‌ی مشخص (اعلام‌شده به کاربر):
 * - بسته‌بندی فقط در مرجوعی «کامل» و با نرخ فعلیِ تنظیمات بازگردانده
 *   می‌شود (چون Order مبلغ بسته‌بندیِ لحظه‌ی ثبت را جداگانه ذخیره نمی‌کند).
 * - هزینه‌ی ارسال (deliveryFee) در هیچ حالتی مرجوع نمی‌شود.
 * - کالای مرجوع‌شده همیشه سالم فرض و به انبار برگردانده می‌شود (بدون
 *   تفکیک سالم/معیوب).
 */
export async function createRefund(input: CreateRefundInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const reason = input.reason?.trim();
  if (!reason) return { success: false, error: 'دلیل مرجوعی را وارد کنید' };
  if (!input.isFullRefund && (!input.items || input.items.length === 0)) {
    return { success: false, error: 'برای مرجوعی جزئی حداقل یک قلم مشخص کنید' };
  }

  try {
    const refund = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { items: { include: { menuItem: { include: { recipeItems: true } } } } },
      });
      if (!order) throw new Error('سفارش یافت نشد');
      if (order.status !== 'COMPLETED') {
        throw new Error('فقط سفارش‌های تکمیل‌شده قابل مرجوع‌شدن هستند');
      }

      const orderItemsSubtotalTotal = order.items.reduce(
        (sum, i) => sum + i.priceAtTime * i.quantity,
        0
      );

      // مشخص کردن ردیف‌ها/تعدادهایی که در همین رویداد مرجوع می‌شوند.
      type Line = { orderItem: (typeof order.items)[number]; qty: number };
      let refundLines: Line[] = [];

      if (input.isFullRefund) {
        refundLines = order.items
          .filter((i) => i.quantity - i.refundedQuantity > 0)
          .map((i) => ({ orderItem: i, qty: i.quantity - i.refundedQuantity }));
      } else {
        for (const reqLine of input.items!) {
          const orderItem = order.items.find((i) => i.id === reqLine.orderItemId);
          if (!orderItem) throw new Error('قلم سفارش نامعتبر است');
          if (!Number.isFinite(reqLine.quantity) || reqLine.quantity <= 0) {
            throw new Error('تعداد مرجوعی نامعتبر است');
          }
          const remaining = orderItem.quantity - orderItem.refundedQuantity;
          if (reqLine.quantity > remaining) {
            throw new Error(`تعداد درخواستی برای «${orderItem.menuItem.title}» بیش از مانده‌ی قابل‌مرجوع است`);
          }
          refundLines.push({ orderItem, qty: reqLine.quantity });
        }
      }

      if (refundLines.length === 0) {
        throw new Error('این سفارش قبلاً به‌طور کامل مرجوع شده است');
      }

      const refundItemsSubtotal = refundLines.reduce(
        (sum, l) => sum + l.orderItem.priceAtTime * l.qty,
        0
      );
      const proportion = orderItemsSubtotalTotal > 0 ? refundItemsSubtotal / orderItemsSubtotalTotal : 0;
      const refundTax = Math.round(order.taxAmount * proportion);

      // بسته‌بندی فقط در مرجوعی کامل، با نرخ فعلی تنظیمات (رجوع به توضیح
      // بالای تابع برای دلیل این محدودیت).
      let packagingRefund = 0;
      if (input.isFullRefund) {
        const settings = await tx.restaurantSettings.findUnique({ where: { id: 'default' } });
        packagingRefund = settings?.packagingCost ?? 0;
      }

      const refundSubtotalAmount = refundItemsSubtotal + packagingRefund;
      const refundTotalAmount = refundSubtotalAmount + refundTax;

      // 1. ساخت رکورد Refund + RefundItem‌ها
      const createdRefund = await tx.refund.create({
        data: {
          orderId: order.id,
          reason,
          isFullRefund: input.isFullRefund,
          subtotalAmount: refundSubtotalAmount,
          taxAmount: refundTax,
          totalAmount: refundTotalAmount,
          createdByUserId: auth.user.id,
          items: {
            create: refundLines.map((l) => ({
              orderItemId: l.orderItem.id,
              quantity: l.qty,
              amount: l.orderItem.priceAtTime * l.qty,
            })),
          },
        },
      });

      // 2. افزایش refundedQuantity هر ردیف
      for (const line of refundLines) {
        await tx.orderItem.update({
          where: { id: line.orderItem.id },
          data: { refundedQuantity: { increment: line.qty } },
        });
      }

      // 3. برگشت موجودی انبار طبق فرمول غذا (BOM) هر قلم مرجوع‌شده — به
      // شعبه‌ی خود سفارش، یا شعبه‌ی پیش‌فرض برای سفارش آنلاینِ بدون‌شعبه
      // (نک. finalizeOnlineOrderAfterPayment برای همین قاعده در کسر اولیه).
      const branchIdForStock = order.branchId ?? (await getDefaultBranchId());
      const stockRestocks = new Map<string, number>();
      for (const line of refundLines) {
        for (const recipeLine of line.orderItem.menuItem.recipeItems) {
          const amount = recipeLine.quantity * line.qty;
          stockRestocks.set(
            recipeLine.inventoryItemId,
            (stockRestocks.get(recipeLine.inventoryItemId) || 0) + amount
          );
        }
      }
      for (const [inventoryItemId, amount] of stockRestocks) {
        await tx.branchInventoryStock.update({
          where: { branchId_inventoryItemId: { branchId: branchIdForStock, inventoryItemId } },
          data: { currentStock: { increment: amount } },
        });
      }

      // 4. ثبت خودکار تراکنش EXPENSE مقابل — تراکنش INCOME اصلیِ سفارش هرگز
      // حذف/ویرایش نمی‌شود (قاعده‌ی فاز ۷)؛ این تراکنش جدید همان اثر خالص
      // را در گزارش‌های حسابداری (سود خالص، مالیات خالص) ایجاد می‌کند.
      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          description: `مرجوعی سفارش ${order.orderNumber}`,
          amount: refundTotalAmount,
          taxAmount: refundTax,
          branchId: order.branchId,
          categoryId: SYSTEM_CATEGORY_IDS.EXPENSE_REFUND,
          referenceType: 'REFUND',
          referenceId: createdRefund.id,
          createdByUserId: auth.user.id,
        },
      });

      // 5. برگشت تناسبیِ امتیاز/آمار مشتری (در صورت داشتن مشتری)
      if (order.customerId) {
        const pointsToClaw = Math.round(order.pointsEarned * proportion);
        const pointsToReturn = Math.round(order.pointsRedeemed * proportion);
        await reverseLoyaltyForRefund(tx, {
          customerId: order.customerId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          pointsToClaw,
          pointsToReturn,
          refundedAmount: refundTotalAmount,
          decrementOrderCount: input.isFullRefund,
        });
      }

      return createdRefund;
    });

    return { success: true, refund };
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return { success: false, error: error?.message || 'خطا در ثبت مرجوعی' };
  }
}

/** فهرست مرجوعی‌های اخیر (برای تاریخچه/گزارش) — دسترسی فقط ADMIN. */
export async function getRefunds(limit: number = 50) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const refunds = await prisma.refund.findMany({
      include: {
        order: { select: { orderNumber: true, branch: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { orderItem: { include: { menuItem: { select: { title: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return { success: true, refunds };
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return { success: false, error: 'خطا در دریافت فهرست مرجوعی‌ها' };
  }
}
