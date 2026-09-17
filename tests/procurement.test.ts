import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

describe('مدیریت خرید و تأمین‌کنندگان (چرخه کامل سفارش خرید)', () => {
  let admin: TestClient;
  let supplierId: string;
  let inventoryItemId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const supplierRes = await admin.call('createSupplier', {
      name: `تأمین‌کننده تستی ${rand()}`,
      contactName: 'آقای تستی',
      phone: '02100000000',
    });
    expect(supplierRes.success).toBe(true);
    supplierId = supplierRes.supplier.id;

    const itemRes = await admin.call('createInventoryItem', {
      name: `کالای تستی خرید ${rand()}`,
      category: 'مواد خام',
      unit: 'کیلوگرم',
      currentStock: 2,
      minStockLevel: 10,
    });
    expect(itemRes.success).toBe(true);
    inventoryItemId = itemRes.item.id;
  });

  it('کالای زیر نقطه سفارش در فهرست «رو به اتمام» با پیشنهاد خرید ظاهر می‌شود', async () => {
    const res = await admin.call('getLowStockItems');
    expect(res.success).toBe(true);
    const found = res.items.find((i: any) => i.id === inventoryItemId);
    expect(found).toBeTruthy();
    expect(found.suggestedQuantity).toBeGreaterThan(0);
  });

  let purchaseOrderId: string;
  let purchaseOrderItemId: string;
  const unitCost = 25000;
  const quantityOrdered = 20;

  it('سفارش خرید جدید در وضعیت پیش‌نویس با مبلغ کل درست ساخته می‌شود', async () => {
    const res = await admin.call('createPurchaseOrder', {
      supplierId,
      items: [{ inventoryItemId, quantity: quantityOrdered, unitCost }],
      notes: 'سفارش تستی',
    });
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('DRAFT');
    expect(res.order.totalAmount).toBe(quantityOrdered * unitCost);

    purchaseOrderId = res.order.id;
    purchaseOrderItemId = res.order.items[0].id;
  });

  it('قبل از ثبت سفارش (هنوز پیش‌نویس)، ثبت ورود کالا رد می‌شود', async () => {
    const res = await admin.call('receivePurchaseOrderItems', purchaseOrderId, [
      { purchaseOrderItemId, quantity: 5 },
    ]);
    expect(res.success).toBe(false);
  });

  it('سفارش پیش‌نویس به «ثبت‌شده نزد تأمین‌کننده» تغییر وضعیت می‌دهد', async () => {
    const res = await admin.call('markPurchaseOrderOrdered', purchaseOrderId);
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('ORDERED');
  });

  it('دریافت جزئی کالا: موجودی انبار، قیمت تمام‌شده، هزینه حسابداری و بدهی تأمین‌کننده به‌درستی به‌روز می‌شود', async () => {
    const partialQty = 12;

    const beforeItems = await admin.call('getInventoryItems');
    const beforeItem = beforeItems.items.find((i: any) => i.id === inventoryItemId);
    const beforeTx = await admin.call('getTransactions');
    const beforeExpenseCount = beforeTx.transactions.filter((t: any) => t.type === 'EXPENSE').length;

    const res = await admin.call('receivePurchaseOrderItems', purchaseOrderId, [
      { purchaseOrderItemId, quantity: partialQty },
    ]);
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('PARTIALLY_RECEIVED');
    expect(res.order.items[0].quantityReceived).toBe(partialQty);

    const afterItems = await admin.call('getInventoryItems');
    const afterItem = afterItems.items.find((i: any) => i.id === inventoryItemId);
    expect(afterItem.currentStock).toBe(beforeItem.currentStock + partialQty);
    expect(afterItem.costPerUnit).toBe(unitCost);

    const afterTx = await admin.call('getTransactions');
    const expenseTxs = afterTx.transactions.filter((t: any) => t.type === 'EXPENSE');
    expect(expenseTxs.length).toBe(beforeExpenseCount + 1);
    expect(expenseTxs[0].amount).toBe(partialQty * unitCost);

    const supplierRes = await admin.call('getSupplierLedger', supplierId);
    expect(supplierRes.success).toBe(true);
    expect(supplierRes.supplier.balanceOwed).toBe(partialQty * unitCost);
  });

  it('دریافت باقی‌مانده کالا: سفارش کامل می‌شود و مقدار بیشتر از سفارش هرگز پذیرفته نمی‌شود', async () => {
    const remaining = quantityOrdered - 12; // 8 باقی‌مانده از سفارش اول

    // درخواست دریافتِ بیش از باقی‌مانده (اشتباه عمدی) باید فقط به اندازه‌ی
    // واقعیِ باقی‌مانده اعمال شود، نه بیشتر.
    const res = await admin.call('receivePurchaseOrderItems', purchaseOrderId, [
      { purchaseOrderItemId, quantity: remaining + 100 },
    ]);
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('RECEIVED');
    expect(res.order.receivedAt).toBeTruthy();
    expect(res.order.items[0].quantityReceived).toBe(quantityOrdered);

    const supplierRes = await admin.call('getSupplierLedger', supplierId);
    expect(supplierRes.supplier.balanceOwed).toBe(quantityOrdered * unitCost);
  });

  it('سفارش کاملاً دریافت‌شده دیگر قابل لغو نیست', async () => {
    const res = await admin.call('cancelPurchaseOrder', purchaseOrderId);
    expect(res.success).toBe(false);
  });

  it('ثبت پرداخت به تأمین‌کننده، مانده بدهی را کاهش می‌دهد', async () => {
    const before = await admin.call('getSupplierLedger', supplierId);
    const balanceBefore = before.supplier.balanceOwed;

    const paymentAmount = Math.floor(balanceBefore / 2);
    const res = await admin.call('recordSupplierPayment', {
      supplierId,
      amount: paymentAmount,
      method: 'نقدی',
    });
    expect(res.success).toBe(true);

    const after = await admin.call('getSupplierLedger', supplierId);
    expect(after.supplier.balanceOwed).toBe(balanceBefore - paymentAmount);
  });

  it('تاریخچه قیمت خرید این کالا، سفارش ثبت‌شده را با قیمت درست نشان می‌دهد', async () => {
    const res = await admin.call('getItemPriceHistory', inventoryItemId);
    expect(res.success).toBe(true);
    const line = res.lines.find((l: any) => l.purchaseOrderId === purchaseOrderId);
    expect(line).toBeTruthy();
    expect(line.unitCost).toBe(unitCost);
    expect(line.purchaseOrder.supplier.id).toBe(supplierId);
  });

  it('سفارش خریدی که هنوز چیزی از آن دریافت نشده، قابل لغو است', async () => {
    const createRes = await admin.call('createPurchaseOrder', {
      supplierId,
      items: [{ inventoryItemId, quantity: 5, unitCost }],
    });
    expect(createRes.success).toBe(true);

    const cancelRes = await admin.call('cancelPurchaseOrder', createRes.order.id);
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.order.status).toBe('CANCELLED');
  });
});
