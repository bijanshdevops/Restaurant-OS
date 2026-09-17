"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/**
 * فاز ۱۳: گروه‌های مدیفایر/افزودنی (مثلاً «افزودنی‌های پیتزا») که به یک یا
 * چند آیتم منو متصل می‌شوند و می‌توانند روی مصرف موجودی هم اثر بگذارند.
 * دسترسی: فقط ADMIN (تصمیم تأییدشده‌ی این فاز).
 */

export async function getModifierGroups() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const groups = await prisma.modifierGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        modifiers: {
          orderBy: { name: 'asc' },
          include: { recipeItems: { include: { inventoryItem: true } } },
        },
        _count: { select: { menuItems: true } },
      },
    });
    return { success: true, groups };
  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    return { success: false, error: 'خطا در دریافت گروه‌های مدیفایر' };
  }
}

interface ModifierInput {
  id?: string;
  name: string;
  priceDelta: number;
  recipeLines: { inventoryItemId: string; quantity: number }[];
}

export async function saveModifierGroup(
  groupId: string | null,
  name: string,
  minSelect: number,
  maxSelect: number,
  modifiers: ModifierInput[]
) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!name?.trim()) {
      return { success: false, error: 'نام گروه مدیفایر الزامی است' };
    }
    if (!Number.isInteger(minSelect) || minSelect < 0) {
      return { success: false, error: 'حداقل انتخاب نامعتبر است' };
    }
    if (!Number.isInteger(maxSelect) || maxSelect < minSelect || maxSelect < 1) {
      return { success: false, error: 'حداکثر انتخاب نامعتبر است' };
    }
    const validModifiers = modifiers.filter((m) => m.name?.trim());

    const saved = await prisma.$transaction(async (tx) => {
      const group = groupId
        ? await tx.modifierGroup.update({
            where: { id: groupId },
            data: { name: name.trim(), minSelect, maxSelect },
          })
        : await tx.modifierGroup.create({
            data: { name: name.trim(), minSelect, maxSelect },
          });

      // حذف مدیفایرهایی که دیگر در فهرست نیستند (اگر گروه از قبل وجود داشت)
      if (groupId) {
        const existingIds = (
          await tx.modifier.findMany({ where: { modifierGroupId: group.id }, select: { id: true } })
        ).map((m) => m.id);
        const keepIds = validModifiers.filter((m) => m.id).map((m) => m.id!);
        const toDelete = existingIds.filter((id) => !keepIds.includes(id));
        if (toDelete.length > 0) {
          await tx.modifier.deleteMany({ where: { id: { in: toDelete } } });
        }
      }

      for (const m of validModifiers) {
        const modifier = m.id
          ? await tx.modifier.update({
              where: { id: m.id },
              data: { name: m.name.trim(), priceDelta: m.priceDelta || 0 },
            })
          : await tx.modifier.create({
              data: { modifierGroupId: group.id, name: m.name.trim(), priceDelta: m.priceDelta || 0 },
            });

        const validRecipeLines = m.recipeLines.filter((l) => l.inventoryItemId && l.quantity !== 0);
        await tx.modifierRecipeItem.deleteMany({ where: { modifierId: modifier.id } });
        if (validRecipeLines.length > 0) {
          await tx.modifierRecipeItem.createMany({
            data: validRecipeLines.map((l) => ({
              modifierId: modifier.id,
              inventoryItemId: l.inventoryItemId,
              quantity: l.quantity,
            })),
          });
        }
      }

      return group;
    });

    return { success: true, group: saved };
  } catch (error) {
    console.error('Error saving modifier group:', error);
    return { success: false, error: 'خطا در ذخیره‌ی گروه مدیفایر' };
  }
}

export async function deleteModifierGroup(groupId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    // تاریخچه‌ی سفارش‌های قبلی از طریق OrderItemModifier (که نام و قیمت را
    // مستقل نگه می‌دارد) دست‌نخورده می‌ماند؛ حذفِ گروه فقط modifierId آن
    // ردیف‌ها را طبق onDelete: SetNull خالی می‌کند.
    await prisma.modifierGroup.delete({ where: { id: groupId } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting modifier group:', error);
    return { success: false, error: 'خطا در حذف گروه مدیفایر' };
  }
}

export async function getMenuItemModifierGroups(menuItemId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const links = await prisma.menuItemModifierGroup.findMany({
      where: { menuItemId },
      select: { modifierGroupId: true },
    });
    return { success: true, modifierGroupIds: links.map((l) => l.modifierGroupId) };
  } catch (error) {
    console.error('Error fetching menu item modifier groups:', error);
    return { success: false, error: 'خطا در دریافت گروه‌های مدیفایر این آیتم' };
  }
}

export async function setMenuItemModifierGroups(menuItemId: string, modifierGroupIds: string[]) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await prisma.$transaction([
      prisma.menuItemModifierGroup.deleteMany({ where: { menuItemId } }),
      ...(modifierGroupIds.length > 0
        ? [
            prisma.menuItemModifierGroup.createMany({
              data: modifierGroupIds.map((modifierGroupId) => ({ menuItemId, modifierGroupId })),
            }),
          ]
        : []),
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error setting menu item modifier groups:', error);
    return { success: false, error: 'خطا در تنظیم گروه‌های مدیفایر این آیتم' };
  }
}
