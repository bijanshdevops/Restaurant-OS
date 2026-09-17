"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/**
 * فرمول غذا (BOM) و منو در سراسر شعبه‌ها مشترک است، اما از فاز ۵
 * (چند شعبه‌ای) به بعد قیمت هر ماده‌ی اولیه (costPerUnit) در
 * BranchInventoryStock و مخصوص هر شعبه است. آنالیز قیمت تمام‌شده همیشه
 * نسبت به یک شعبه‌ی مشخص محاسبه می‌شود — اگر صریحاً داده نشود، شعبه‌ی خودِ
 * کاربر (این محدودیت شناخته‌شده در README مستند شده است).
 */

export async function getMenuCostAnalysis(branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };
  const effectiveBranchId = branchId || auth.user.branchId;

  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { title: 'asc' },
      include: {
        recipeItems: {
          include: {
            inventoryItem: {
              include: { branchStocks: { where: { branchId: effectiveBranchId } } },
            },
          },
        },
      },
    });

    const analysis = items.map((item) => {
      const cost = item.recipeItems.reduce((sum, ri) => {
        const costPerUnit = ri.inventoryItem.branchStocks[0]?.costPerUnit ?? 0;
        return sum + ri.quantity * costPerUnit;
      }, 0);
      const profit = item.price - cost;
      const marginPercent = item.price > 0 ? (profit / item.price) * 100 : 0;

      return {
        id: item.id,
        title: item.title,
        category: item.category,
        price: item.price,
        cost,
        profit,
        marginPercent,
        ingredientCount: item.recipeItems.length,
      };
    });

    return { success: true, items: analysis, branchId: effectiveBranchId };
  } catch (error) {
    console.error('Error computing cost analysis:', error);
    return { success: false, error: 'Failed to compute cost analysis' };
  }
}

export async function getMenuItemRecipe(menuItemId: string, branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };
  const effectiveBranchId = branchId || auth.user.branchId;

  try {
    const [menuItem, stocks, recipeItems] = await Promise.all([
      prisma.menuItem.findUnique({ where: { id: menuItemId } }),
      prisma.branchInventoryStock.findMany({
        where: { branchId: effectiveBranchId },
        include: { inventoryItem: true },
        orderBy: { inventoryItem: { name: 'asc' } },
      }),
      prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { inventoryItem: true },
      }),
    ]);

    if (!menuItem) {
      return { success: false, error: 'Menu item not found' };
    }

    // شکل قبلی (فهرست تخت آیتم‌های موجودی با costPerUnit روی خودشان) حفظ
    // می‌شود تا صفحه‌ی فرمول غذا در پنل مدیریت بدون تغییر کار کند.
    const inventoryItems = stocks.map((s) => ({
      id: s.inventoryItem.id,
      name: s.inventoryItem.name,
      unit: s.inventoryItem.unit,
      costPerUnit: s.costPerUnit,
    }));

    return { success: true, menuItem, inventoryItems, recipeItems, branchId: effectiveBranchId };
  } catch (error) {
    console.error('Error fetching menu item recipe:', error);
    return { success: false, error: 'Failed to fetch recipe' };
  }
}

export async function saveMenuItemRecipe(
  menuItemId: string,
  lines: { inventoryItemId: string; quantity: number }[]
) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const validLines = lines.filter(
      (l) => l.inventoryItemId && l.quantity > 0
    );

    await prisma.$transaction([
      prisma.recipeItem.deleteMany({ where: { menuItemId } }),
      ...(validLines.length > 0
        ? [
            prisma.recipeItem.createMany({
              data: validLines.map((l) => ({
                menuItemId,
                inventoryItemId: l.inventoryItemId,
                quantity: l.quantity,
              })),
            }),
          ]
        : []),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return { success: false, error: 'Failed to save recipe' };
  }
}

export async function updateInventoryItemCost(id: string, costPerUnit: number, branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };
  const effectiveBranchId = branchId || auth.user.branchId;

  try {
    const updated = await prisma.branchInventoryStock.update({
      where: { branchId_inventoryItemId: { branchId: effectiveBranchId, inventoryItemId: id } },
      data: { costPerUnit },
      include: { inventoryItem: true },
    });
    return { success: true, item: { id: updated.inventoryItem.id, costPerUnit: updated.costPerUnit } };
  } catch (error) {
    console.error('Error updating inventory item cost:', error);
    return { success: false, error: 'Failed to update cost' };
  }
}
