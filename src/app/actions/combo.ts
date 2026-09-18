"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/**
 * فاز ۱۵: کمبو (بسته‌ی چند آیتمی با قیمتِ ثابت). هر Combo داخلاً با یک
 * «آیتمِ منویِ سایه» (MenuItem.isCombo=true) نمایندگی می‌شود — نک. توضیحِ
 * کاملِ این تصمیمِ معماری در schema.prisma بالای بخشِ فازِ ۱۵. دسترسیِ
 * مدیریت: فقط ADMIN (تصمیمِ تأییدشده‌ی این فاز).
 */

const COMBO_CATEGORY = 'کمبو';

export async function getCombos() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const combos = await prisma.combo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        menuItem: true,
        items: { include: { menuItem: { select: { id: true, title: true, price: true } } } },
      },
    });
    return { success: true, combos };
  } catch (error) {
    console.error('Error fetching combos:', error);
    return { success: false, error: 'خطا در دریافت کمبوها' };
  }
}

/** آیتم‌های منویی که می‌توانند جزوِ یک کمبو باشند — خودِ آیتم‌های combo مستثنا هستند (کمبو در کمبو ممنوع است). */
export async function getComboEligibleMenuItems() {
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
    console.error('Error fetching combo-eligible menu items:', error);
    return { success: false, error: 'خطا در دریافت آیتم‌های قابلِ استفاده در کمبو' };
  }
}

interface ComboItemInput {
  menuItemId: string;
  quantity: number;
}

interface ComboInput {
  name: string;
  price: number;
  kitchenStation?: string;
  isActive?: boolean;
  items: ComboItemInput[];
}

function validateComboInput(input: ComboInput): string | null {
  if (!input.name?.trim()) return 'نام کمبو الزامی است';
  if (!Number.isFinite(input.price) || input.price <= 0) return 'قیمتِ کمبو باید عددی مثبت باشد';
  const validItems = input.items.filter((i) => i.menuItemId && i.quantity > 0);
  if (validItems.length === 0) return 'کمبو باید حداقل شامل یک آیتم منو باشد';
  return null;
}

export async function createCombo(input: ComboInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateComboInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const validItems = input.items.filter((i) => i.menuItemId && i.quantity > 0);

    // یک کمبو نمی‌تواند شاملِ کمبویِ دیگری باشد (نک. توضیحِ تصمیمِ محدوده).
    const componentMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: validItems.map((i) => i.menuItemId) } },
      select: { id: true, isCombo: true },
    });
    if (componentMenuItems.some((m) => m.isCombo)) {
      return { success: false, error: 'کمبو نمی‌تواند شاملِ کمبویِ دیگری باشد' };
    }
    if (componentMenuItems.length !== new Set(validItems.map((i) => i.menuItemId)).size) {
      return { success: false, error: 'یکی از آیتم‌های انتخاب‌شده در منو یافت نشد' };
    }

    const combo = await prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.create({
        data: {
          title: input.name.trim(),
          price: input.price,
          category: COMBO_CATEGORY,
          isAvailable: input.isActive ?? true,
          isCombo: true,
          kitchenStation: input.kitchenStation?.trim() || null,
        },
      });

      return tx.combo.create({
        data: {
          name: input.name.trim(),
          price: input.price,
          isActive: input.isActive ?? true,
          createdByUserId: auth.user.id,
          menuItemId: menuItem.id,
          items: {
            createMany: {
              data: validItems.map((i) => ({ menuItemId: i.menuItemId, quantity: Math.floor(i.quantity) })),
            },
          },
        },
        include: { items: true, menuItem: true },
      });
    });

    return { success: true, combo };
  } catch (error) {
    console.error('Error creating combo:', error);
    return { success: false, error: 'خطا در ساختِ کمبو' };
  }
}

export async function updateCombo(comboId: string, input: ComboInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateComboInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const validItems = input.items.filter((i) => i.menuItemId && i.quantity > 0);

    const componentMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: validItems.map((i) => i.menuItemId) } },
      select: { id: true, isCombo: true },
    });
    if (componentMenuItems.some((m) => m.isCombo)) {
      return { success: false, error: 'کمبو نمی‌تواند شاملِ کمبویِ دیگری باشد' };
    }

    const existing = await prisma.combo.findUnique({ where: { id: comboId } });
    if (!existing) return { success: false, error: 'کمبو یافت نشد' };

    const combo = await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id: existing.menuItemId },
        data: {
          title: input.name.trim(),
          price: input.price,
          isAvailable: input.isActive ?? true,
          kitchenStation: input.kitchenStation?.trim() || null,
        },
      });

      await tx.comboItem.deleteMany({ where: { comboId } });

      return tx.combo.update({
        where: { id: comboId },
        data: {
          name: input.name.trim(),
          price: input.price,
          isActive: input.isActive ?? true,
          items: {
            createMany: {
              data: validItems.map((i) => ({ menuItemId: i.menuItemId, quantity: Math.floor(i.quantity) })),
            },
          },
        },
        include: { items: true, menuItem: true },
      });
    });

    return { success: true, combo };
  } catch (error) {
    console.error('Error updating combo:', error);
    return { success: false, error: 'خطا در ویرایشِ کمبو' };
  }
}

/**
 * حذفِ کمبو، آیتمِ منویِ سایه‌ی آن را هم حذف می‌کند — مگر این‌که آن آیتم
 * قبلاً در یک سفارش استفاده شده باشد (OrderItem.menuItemId رویِ آن اشاره
 * می‌کند)، که در آن صورت فقط غیرفعال می‌شود تا تاریخچه‌ی سفارش‌های قبلی
 * (که به آن آیتمِ منو ارجاع می‌دهند) دست‌نخورده بماند — دقیقاً همان الگویِ
 * «حذف/غیرفعال‌سازیِ مشروط» که فازِ ۱۴ برای کدِ تخفیفِ استفاده‌شده به کار
 * برد.
 */
export async function deleteCombo(comboId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const combo = await prisma.combo.findUnique({ where: { id: comboId } });
    if (!combo) return { success: false, error: 'کمبو یافت نشد' };

    const usageCount = await prisma.orderItem.count({ where: { menuItemId: combo.menuItemId } });

    if (usageCount > 0) {
      await prisma.$transaction([
        prisma.combo.update({ where: { id: comboId }, data: { isActive: false } }),
        prisma.menuItem.update({ where: { id: combo.menuItemId }, data: { isAvailable: false } }),
      ]);
      return { success: true, deactivatedInstead: true };
    }

    await prisma.$transaction([
      prisma.combo.delete({ where: { id: comboId } }),
      prisma.menuItem.delete({ where: { id: combo.menuItemId } }),
    ]);
    return { success: true, deactivatedInstead: false };
  } catch (error) {
    console.error('Error deleting combo:', error);
    return { success: false, error: 'خطا در حذفِ کمبو' };
  }
}
