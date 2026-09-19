import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';
import { pointsForAmount } from '../src/lib/loyalty';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

const SYSTEM_CATEGORY_IDS = {
  EXPENSE_REFUND: 'txcat-expense-refund',
};

async function makeMenuItem(admin: TestClient, price: number) {
  const res = await admin.call('createMenuItem', {
    title: `قلم تستی مرجوعی ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(res.success).toBe(true);
  return res.item as { id: string; title: string; price: number };
}

async function completeOrder(admin: TestClient, orderId: string) {
  const res = await admin.call('updateOrderStatus', orderId, 'COMPLETED');
  expect(res.success).toBe(true);
}

describe('مرجوعی و استرداد سفارش (فاز ۱۰)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings'); // اطمینان از وجود ردیف تنظیمات

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی مرجوعی ${rand()}`,
      username: `cashier_refund_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی: فقط ADMIN', () => {
    it('CASHIER به findOrderForRefund/createRefund/getRefunds دسترسی ندارد', async () => {
      const item = await makeMenuItem(admin, 50000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      expect((await cashierOnly.call('findOrderForRefund', orderRes.order.orderNumber)).success).toBe(false);
      expect(
        (await cashierOnly.call('createRefund', { orderId: orderRes.order.id, isFullRefund: true, reason: 'تست' }))
          .success
      ).toBe(false);
      expect((await cashierOnly.call('getRefunds')).success).toBe(false);
    });
  });

  describe('واجد شرایط بودن سفارش', () => {
    it('سفارشی که هنوز COMPLETED نشده قابل مرجوع‌شدن نیست', async () => {
      const item = await makeMenuItem(admin, 50000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const findRes = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(findRes.success).toBe(false);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تست',
      });
      expect(refundRes.success).toBe(false);

      // پاک‌سازی برای این‌که این سفارش باز روی تست‌های بعدی اثر نگذارد
      await completeOrder(admin, orderRes.order.id);
    });
  });

  describe('مرجوعی کامل و اتصال به حسابداری', () => {
    it('مرجوعی کامل مبلغ کل سفارش را برمی‌گرداند و دیگر مرجوع‌پذیر نیست', async () => {
      const item = await makeMenuItem(admin, 80000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 2 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(found.success).toBe(true);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'نارضایتی مشتری',
      });
      expect(refundRes.success).toBe(true);
      expect(refundRes.refund.isFullRefund).toBe(true);
      expect(refundRes.refund.totalAmount).toBeCloseTo(orderRes.order.totalAmount, 0);

      // دیگر چیزی برای مرجوع کردن نمانده
      const secondFind = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(secondFind.success).toBe(false);

      const secondRefund = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تلاش دوم',
      });
      expect(secondRefund.success).toBe(false);
    });

    it('یک تراکنش EXPENSE با دسته‌ی سیستمی مرجوعی می‌سازد و تراکنش INCOME اصلی را دست‌نخورده می‌گذارد', async () => {
      const item = await makeMenuItem(admin, 60000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'اشتباه در سفارش',
      });
      expect(refundRes.success).toBe(true);

      const txRes = await admin.call('getTransactions', {});
      expect(txRes.success).toBe(true);

      const incomeTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'ORDER' && t.referenceId === orderRes.order.id
      );
      expect(incomeTx).toBeTruthy();
      expect(incomeTx.type).toBe('INCOME');
      expect(incomeTx.amount).toBe(orderRes.order.totalAmount);

      const refundTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'REFUND' && t.referenceId === refundRes.refund.id
      );
      expect(refundTx).toBeTruthy();
      expect(refundTx.type).toBe('EXPENSE');
      expect(refundTx.category.id).toBe(SYSTEM_CATEGORY_IDS.EXPENSE_REFUND);
      expect(refundTx.amount).toBeCloseTo(refundRes.refund.totalAmount, 0);
      expect(refundTx.taxAmount).toBeCloseTo(refundRes.refund.taxAmount, 0);
    });

    it('فاز ۱۹: تراکنش EXPENSE مرجوعی به همان حساب جریان‌نقدیِ تراکنش INCOME اصلی سفارش وصل می‌شود', async () => {
      const item = await makeMenuItem(admin, 45000);
      // پرداخت با کارت، تا تراکنش INCOME به حساب «بانک» (نه پیش‌فرض «صندوق نقد») وصل شود
      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: item.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        undefined,
        'CARD'
      );
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تست اتصال حساب',
      });
      expect(refundRes.success).toBe(true);

      const txRes = await admin.call('getTransactions', {});
      expect(txRes.success).toBe(true);

      const incomeTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'ORDER' && t.referenceId === orderRes.order.id
      );
      const refundTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'REFUND' && t.referenceId === refundRes.refund.id
      );
      expect(incomeTx.accountId).toBe('txacc-bank');
      expect(refundTx.accountId).toBe('txacc-bank');
      expect(refundTx.accountId).toBe(incomeTx.accountId);
    });
  });

  describe('مرجوعی جزئی: تسهیم تناسبی مالیات و جلوگیری از مرجوعی بیش از حد', () => {
    it('مالیات مرجوعی جزئی متناسب با سهم قلم مرجوع‌شده از کل اقلام سفارش است', async () => {
      const itemA = await makeMenuItem(admin, 100000);
      const itemB = await makeMenuItem(admin, 50000);
      const orderRes = await admin.call('createOrder', [
        { menuItemId: itemA.id, quantity: 1 },
        { menuItemId: itemB.id, quantity: 1 },
      ]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(found.success).toBe(true);
      const lineA = found.order.items.find((i: any) => i.menuItem.id === itemA.id);
      expect(lineA).toBeTruthy();

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: lineA.id, quantity: 1 }],
        reason: 'یک قلم اشتباه بود',
      });
      expect(refundRes.success).toBe(true);

      const expectedTax = Math.round(orderRes.order.taxAmount * (100000 / 150000));
      expect(refundRes.refund.taxAmount).toBeCloseTo(expectedTax, 0);
      // مرجوعی جزئی هیچ بسته‌بندی‌ای برنمی‌گرداند، پس subtotalAmount دقیقاً
      // برابر مبلغ خودِ قلم مرجوع‌شده است.
      expect(refundRes.refund.subtotalAmount).toBe(100000);

      // سفارش هنوز به‌طور کامل مرجوع نشده (قلم B باقی مانده)
      const secondFind = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(secondFind.success).toBe(true);
      const remainingA = secondFind.order.items.find((i: any) => i.id === lineA.id);
      expect(remainingA.quantity - remainingA.refundedQuantity).toBe(0);
    });

    it('درخواست مرجوعی بیش از مانده‌ی یک قلم رد می‌شود', async () => {
      const item = await makeMenuItem(admin, 40000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      const line = found.order.items[0];

      const res = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: line.id, quantity: 2 }],
        reason: 'بیش از حد',
      });
      expect(res.success).toBe(false);
    });

    it('شناسه‌ی قلم نامعتبر رد می‌شود', async () => {
      const item = await makeMenuItem(admin, 40000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const res = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: 'non-existent-order-item', quantity: 1 }],
        reason: 'نامعتبر',
      });
      expect(res.success).toBe(false);
    });

    it('مرجوعی جزئی بدون هیچ قلمی رد می‌شود', async () => {
      const item = await makeMenuItem(admin, 40000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const res = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [],
        reason: 'خالی',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('بازگشت موجودی انبار', () => {
    it('مرجوعی جزئی و سپس کامل، دقیقاً به‌اندازه‌ی تعداد مرجوع‌شده موجودی را برمی‌گرداند', async () => {
      const invRes = await admin.call('createInventoryItem', {
        name: `ماده‌ی تستی مرجوعی ${rand()}`,
        category: 'تست',
        unit: 'عدد',
        currentStock: 100,
        minStockLevel: 5,
      });
      expect(invRes.success).toBe(true);
      const inventoryItemId = invRes.item.id;

      const menuItem = await makeMenuItem(admin, 30000);
      const recipeRes = await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId, quantity: 2 },
      ]);
      expect(recipeRes.success).toBe(true);

      const readStock = async () => {
        const listRes = await admin.call('getInventoryItems');
        expect(listRes.success).toBe(true);
        const row = listRes.items.find((i: any) => i.id === inventoryItemId);
        expect(row).toBeTruthy();
        return row.currentStock as number;
      };

      const stockAfterCreate0 = await readStock();
      expect(stockAfterCreate0).toBe(100);

      const orderRes = await admin.call('createOrder', [{ menuItemId: menuItem.id, quantity: 3 }]);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      // ۳ عدد سفارش × ۲ واحد فرمول = ۶ واحد کسر شده
      expect(await readStock()).toBe(94);

      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      const line = found.order.items[0];

      const partialRefund = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: line.id, quantity: 1 }],
        reason: 'یک واحد ناقص بود',
      });
      expect(partialRefund.success).toBe(true);
      // ۱ عدد مرجوعی × ۲ واحد = ۲ واحد برگشت
      expect(await readStock()).toBe(96);

      const fullRefund = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'بقیه هم مرجوع شود',
      });
      expect(fullRefund.success).toBe(true);
      // ۲ عدد باقی‌مانده × ۲ واحد = ۴ واحد دیگر برگشت؛ جمعاً موجودی به حالت اول برمی‌گردد
      expect(await readStock()).toBe(100);
    });
  });

  describe('برگشت امتیاز و آمار مشتری', () => {
    it('مرجوعی کامل، امتیاز/مبلغ‌خرج‌شده/تعداد سفارش مشتری را دقیقاً به حالت قبل برمی‌گرداند', async () => {
      const customerRes = await admin.call('createCustomer', {
        fullName: `مشتری تستی مرجوعی ${rand()}`,
        phone: `09${rand()}`,
      });
      expect(customerRes.success).toBe(true);
      const customerId = customerRes.customer.id;

      const settingsRes = await admin.call('getSettings');
      const rate = settingsRes.settings.loyaltyPointsPerTenThousand;

      const item = await makeMenuItem(admin, 1000000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }], customerId);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const expectedPoints = pointsForAmount(orderRes.order.totalAmount, rate);
      expect(expectedPoints).toBeGreaterThan(0);

      // تأیید رفع نقص: Order.pointsEarned برای سفارش POS هم اکنون درست ذخیره می‌شود
      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(found.success).toBe(true);
      expect(found.order.pointsEarned).toBe(expectedPoints);

      const beforeDetail = await admin.call('getCustomerDetail', customerId);
      expect(beforeDetail.customer.totalOrders).toBe(1);
      expect(beforeDetail.customer.pointsBalance).toBe(expectedPoints);
      expect(beforeDetail.customer.totalSpent).toBe(orderRes.order.totalAmount);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'انصراف کامل مشتری',
      });
      expect(refundRes.success).toBe(true);

      const afterDetail = await admin.call('getCustomerDetail', customerId);
      expect(afterDetail.customer.totalOrders).toBe(0);
      expect(afterDetail.customer.pointsBalance).toBe(0);
      expect(afterDetail.customer.totalSpent).toBe(0);
      expect(afterDetail.customer.loyaltyTier).toBe('NORMAL');

      const adjustedTx = afterDetail.customer.loyaltyTransactions.find(
        (t: any) => t.type === 'ADJUSTED' && t.orderId === orderRes.order.id
      );
      expect(adjustedTx).toBeTruthy();
      expect(adjustedTx.points).toBe(-expectedPoints);
    });

    it('مرجوعی جزئی totalOrders را کم نمی‌کند (فقط مرجوعی کامل این کار را می‌کند)', async () => {
      const customerRes = await admin.call('createCustomer', {
        fullName: `مشتری تستی مرجوعی جزئی ${rand()}`,
        phone: `09${rand()}`,
      });
      expect(customerRes.success).toBe(true);
      const customerId = customerRes.customer.id;

      const item = await makeMenuItem(admin, 200000);
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 2 }], customerId);
      expect(orderRes.success).toBe(true);
      await completeOrder(admin, orderRes.order.id);

      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      const line = found.order.items[0];

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: line.id, quantity: 1 }],
        reason: 'مرجوعی جزئی',
      });
      expect(refundRes.success).toBe(true);

      const afterDetail = await admin.call('getCustomerDetail', customerId);
      expect(afterDetail.customer.totalOrders).toBe(1);
    });
  });
});
