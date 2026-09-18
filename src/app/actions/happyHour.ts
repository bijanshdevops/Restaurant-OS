"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { HappyHourDiscountType } from '@prisma/client';

/**
 * فاز ۱۵: قوانینِ تخفیفِ زمان‌بندی‌شده (Happy Hour) روی آیتم‌های منویِ
 * معمولی (نه کمبو — نک. توضیحِ تصمیمِ محدوده در schema.prisma). دسترسیِ
 * مدیریت: فقط ADMIN.
 */

export async function getHappyHourRules() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const rules = await prisma.happyHourRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { menuItem: { select: { id: true, title: true } } } } },
    });
    return { success: true, rules };
  } catch (error) {
    console.error('Error fetching happy hour rules:', error);
    return { success: false, error: 'خطا در دریافت قوانینِ Happy Hour' };
  }
}

/** آیتم‌های منویی که می‌توانند هدفِ یک قانونِ Happy Hour باشند (کمبوها مستثنا هستند). */
export async function getHappyHourEligibleMenuItems() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const items = await prisma.menuItem.findMany({
      where: { isCombo: false },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, price: true, category: true },
    });
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching happy-hour-eligible menu items:', error);
    return { success: false, error: 'خطا در دریافت آیتم‌های قابلِ استفاده در Happy Hour' };
  }
}

interface HappyHourRuleInput {
  name: string;
  discountType: HappyHourDiscountType;
  value: number;
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
  menuItemIds: string[];
}

function validateHappyHourInput(input: HappyHourRuleInput): string | null {
  if (!input.name?.trim()) return 'نام قانون الزامی است';
  if (input.discountType === 'PERCENT') {
    if (!Number.isFinite(input.value) || input.value <= 0 || input.value > 100) {
      return 'درصدِ تخفیف باید بین ۱ تا ۱۰۰ باشد';
    }
  } else if (input.discountType === 'FIXED') {
    if (!Number.isFinite(input.value) || input.value <= 0) {
      return 'مبلغِ تخفیفِ ثابت باید عددی مثبت باشد';
    }
  } else {
    return 'نوعِ تخفیف نامعتبر است';
  }
  const days = [...new Set(input.daysOfWeek)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (days.length === 0) return 'حداقل یک روزِ هفته را انتخاب کنید';
  if (
    !Number.isInteger(input.startMinute) ||
    !Number.isInteger(input.endMinute) ||
    input.startMinute < 0 ||
    input.startMinute > 1439 ||
    input.endMinute < 0 ||
    input.endMinute > 1439 ||
    input.startMinute === input.endMinute
  ) {
    return 'بازه‌ی زمانی نامعتبر است';
  }
  const menuItemIds = [...new Set(input.menuItemIds)].filter(Boolean);
  if (menuItemIds.length === 0) return 'حداقل یک آیتمِ منو را انتخاب کنید';
  return null;
}

export async function createHappyHourRule(input: HappyHourRuleInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateHappyHourInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const menuItemIds = [...new Set(input.menuItemIds)].filter(Boolean);
    const combos = await prisma.menuItem.count({ where: { id: { in: menuItemIds }, isCombo: true } });
    if (combos > 0) {
      return { success: false, error: 'قانونِ Happy Hour نمی‌تواند رویِ یک کمبو اعمال شود' };
    }

    const days = [...new Set(input.daysOfWeek)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

    const rule = await prisma.happyHourRule.create({
      data: {
        name: input.name.trim(),
        discountType: input.discountType,
        value: input.value,
        daysOfWeek: days,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        isActive: input.isActive ?? true,
        createdByUserId: auth.user.id,
        items: { createMany: { data: menuItemIds.map((menuItemId) => ({ menuItemId })) } },
      },
      include: { items: true },
    });

    return { success: true, rule };
  } catch (error) {
    console.error('Error creating happy hour rule:', error);
    return { success: false, error: 'خطا در ساختِ قانونِ Happy Hour' };
  }
}

export async function updateHappyHourRule(ruleId: string, input: HappyHourRuleInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateHappyHourInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const menuItemIds = [...new Set(input.menuItemIds)].filter(Boolean);
    const combos = await prisma.menuItem.count({ where: { id: { in: menuItemIds }, isCombo: true } });
    if (combos > 0) {
      return { success: false, error: 'قانونِ Happy Hour نمی‌تواند رویِ یک کمبو اعمال شود' };
    }

    const days = [...new Set(input.daysOfWeek)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

    const rule = await prisma.$transaction(async (tx) => {
      await tx.happyHourRuleItem.deleteMany({ where: { ruleId } });
      return tx.happyHourRule.update({
        where: { id: ruleId },
        data: {
          name: input.name.trim(),
          discountType: input.discountType,
          value: input.value,
          daysOfWeek: days,
          startMinute: input.startMinute,
          endMinute: input.endMinute,
          isActive: input.isActive ?? true,
          items: { createMany: { data: menuItemIds.map((menuItemId) => ({ menuItemId })) } },
        },
        include: { items: true },
      });
    });

    return { success: true, rule };
  } catch (error) {
    console.error('Error updating happy hour rule:', error);
    return { success: false, error: 'خطا در ویرایشِ قانونِ Happy Hour' };
  }
}

export async function deleteHappyHourRule(ruleId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    // تاریخچه‌ی سفارش‌های قبلی از طریقِ OrderItem.happyHourRuleName (که
    // مستقل نگه داشته می‌شود) دست‌نخورده می‌ماند؛ حذفِ قانون فقط
    // happyHourRuleId آن ردیف‌ها را طبقِ onDelete: SetNull خالی می‌کند.
    await prisma.happyHourRule.delete({ where: { id: ruleId } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting happy hour rule:', error);
    return { success: false, error: 'خطا در حذفِ قانونِ Happy Hour' };
  }
}
