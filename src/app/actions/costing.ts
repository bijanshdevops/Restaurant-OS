"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { expandMenuItemBaseUsage, expandSubRecipeUsagePerUnit } from '@/lib/recipeExpansion';

/**
 * فرمول غذا (BOM) و منو در سراسر شعبه‌ها مشترک است، اما از فاز ۵
 * (چند شعبه‌ای) به بعد قیمت هر ماده‌ی اولیه (costPerUnit) در
 * BranchInventoryStock و مخصوص هر شعبه است. آنالیز قیمت تمام‌شده همیشه
 * نسبت به یک شعبه‌ی مشخص محاسبه می‌شود — اگر صریحاً داده نشود، شعبه‌ی خودِ
 * کاربر (این محدودیت شناخته‌شده در README مستند شده است).
 *
 * از فاز ۱۳ به بعد، این محاسبه از همان تابعِ بسطِ فرمولِ کاملِ recipeExpansion
 * استفاده می‌کند (نه پیمایشِ ساده‌ی یک‌سطحیِ recipeItems) تا درصد بازده
 * (yield %) و هزینه‌ی زیرفرمول‌های تودرتو هم به‌درستی در قیمت تمام‌شده لحاظ
 * شوند — مدیفایرهای انتخابیِ مشتری عمداً در این آنالیزِ «آیتمِ پایه» دخیل
 * نیستند، چون مدیفایر یک انتخابِ لحظه‌ی سفارش است، نه بخشی از فرمولِ ثابتِ
 * خودِ آیتم.
 */

export async function getMenuCostAnalysis(branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };
  const effectiveBranchId = branchId || auth.user.branchId;

  try {
    const [items, branchStocks] = await Promise.all([
      prisma.menuItem.findMany({
        orderBy: { title: 'asc' },
        include: { recipeItems: true },
      }),
      prisma.branchInventoryStock.findMany({ where: { branchId: effectiveBranchId } }),
    ]);

    const costPerUnitMap = new Map(branchStocks.map((s) => [s.inventoryItemId, s.costPerUnit]));

    const analysis = await Promise.all(
      items.map(async (item) => {
        const usage = await expandMenuItemBaseUsage(item.id);
        let cost = 0;
        for (const [inventoryItemId, qty] of usage) {
          cost += qty * (costPerUnitMap.get(inventoryItemId) ?? 0);
        }
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
      })
    );

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
    const [menuItem, stocks, recipeItems, subRecipes] = await Promise.all([
      prisma.menuItem.findUnique({ where: { id: menuItemId } }),
      prisma.branchInventoryStock.findMany({
        where: { branchId: effectiveBranchId },
        include: { inventoryItem: true },
        orderBy: { inventoryItem: { name: 'asc' } },
      }),
      prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { inventoryItem: true, subRecipe: true },
      }),
      // فاز ۱۳: فهرست زیرفرمول‌ها برای انتخاب به‌عنوان «ماده‌ی اولیه»
      prisma.subRecipe.findMany({ orderBy: { name: 'asc' } }),
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

    // هزینه‌ی تمام‌شده‌ی خودِ هر زیرفرمول (به‌ازای یک واحد) هم همین‌جا
    // محاسبه و ضمیمه می‌شود — رابط کاربری برای محاسبه‌ی هزینه‌ی یک ردیفِ
    // فرمول که «ماده‌ی اولیه‌اش» یک زیرفرمول است، نیازی به تکرارِ منطقِ
    // بسطِ بازگشتی نداشته باشد.
    const costPerUnitMap = new Map(inventoryItems.map((i) => [i.id, i.costPerUnit]));
    const subRecipesWithCost = await Promise.all(
      subRecipes.map(async (sr) => {
        const usage = await expandSubRecipeUsagePerUnit(sr.id);
        let cost = 0;
        for (const [invId, qty] of usage) {
          cost += qty * (costPerUnitMap.get(invId) ?? 0);
        }
        return { ...sr, costPerUnit: cost };
      })
    );

    return {
      success: true,
      menuItem,
      inventoryItems,
      recipeItems,
      subRecipes: subRecipesWithCost,
      branchId: effectiveBranchId,
    };
  } catch (error) {
    console.error('Error fetching menu item recipe:', error);
    return { success: false, error: 'Failed to fetch recipe' };
  }
}

interface RecipeLineInput {
  inventoryItemId?: string;
  subRecipeId?: string;
  quantity: number;
  yieldPercent?: number;
}

/**
 * از فاز ۱۳ به بعد، هر ردیف دقیقاً یکی از inventoryItemId/subRecipeId را
 * دارد (نه هر دو، نه هیچ‌کدام) و می‌تواند یک yieldPercent اختیاری (پیش‌فرض
 * ۱۰۰ = بدون ضایعات) داشته باشد. خطوطی که این شرط را نداشته باشند نادیده
 * گرفته می‌شوند (همان رفتار قبلیِ «فیلتر کردن ردیف‌های ناقص»).
 */
export async function saveMenuItemRecipe(menuItemId: string, lines: RecipeLineInput[]) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const validLines = lines.filter((l) => {
      const hasIngredient = !!l.inventoryItemId;
      const hasSubRecipe = !!l.subRecipeId;
      return (hasIngredient !== hasSubRecipe) && l.quantity > 0;
    });

    for (const line of validLines) {
      const yp = line.yieldPercent ?? 100;
      if (!Number.isFinite(yp) || yp <= 0 || yp > 100) {
        return { success: false, error: 'درصد بازده باید عددی بین ۱ تا ۱۰۰ باشد' };
      }
    }

    await prisma.$transaction([
      prisma.recipeItem.deleteMany({ where: { menuItemId } }),
      ...(validLines.length > 0
        ? [
            prisma.recipeItem.createMany({
              data: validLines.map((l) => ({
                menuItemId,
                inventoryItemId: l.inventoryItemId || null,
                subRecipeId: l.subRecipeId || null,
                quantity: l.quantity,
                yieldPercent: l.yieldPercent ?? 100,
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
