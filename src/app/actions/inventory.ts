"use server";

import { prisma } from '@/lib/prisma';
import { requireRole, resolveBranchFilter, resolveBranchForCreate } from '@/lib/auth';

/**
 * از فاز ۵ (چند شعبه‌ای) به بعد، InventoryItem فقط کاتالوگ مشترک است
 * (نام/واحد/دسته‌بندی) و موجودی واقعی هر ماده در BranchInventoryStock،
 * جدا برای هر شعبه، نگه‌داری می‌شود. برای این‌که کد و صفحات موجود
 * (inventory/page.tsx، تب قیمت تمام‌شده در پنل مدیریت) بدون تغییر کار
 * کنند، پاسخ این اکشن‌ها همان شکل قبلی (currentStock/minStockLevel/
 * costPerUnit/lastRestocked مستقیماً روی خود آیتم) را حفظ می‌کند، فقط این
 * مقادیر از رکورد موجودیِ شعبه‌ی مربوطه «صاف» (flatten) می‌شوند.
 */

export async function getInventoryItems(branchId?: string) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const filterBranchId = resolveBranchFilter(auth.user, branchId);

    // بدون فیلتر شعبه (فقط ADMIN): هر آیتم را یک‌بار به‌ازای هر شعبه‌ای که
    // در آن موجودی دارد نشان می‌دهد، تا مدیر بتواند وضعیت همه‌ی شعبه‌ها را
    // در یک فهرست ببیند.
    const stocks = await prisma.branchInventoryStock.findMany({
      where: filterBranchId ? { branchId: filterBranchId } : {},
      include: { inventoryItem: true, branch: { select: { id: true, name: true } } },
      orderBy: { inventoryItem: { name: 'asc' } },
    });

    const items = stocks.map((s) => ({
      id: s.inventoryItem.id,
      name: s.inventoryItem.name,
      category: s.inventoryItem.category,
      unit: s.inventoryItem.unit,
      currentStock: s.currentStock,
      minStockLevel: s.minStockLevel,
      costPerUnit: s.costPerUnit,
      lastRestocked: s.lastRestocked,
      branchId: s.branchId,
      branch: s.branch,
      stockId: s.id,
    }));

    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return { success: false, error: 'Failed to fetch inventory items' };
  }
}

export async function createInventoryItem(data: {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  branchId?: string;
}) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const branchId = resolveBranchForCreate(auth.user, data.branchId);

    // اگر ماده‌ای با همین نام از قبل در کاتالوگ مشترک وجود دارد (مثلاً یک
    // شعبه‌ی دیگر قبلاً «برنج» را تعریف کرده)، همان آیتم کاتالوگ استفاده
    // می‌شود — تا فرمول غذاها که به این آیتم اشاره می‌کنند، بین شعبه‌ها
    // یکپارچه بمانند — و فقط یک رکورد موجودی جدید برای این شعبه ساخته
    // می‌شود؛ در غیر این صورت یک آیتم کاتالوگ تازه ساخته می‌شود.
    let catalogItem = await prisma.inventoryItem.findFirst({ where: { name: data.name.trim() } });
    if (!catalogItem) {
      catalogItem = await prisma.inventoryItem.create({
        data: { name: data.name.trim(), category: data.category, unit: data.unit },
      });
    }

    const existingStock = await prisma.branchInventoryStock.findUnique({
      where: { branchId_inventoryItemId: { branchId, inventoryItemId: catalogItem.id } },
    });
    if (existingStock) {
      return { success: false, error: 'این ماده از قبل در موجودی این شعبه ثبت شده است' };
    }

    const stock = await prisma.branchInventoryStock.create({
      data: {
        branchId,
        inventoryItemId: catalogItem.id,
        currentStock: data.currentStock,
        minStockLevel: data.minStockLevel,
      },
    });

    return {
      success: true,
      item: {
        id: catalogItem.id,
        name: catalogItem.name,
        category: catalogItem.category,
        unit: catalogItem.unit,
        currentStock: stock.currentStock,
        minStockLevel: stock.minStockLevel,
        costPerUnit: stock.costPerUnit,
        lastRestocked: stock.lastRestocked,
        branchId: stock.branchId,
      },
    };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: 'Failed to create inventory item' };
  }
}

export async function restockInventoryItem(id: string, addedAmount: number, branchId?: string) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, branchId);

    // از increment اتمیک به‌جای خواندن-سپس-نوشتن استفاده می‌کنیم تا دو
    // ورود هم‌زمان به یک ماده با هم رقابت نکنند و یکی گم نشود.
    const updated = await prisma.branchInventoryStock.update({
      where: { branchId_inventoryItemId: { branchId: effectiveBranchId, inventoryItemId: id } },
      data: {
        currentStock: { increment: addedAmount },
        lastRestocked: new Date(),
      },
      include: { inventoryItem: true },
    });

    return {
      success: true,
      item: {
        id: updated.inventoryItem.id,
        name: updated.inventoryItem.name,
        category: updated.inventoryItem.category,
        unit: updated.inventoryItem.unit,
        currentStock: updated.currentStock,
        minStockLevel: updated.minStockLevel,
        costPerUnit: updated.costPerUnit,
        lastRestocked: updated.lastRestocked,
        branchId: updated.branchId,
      },
    };
  } catch (error) {
    console.error('Error restocking inventory item:', error);
    return { success: false, error: 'این ماده در موجودی این شعبه یافت نشد' };
  }
}

/**
 * این ماده را از موجودیِ همین شعبه حذف می‌کند (نه از شعبه‌های دیگر). فقط
 * وقتی هیچ شعبه‌ی دیگری هم آن را در موجودی خودش ندارد، خودِ آیتم کاتالوگ
 * (و فرمول غذاهایی که به آن اشاره می‌کنند) هم حذف می‌شود — تا حذف یک
 * ماده در یک شعبه، فرمول‌های شعبه‌های دیگر را خراب نکند.
 */
export async function deleteInventoryItem(id: string, branchId?: string) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, branchId);

    await prisma.branchInventoryStock.delete({
      where: { branchId_inventoryItemId: { branchId: effectiveBranchId, inventoryItemId: id } },
    });

    const remaining = await prisma.branchInventoryStock.count({ where: { inventoryItemId: id } });
    if (remaining === 0) {
      await prisma.inventoryItem.delete({ where: { id } });
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: 'Failed to delete inventory item' };
  }
}
