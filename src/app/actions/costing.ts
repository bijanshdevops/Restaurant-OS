"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function getMenuCostAnalysis() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { title: 'asc' },
      include: {
        recipeItems: {
          include: { inventoryItem: true },
        },
      },
    });

    const analysis = items.map((item) => {
      const cost = item.recipeItems.reduce(
        (sum, ri) => sum + ri.quantity * ri.inventoryItem.costPerUnit,
        0
      );
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

    return { success: true, items: analysis };
  } catch (error) {
    console.error('Error computing cost analysis:', error);
    return { success: false, error: 'Failed to compute cost analysis' };
  }
}

export async function getMenuItemRecipe(menuItemId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const [menuItem, inventoryItems, recipeItems] = await Promise.all([
      prisma.menuItem.findUnique({ where: { id: menuItemId } }),
      prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
      prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { inventoryItem: true },
      }),
    ]);

    if (!menuItem) {
      return { success: false, error: 'Menu item not found' };
    }

    return {
      success: true,
      menuItem,
      inventoryItems,
      recipeItems,
    };
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

export async function updateInventoryItemCost(id: string, costPerUnit: number) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { costPerUnit },
    });
    return { success: true, item: updated };
  } catch (error) {
    console.error('Error updating inventory item cost:', error);
    return { success: false, error: 'Failed to update cost' };
  }
}
