import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

describe('صفحه‌نمایش آشپزخانه و مسیرینگ چند‌ایستگاهی (فاز ۸)', () => {
  let admin: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings');
  });

  describe('تعریف ایستگاه آشپزخانه روی آیتم‌های منو', () => {
    it('ساخت آیتم منو با ایستگاه مشخص، همان ایستگاه را ذخیره می‌کند', async () => {
      const res = await admin.call('createMenuItem', {
        title: `کباب تستی KDS ${rand()}`,
        price: 200000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'گریل',
      });
      expect(res.success).toBe(true);
      expect(res.item.kitchenStation).toBe('گریل');
    });

    it('ساخت آیتم منو بدون ایستگاه، مقدار خالی (null) ذخیره می‌کند', async () => {
      const res = await admin.call('createMenuItem', {
        title: `نوشیدنی تستی KDS ${rand()}`,
        price: 30000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(res.success).toBe(true);
      expect(res.item.kitchenStation).toBeFalsy();
    });

    it('ایستگاهِ فقط فاصله‌خالی هم به null نرمال می‌شود', async () => {
      const res = await admin.call('createMenuItem', {
        title: `دسر تستی KDS ${rand()}`,
        price: 50000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: '   ',
      });
      expect(res.success).toBe(true);
      expect(res.item.kitchenStation).toBeFalsy();
    });

    it('ویرایش آیتم می‌تواند ایستگاه آن را تغییر دهد', async () => {
      const created = await admin.call('createMenuItem', {
        title: `سالاد تستی KDS ${rand()}`,
        price: 60000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'سرد',
      });
      expect(created.success).toBe(true);

      const updated = await admin.call('updateMenuItem', created.item.id, {
        title: created.item.title,
        price: created.item.price,
        category: created.item.category,
        subCategory: created.item.subCategory || '',
        imageUrl: '',
        kitchenStation: 'دسر',
      });
      expect(updated.success).toBe(true);
      expect(updated.item.kitchenStation).toBe('دسر');
    });

    it('کاربر غیرمدیر (CHEF) نمی‌تواند ایستگاه آیتم منو را تغییر دهد', async () => {
      const chefUsername = `test_chef_${rand()}`;
      const createUserRes = await admin.call('createUser', {
        name: 'سرآشپز تستی',
        username: chefUsername,
        password: 'test-pass-123',
        roles: ['CHEF'],
      });
      expect(createUserRes.success).toBe(true);

      const chef = new TestClient();
      const loginRes = await chef.call('login', chefUsername, 'test-pass-123');
      expect(loginRes.success).toBe(true);

      const res = await chef.call('createMenuItem', {
        title: `آیتم غیرمجاز ${rand()}`,
        price: 10000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'گریل',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('مسیرینگ چند‌ایستگاهی روی تابلوی آشپزخانه', () => {
    it('سفارشی با آیتم‌های چند ایستگاه، هر آیتم را با ایستگاه درست خودش در getActiveOrders برمی‌گرداند', async () => {
      const grillItem = await admin.call('createMenuItem', {
        title: `آیتم گریل ${rand()}`,
        price: 150000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'گریل',
      });
      const dessertItem = await admin.call('createMenuItem', {
        title: `آیتم دسر ${rand()}`,
        price: 70000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'دسر',
      });
      const noStationItem = await admin.call('createMenuItem', {
        title: `آیتم بدون ایستگاه ${rand()}`,
        price: 20000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(grillItem.success && dessertItem.success && noStationItem.success).toBe(true);

      const orderRes = await admin.call('createOrder', [
        { menuItemId: grillItem.item.id, quantity: 1 },
        { menuItemId: dessertItem.item.id, quantity: 2 },
        { menuItemId: noStationItem.item.id, quantity: 1 },
      ]);
      expect(orderRes.success).toBe(true);

      const activeRes = await admin.call('getActiveOrders');
      expect(activeRes.success).toBe(true);
      const order = activeRes.orders.find((o: any) => o.id === orderRes.order.id);
      expect(order).toBeTruthy();

      const grillLine = order.items.find((i: any) => i.menuItemId === grillItem.item.id);
      const dessertLine = order.items.find((i: any) => i.menuItemId === dessertItem.item.id);
      const noStationLine = order.items.find((i: any) => i.menuItemId === noStationItem.item.id);

      expect(grillLine.menuItem.kitchenStation).toBe('گریل');
      expect(dessertLine.menuItem.kitchenStation).toBe('دسر');
      expect(dessertLine.quantity).toBe(2);
      expect(noStationLine.menuItem.kitchenStation).toBeFalsy();

      // پاکسازی
      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
    });

    it('کاربر CHEF همچنان می‌تواند سفارش‌های فعال را ببیند و وضعیت آن‌ها را تغییر دهد (بدون تغییر در مدل دسترسی)', async () => {
      const chefUsername = `test_chef2_${rand()}`;
      const createUserRes = await admin.call('createUser', {
        name: 'سرآشپز تستی دوم',
        username: chefUsername,
        password: 'test-pass-123',
        roles: ['CHEF'],
      });
      expect(createUserRes.success).toBe(true);

      const chef = new TestClient();
      await chef.call('login', chefUsername, 'test-pass-123');

      const item = await admin.call('createMenuItem', {
        title: `آیتم برای چف ${rand()}`,
        price: 40000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
        kitchenStation: 'گریل',
      });
      const orderRes = await admin.call('createOrder', [{ menuItemId: item.item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const activeRes = await chef.call('getActiveOrders');
      expect(activeRes.success).toBe(true);
      expect(activeRes.orders.some((o: any) => o.id === orderRes.order.id)).toBe(true);

      const advanceRes = await chef.call('updateOrderStatus', orderRes.order.id, 'PREPARING');
      expect(advanceRes.success).toBe(true);

      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
    });
  });
});
