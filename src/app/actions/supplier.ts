"use server";

import { prisma } from '@/lib/prisma';
import { requireRole, resolveBranchFilter, resolveBranchForCreate, isBranchExempt } from '@/lib/auth';

const PROCUREMENT_ROLES = ['ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT'] as const;

export async function getSuppliers(branchId?: string) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    const suppliers = await prisma.supplier.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
      orderBy: { name: 'asc' },
      include: { branch: { select: { id: true, name: true } } },
    });
    return { success: true, suppliers };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { success: false, error: 'خطا در دریافت لیست تأمین‌کنندگان' };
  }
}

export async function createSupplier(data: {
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  branchId?: string;
}) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'نام تأمین‌کننده الزامی است' };
  }

  try {
    const branchId = resolveBranchForCreate(auth.user, data.branchId);
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactName: data.contactName?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        branchId,
      },
    });
    return { success: true, supplier };
  } catch (error) {
    console.error('Error creating supplier:', error);
    return { success: false, error: 'خطا در ثبت تأمین‌کننده' };
  }
}

export async function updateSupplier(id: string, data: {
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
}) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'نام تأمین‌کننده الزامی است' };
  }

  try {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'تأمین‌کننده یافت نشد' };
    if (!isBranchExempt(auth.user) && existing.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name.trim(),
        contactName: data.contactName?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
      },
    });
    return { success: true, supplier };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, error: 'خطا در ویرایش تأمین‌کننده' };
  }
}

export async function setSupplierActive(id: string, isActive: boolean) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'تأمین‌کننده یافت نشد' };
    if (!isBranchExempt(auth.user) && existing.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const supplier = await prisma.supplier.update({ where: { id }, data: { isActive } });
    return { success: true, supplier };
  } catch (error) {
    console.error('Error updating supplier status:', error);
    return { success: false, error: 'خطا در تغییر وضعیت تأمین‌کننده' };
  }
}

/**
 * Records a payment made to a supplier, reducing our outstanding balance
 * (accounts payable) with them. Does NOT book a new EXPENSE transaction:
 * the expense itself was already recognized at the moment the goods were
 * received (see receivePurchaseOrderItems in purchaseOrder.ts) — this only
 * settles the payable, which is a balance-sheet movement, not a second
 * cost. `purchaseOrderId` is optional context (which invoice/PO the
 * payment is against); the balance itself is tracked per-supplier, not
 * per-PO, since a single payment often covers several invoices at once.
 */
export async function recordSupplierPayment(data: {
  supplierId: string;
  amount: number;
  method?: string;
  note?: string;
  purchaseOrderId?: string;
}) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return { success: false, error: 'مبلغ پرداخت نامعتبر است' };
  }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) return { success: false, error: 'تأمین‌کننده یافت نشد' };
    if (!isBranchExempt(auth.user) && supplier.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const [payment] = await prisma.$transaction([
      prisma.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId || null,
          amount: data.amount,
          method: data.method?.trim() || '',
          note: data.note?.trim() || '',
        },
      }),
      prisma.supplier.update({
        where: { id: data.supplierId },
        data: { balanceOwed: { decrement: data.amount } },
      }),
    ]);
    return { success: true, payment };
  } catch (error) {
    console.error('Error recording supplier payment:', error);
    return { success: false, error: 'خطا در ثبت پرداخت' };
  }
}

/** Full ledger for one supplier: profile + purchase orders + payment history, for the accounts-payable view. */
export async function getSupplierLedger(supplierId: string) {
  const auth = await requireRole(...PROCUREMENT_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { inventoryItem: true } } },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) return { success: false, error: 'تأمین‌کننده یافت نشد' };
    if (!isBranchExempt(auth.user) && supplier.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }
    return { success: true, supplier };
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return { success: false, error: 'خطا در دریافت گردش حساب تأمین‌کننده' };
  }
}
