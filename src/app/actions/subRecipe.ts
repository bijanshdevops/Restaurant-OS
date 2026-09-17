"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertNoSubRecipeCycle, RecipeCycleError } from '@/lib/recipeExpansion';

/**
 * فاز ۱۳: زیرفرمول (Sub-recipe) — یک آماده‌سازیِ میانی و غیرقابل‌فروش
 * (مثلاً یک سس) که خودش از مواد اولیه و/یا زیرفرمول‌های دیگر ساخته
 * می‌شود. دسترسی طبق تصمیمِ تأییدشده‌ی این فاز، فقط ADMIN است — دقیقاً
 * مثل فرمول فعلیِ آیتم منو.
 */

export async function getSubRecipes() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const subRecipes = await prisma.subRecipe.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return { success: true, subRecipes };
  } catch (error) {
    console.error('Error fetching sub-recipes:', error);
    return { success: false, error: 'خطا در دریافت فهرست زیرفرمول‌ها' };
  }
}

export async function getSubRecipeDetail(subRecipeId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const [subRecipe, items, inventoryItems, otherSubRecipes] = await Promise.all([
      prisma.subRecipe.findUnique({ where: { id: subRecipeId } }),
      prisma.subRecipeItem.findMany({
        where: { subRecipeId },
        include: { inventoryItem: true, childSubRecipe: true },
      }),
      prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
      prisma.subRecipe.findMany({
        where: { id: { not: subRecipeId } },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!subRecipe) {
      return { success: false, error: 'زیرفرمول یافت نشد' };
    }

    return { success: true, subRecipe, items, inventoryItems, otherSubRecipes };
  } catch (error) {
    console.error('Error fetching sub-recipe detail:', error);
    return { success: false, error: 'خطا در دریافت جزئیات زیرفرمول' };
  }
}

interface SubRecipeLineInput {
  inventoryItemId?: string;
  childSubRecipeId?: string;
  quantity: number;
  yieldPercent?: number;
}

export async function saveSubRecipe(
  subRecipeId: string | null,
  name: string,
  unit: string,
  notes: string,
  lines: SubRecipeLineInput[]
) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!name?.trim()) {
      return { success: false, error: 'نام زیرفرمول الزامی است' };
    }

    const validLines = lines.filter((l) => {
      const hasIngredient = !!l.inventoryItemId;
      const hasSubRecipe = !!l.childSubRecipeId;
      return (hasIngredient !== hasSubRecipe) && l.quantity > 0; // دقیقاً یکی از این دو
    });

    for (const line of validLines) {
      const yp = line.yieldPercent ?? 100;
      if (!Number.isFinite(yp) || yp <= 0 || yp > 100) {
        return { success: false, error: 'درصد بازده باید عددی بین ۱ تا ۱۰۰ باشد' };
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const subRecipe = subRecipeId
        ? await tx.subRecipe.update({
            where: { id: subRecipeId },
            data: { name: name.trim(), unit: unit?.trim() || '', notes: notes?.trim() || '' },
          })
        : await tx.subRecipe.create({
            data: { name: name.trim(), unit: unit?.trim() || '', notes: notes?.trim() || '' },
          });

      // بررسیِ عدمِ حلقه پیش از هرگونه نوشتن، برای هر ردیفی که به یک
      // زیرفرمولِ دیگر اشاره می‌کند.
      for (const line of validLines) {
        if (line.childSubRecipeId) {
          // db=tx: نک. توضیحِ بالای recipeExpansion.ts — این کوئری باید
          // داخلِ همین تراکنش اجرا شود، نه با کلاینتِ سراسریِ prisma.
          await assertNoSubRecipeCycle(subRecipe.id, line.childSubRecipeId, tx);
        }
      }

      await tx.subRecipeItem.deleteMany({ where: { subRecipeId: subRecipe.id } });
      if (validLines.length > 0) {
        await tx.subRecipeItem.createMany({
          data: validLines.map((l) => ({
            subRecipeId: subRecipe.id,
            inventoryItemId: l.inventoryItemId || null,
            childSubRecipeId: l.childSubRecipeId || null,
            quantity: l.quantity,
            yieldPercent: l.yieldPercent ?? 100,
          })),
        });
      }

      return subRecipe;
    });

    return { success: true, subRecipe: saved };
  } catch (error) {
    if (error instanceof RecipeCycleError) {
      return { success: false, error: error.message };
    }
    console.error('Error saving sub-recipe:', error);
    return { success: false, error: 'خطا در ذخیره‌ی زیرفرمول' };
  }
}

export async function deleteSubRecipe(subRecipeId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await prisma.subRecipe.delete({ where: { id: subRecipeId } });
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return {
        success: false,
        error: 'این زیرفرمول در فرمول یک یا چند آیتم منو یا زیرفرمول دیگر استفاده شده و قابل حذف نیست',
      };
    }
    console.error('Error deleting sub-recipe:', error);
    return { success: false, error: 'خطا در حذف زیرفرمول' };
  }
}
