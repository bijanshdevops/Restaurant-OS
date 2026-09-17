"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { requireRole } from '@/lib/auth';

const PROCUREMENT_ROLES = ['ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT'] as const;

interface PurchaseOrderLine {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
}

export async function getPurchaseOrders() {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const orders = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        items: { include: { inventoryItem: true } },
      },
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { success: false, error: 'خطا در دریافت لیست سفارش‌های خرید' };
  }
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  items: PurchaseOrderLine[];
  notes?: string;
}) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'حداقل یک قلم کالا اضافه کنید' };
  }
  for (const line of data.items) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { success: false, error: 'تعداد سفارش برای همه‌ی اقلام باید بزرگ‌تر از صفر باشد' };
    }
    if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
      return { success: false, error: 'قیمت خرید نامعتبر است' };
    }
  }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) return { success: false, error: 'تأمین‌کننده یافت نشد' };

    const poNumber = `PO-${randomBytes(2).toString('hex').toUpperCase()}`;
    const totalAmount = data.items.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        notes: data.notes?.trim() || '',
        totalAmount,
        items: {
          create: data.items.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantityOrdered: l.quantity,
            unitCost: l.unitCost,
          })),
        },
      },
      include: { items: { include: { inventoryItem: true } }, supplier: true },
    });

    return { success: true, order };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, error: 'خطا در ثبت سفارش خرید' };
  }
}

/** Marks a draft PO as sent to the supplier (DRAFT -> ORDERED). */
export async function markPurchaseOrderOrdered(id: string) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'سفارش خرید یافت نشد' };
    if (existing.status !== 'DRAFT') {
      return { success: false, error: 'فقط سفارش‌های پیش‌نویس قابل ثبت هستند' };
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'ORDERED', orderedAt: new Date() },
    });
    return { success: true, order };
  } catch (error) {
    console.error('Error marking purchase order as ordered:', error);
    return { success: false, error: 'خطا در ثبت سفارش' };
  }
}

/** Cancels a PO, but only if nothing has been received against it yet. */
export async function cancelPurchaseOrder(id: string) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return { success: false, error: 'سفارش خرید یافت نشد' };
    if (existing.status === 'CANCELLED' || existing.status === 'RECEIVED') {
      return { success: false, error: 'این سفارش دیگر قابل لغو نیست' };
    }
    if (existing.items.some((i) => i.quantityReceived > 0)) {
      return { success: false, error: 'سفارشی که بخشی از آن دریافت شده را نمی‌توان لغو کرد' };
    }

    const order = await prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { success: true, order };
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    return { success: false, error: 'خطا در لغو سفارش خرید' };
  }
}

interface ReceiptLine {
  purchaseOrderItemId: string;
  quantity: number;
}

/**
 * Records real, physical receipt of goods against a PO — the only point at
 * which inventory stock, the item's cost, accounting (an EXPENSE
 * transaction), and the supplier's outstanding balance actually change.
 * Supports partial receiving (a batch can cover only some of the ordered
 * quantity, and this can be called multiple times as more of the order
 * arrives). Over-receiving beyond what was ordered is clamped, never
 * allowed to overshoot.
 */
export async function receivePurchaseOrderItems(purchaseOrderId: string, receipts: ReceiptLine[]) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!receipts || receipts.length === 0) {
    return { success: false, error: 'حداقل مقدار دریافتی یک قلم را وارد کنید' };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true },
      });
      if (!po) throw new Error('سفارش خرید یافت نشد');
      if (po.status === 'DRAFT' || po.status === 'CANCELLED' || po.status === 'RECEIVED') {
        throw new Error('این سفارش در وضعیت قابل دریافت کالا نیست');
      }

      const itemMap = new Map(po.items.map((i) => [i.id, i]));
      let batchCost = 0;

      for (const r of receipts) {
        const item = itemMap.get(r.purchaseOrderItemId);
        if (!item) throw new Error('قلم سفارش یافت نشد');
        if (!Number.isFinite(r.quantity) || r.quantity <= 0) continue;

        // Never allow receiving more than what remains on order.
        const remaining = item.quantityOrdered - item.quantityReceived;
        const acceptedQty = Math.min(r.quantity, remaining);
        if (acceptedQty <= 0) continue;

        batchCost += acceptedQty * item.unitCost;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: acceptedQty } },
        });

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            currentStock: { increment: acceptedQty },
            costPerUnit: item.unitCost,
            lastRestocked: new Date(),
          },
        });
      }

      if (batchCost > 0) {
        await tx.transaction.create({
          data: {
            type: 'EXPENSE',
            description: `خرید کالا از تأمین‌کننده — سفارش ${po.poNumber}`,
            amount: batchCost,
          },
        });
        await tx.supplier.update({
          where: { id: po.supplierId },
          data: { balanceOwed: { increment: batchCost } },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
      const allReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
      const anyReceived = refreshedItems.some((i) => i.quantityReceived > 0);

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: allReceived
          ? { status: 'RECEIVED', receivedAt: new Date() }
          : anyReceived
          ? { status: 'PARTIALLY_RECEIVED' }
          : {},
        include: { items: { include: { inventoryItem: true } }, supplier: true },
      });
    });

    return { success: true, order };
  } catch (error: any) {
    console.error('Error receiving purchase order items:', error);
    return { success: false, error: error?.message || 'خطا در ثبت ورود کالا' };
  }
}

/**
 * Items at or below their configured reorder point (minStockLevel), each
 * with a suggested reorder quantity. The suggestion is a simple heuristic —
 * top back up to twice the reorder point — since there's no separate "par
 * level" field yet; staff can freely adjust the quantity when building the
 * actual purchase order.
 */
export async function getLowStockItems() {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
    const lowStock = items
      .filter((i) => i.currentStock <= i.minStockLevel)
      .map((i) => ({
        ...i,
        suggestedQuantity: Math.max(i.minStockLevel * 2 - i.currentStock, i.minStockLevel, 1),
      }));
    return { success: true, items: lowStock };
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return { success: false, error: 'خطا در دریافت کالاهای رو به اتمام' };
  }
}

/** Purchase-price history for one inventory item, across all suppliers/orders, newest first. */
export async function getItemPriceHistory(inventoryItemId: string) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const lines = await prisma.purchaseOrderItem.findMany({
      where: { inventoryItemId },
      include: { purchaseOrder: { include: { supplier: true } } },
      orderBy: { purchaseOrder: { createdAt: 'desc' } },
    });
    return { success: true, lines };
  } catch (error) {
    console.error('Error fetching item price history:', error);
    return { success: false, error: 'خطا در دریافت تاریخچه قیمت خرید' };
  }
}
