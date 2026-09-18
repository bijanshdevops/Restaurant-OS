"use server";

import { prisma } from '@/lib/prisma';
import { Prisma, CouponDiscountType } from '@prisma/client';
import { requireRole } from '@/lib/auth';

/**
 * فاز ۱۴: کدِ تخفیف (Coupon).
 *
 * مدیریت (ساخت/ویرایش/فهرست/حذف) فقط برای ADMIN است. اعتبارسنجی + اعمالِ
 * واقعیِ کد روی یک سفارش از طریقِ applyCouponWithinTx انجام می‌شود که
 * order.ts آن را از داخلِ همان تراکنشِ ساختِ سفارش صدا می‌زند — دقیقاً
 * مشابهِ الگوی applyGiftCardWithinTx در giftCard.ts.
 */

export async function getCoupons() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, coupons };
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return { success: false, error: 'خطا در دریافت فهرست کدهای تخفیف' };
  }
}

interface CouponInput {
  code: string;
  discountType: CouponDiscountType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}

function validateCouponInput(input: CouponInput): string | null {
  if (!input.code?.trim()) return 'کد تخفیف را وارد کنید';
  if (input.discountType === 'PERCENT' && (input.value <= 0 || input.value > 100)) {
    return 'درصدِ تخفیف باید عددی بین ۱ تا ۱۰۰ باشد';
  }
  if (input.discountType === 'FIXED' && input.value <= 0) {
    return 'مبلغِ تخفیف باید عددی مثبت باشد';
  }
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses <= 0)) {
    return 'حداکثر تعداد استفاده باید عددی صحیح و مثبت باشد';
  }
  return null;
}

export async function createCoupon(input: CouponInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateCouponInput(input);
  if (validationError) return { success: false, error: validationError };

  const code = input.code.trim().toUpperCase();

  try {
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) return { success: false, error: 'این کد تخفیف قبلاً ثبت شده است' };

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType: input.discountType,
        value: input.value,
        minOrderAmount: input.minOrderAmount || 0,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdByUserId: auth.user.id,
      },
    });
    return { success: true, coupon };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return { success: false, error: 'خطا در ساخت کد تخفیف' };
  }
}

export async function updateCoupon(id: string, input: Partial<CouponInput> & { isActive?: boolean }) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'کد تخفیف یافت نشد' };

    const merged: CouponInput = {
      code: input.code ?? existing.code,
      discountType: input.discountType ?? existing.discountType,
      value: input.value ?? existing.value,
      minOrderAmount: input.minOrderAmount ?? existing.minOrderAmount,
      maxUses: input.maxUses !== undefined ? input.maxUses : existing.maxUses,
      expiresAt:
        input.expiresAt !== undefined
          ? input.expiresAt
          : existing.expiresAt?.toISOString() ?? null,
    };
    const validationError = validateCouponInput(merged);
    if (validationError) return { success: false, error: validationError };

    const code = merged.code.trim().toUpperCase();
    if (code !== existing.code) {
      const codeTaken = await prisma.coupon.findUnique({ where: { code } });
      if (codeTaken) return { success: false, error: 'این کد تخفیف قبلاً ثبت شده است' };
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code,
        discountType: merged.discountType,
        value: merged.value,
        minOrderAmount: merged.minOrderAmount,
        maxUses: merged.maxUses,
        expiresAt: merged.expiresAt ? new Date(merged.expiresAt) : null,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return { success: true, coupon };
  } catch (error) {
    console.error('Error updating coupon:', error);
    return { success: false, error: 'خطا در ویرایش کد تخفیف' };
  }
}

/** حذفِ کاملِ یک کدِ تخفیفِ هنوز استفاده‌نشده؛ کدهای استفاده‌شده فقط غیرفعال می‌شوند (برای حفظ سابقه‌ی سفارش‌های قبلی). */
export async function deleteCoupon(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'کد تخفیف یافت نشد' };

    if (existing.usesCount > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      return { success: true, deactivatedInstead: true };
    }

    await prisma.coupon.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return { success: false, error: 'خطا در حذف کد تخفیف' };
  }
}

/**
 * پیش‌نمایشِ اعتبارسنجی + مبلغِ تخفیفِ یک کدِ تخفیف — بدون افزایشِ
 * usesCount (فقط برای نمایشِ مبلغِ تخفیف در رابط‌کاربری، پیش از ثبتِ
 * نهاییِ سفارش). اعمالِ واقعی (با افزایشِ اتمیکِ usesCount) در
 * applyCouponWithinTx زیر انجام می‌شود.
 */
export async function checkCouponForOrder(code: string, subtotal: number) {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return { success: false, error: 'کد تخفیف را وارد کنید' };

  try {
    const coupon = await prisma.coupon.findUnique({ where: { code: trimmed } });
    if (!coupon) return { success: false, error: 'کدِ تخفیفی با این مشخصات یافت نشد' };
    if (!coupon.isActive) return { success: false, error: 'این کدِ تخفیف غیرفعال شده است' };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { success: false, error: 'این کدِ تخفیف منقضی شده است' };
    }
    if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
      return { success: false, error: 'این کدِ تخفیف به حداکثر تعدادِ مجازِ استفاده رسیده است' };
    }
    if (subtotal < coupon.minOrderAmount) {
      return { success: false, error: `این کدِ تخفیف فقط برای سفارش‌های حداقل ${coupon.minOrderAmount} تومان معتبر است` };
    }
    const rawDiscount =
      coupon.discountType === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value;
    const discountAmount = Math.min(Math.max(0, rawDiscount), subtotal);
    return { success: true, discountAmount };
  } catch (error) {
    console.error('Error checking coupon:', error);
    return { success: false, error: 'خطا در بررسی کد تخفیف' };
  }
}

/**
 * اعتبارسنجی + محاسبه‌ی مبلغِ تخفیف برای یک کدِ تخفیف، فراخوانی‌شده از
 * داخلِ همان تراکنشِ Prisma که سفارش را می‌سازد (order.ts). subtotal مبنای
 * محاسبه‌ی درصدِ تخفیف و حداقلِ مبلغِ سفارش است (نک. توضیحِ تصمیمِ محدوده
 * در schema.prisma). افزایشِ usesCount هم همین‌جا، اتمیک با خودِ اعمال،
 * انجام می‌شود.
 */
export async function applyCouponWithinTx(
  tx: Prisma.TransactionClient,
  code: string,
  subtotal: number
): Promise<{ couponId: string; couponCode: string; discountAmount: number }> {
  const trimmed = code.trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({ where: { code: trimmed } });
  if (!coupon) throw new Error('کدِ تخفیفی با این مشخصات یافت نشد');
  if (!coupon.isActive) throw new Error('این کدِ تخفیف غیرفعال شده است');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error('این کدِ تخفیف منقضی شده است');
  }
  if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
    throw new Error('این کدِ تخفیف به حداکثر تعدادِ مجازِ استفاده رسیده است');
  }
  if (subtotal < coupon.minOrderAmount) {
    throw new Error(`این کدِ تخفیف فقط برای سفارش‌های حداقل ${coupon.minOrderAmount} تومان معتبر است`);
  }

  const rawDiscount =
    coupon.discountType === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value;
  const discountAmount = Math.min(Math.max(0, rawDiscount), subtotal);

  await tx.coupon.update({
    where: { id: coupon.id },
    data: { usesCount: { increment: 1 } },
  });

  return { couponId: coupon.id, couponCode: coupon.code, discountAmount };
}
