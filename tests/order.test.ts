import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

describe('سفارش‌ها: صحت قیمت و چرخه آشپزخانه', () => {
  let admin: TestClient;
  let menuItemId: string;
  let menuItemPrice: number;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const items = await admin.call('getMenuItems');
    if (Array.isArray(items) && items.length > 0) {
      menuItemId = items[0].id;
      menuItemPrice = items[0].price;
    } else {
      const created = await admin.call('createMenuItem', {
        title: 'آیتم تستی ویتست',
        price: 123000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(created.success).toBe(true);
      menuItemId = created.item.id;
      menuItemPrice = created.item.price;
    }
  });

  it('مبلغ سفارش از قیمت واقعی سرور محاسبه می‌شود، نه از ورودی کلاینت', async () => {
    const res = await admin.call('createOrder', [{ menuItemId, quantity: 2 }]);
    expect(res.success).toBe(true);

    const settings = await admin.call('getSettings');
    const taxPercentage = settings.settings.taxPercentage;
    const packagingCost = settings.settings.packagingCost;
    const expectedSubtotal = menuItemPrice * 2;
    const expectedTotal = expectedSubtotal + Math.round((expectedSubtotal * taxPercentage) / 100) + packagingCost;

    expect(res.order.totalAmount).toBe(expectedTotal);

    // پاکسازی
    await admin.call('updateOrderStatus', res.order.id, 'COMPLETED');
  });

  it('سفارش در لیست سفارش‌های فعال ظاهر می‌شود و بعد از تکمیل حذف می‌شود', async () => {
    const createRes = await admin.call('createOrder', [{ menuItemId, quantity: 1 }]);
    expect(createRes.success).toBe(true);
    const orderId = createRes.order.id;

    const activeBefore = await admin.call('getActiveOrders');
    expect(activeBefore.success).toBe(true);
    expect(activeBefore.orders.some((o: any) => o.id === orderId)).toBe(true);

    const advance1 = await admin.call('updateOrderStatus', orderId, 'PREPARING');
    expect(advance1.success).toBe(true);
    const advance2 = await admin.call('updateOrderStatus', orderId, 'READY');
    expect(advance2.success).toBe(true);
    const advance3 = await admin.call('updateOrderStatus', orderId, 'COMPLETED');
    expect(advance3.success).toBe(true);

    const activeAfter = await admin.call('getActiveOrders');
    expect(activeAfter.orders.some((o: any) => o.id === orderId)).toBe(false);
  });
});
