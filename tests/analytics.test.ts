import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

/**
 * نکته‌ی مهم درباره‌ی ایزوله‌سازی این تست‌ها: چون tests/order.test.ts،
 * tests/branches.test.ts و tests/kitchen.test.ts هم به‌صورت موازی روی همان
 * شعبه‌ی پیش‌فرض سفارش می‌سازند، هر جمع مطلقی که روی «همه‌ی سفارش‌های شعبه‌ی
 * پیش‌فرض» حساب شود می‌تواند ناپایدار (flaky) باشد. برای همین تقریباً همه‌ی
 * آزمون‌های این فایل را روی یک شعبه‌ی کاملاً تازه و اختصاصی (branchB) که فقط
 * همین فایل به آن سفارش می‌دهد اجرا می‌کنیم؛ همین باعث می‌شود جمع‌های مطلق هم
 * (نه فقط دلتا) قابل‌اتکا باشند.
 */
describe('گزارش‌گیری و تحلیل فروش (فاز ۹)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;
  let chefOnly: TestClient;
  let branchBAccountant: TestClient;
  let branchBId: string;
  let defaultBranchId: string;
  let menuItemId: string;
  let menuItemPrice: number;
  const today = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings'); // اطمینان از وجود ردیف تنظیمات پیش از ثبت سفارش

    const branchesRes = await admin.call('getBranches');
    expect(branchesRes.success).toBe(true);
    const defaultBranch = branchesRes.branches.find((b: any) => b.isDefault);
    expect(defaultBranch).toBeTruthy();
    defaultBranchId = defaultBranch.id;

    const branchRes = await admin.call('createBranch', {
      name: `شعبه تحلیل ${rand()}`,
      address: 'آدرس تستی',
      phone: '02100000000',
    });
    expect(branchRes.success).toBe(true);
    branchBId = branchRes.branch.id;

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تحلیل ${rand()}`,
      username: `cashier_an_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    expect((await cashierOnly.call('login', cashierUser.user.username, '123456')).success).toBe(true);

    const chefUser = await admin.call('createUser', {
      name: `آشپز تحلیل ${rand()}`,
      username: `chef_an_${rand()}`,
      password: '123456',
      roles: ['CHEF'],
    });
    expect(chefUser.success).toBe(true);
    chefOnly = new TestClient();
    expect((await chefOnly.call('login', chefUser.user.username, '123456')).success).toBe(true);

    const accountantB = await admin.call('createUser', {
      name: `حسابدار شعبه ب تحلیل ${rand()}`,
      username: `acct_an_b_${rand()}`,
      password: '123456',
      roles: ['ACCOUNTANT', 'CASHIER'],
      branchId: branchBId,
    });
    expect(accountantB.success).toBe(true);
    expect(accountantB.user.branchId).toBe(branchBId);
    branchBAccountant = new TestClient();
    expect((await branchBAccountant.call('login', accountantB.user.username, '123456')).success).toBe(true);

    const menuRes = await admin.call('createMenuItem', {
      title: `آیتم تحلیل فروش ${rand()}`,
      price: 55000,
      category: 'تست',
      subCategory: '',
      imageUrl: '',
    });
    expect(menuRes.success).toBe(true);
    menuItemId = menuRes.item.id;
    menuItemPrice = menuRes.item.price;
  });

  describe('کنترل دسترسی', () => {
    it('CASHIER و CHEF اجازه‌ی دسترسی به گزارش‌های تحلیلی را ندارند', async () => {
      expect((await cashierOnly.call('getSalesAnalytics')).success).toBe(false);
      expect((await chefOnly.call('getSalesAnalytics')).success).toBe(false);
    });

    it('ADMIN و ACCOUNTANT به گزارش‌های تحلیلی دسترسی دارند', async () => {
      expect((await admin.call('getSalesAnalytics')).success).toBe(true);
      expect((await branchBAccountant.call('getSalesAnalytics')).success).toBe(true);
    });
  });

  describe('بازه‌ی زمانی پیش‌فرض', () => {
    it('بدون فیلتر، بازه‌ی پیش‌فرض دقیقاً ۳۰ روز اخیر است', async () => {
      const res = await admin.call('getSalesAnalytics');
      expect(res.success).toBe(true);
      const from = new Date(res.periodFrom);
      const to = new Date(res.periodTo);
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });
  });

  describe('«فروش واقعی» و صحت محاسبات (روی شعبه‌ی ایزوله‌ی تست)', () => {
    // نکته: چون هر فیلتر شعبه‌ای طبق طراحی فاز ۵ سفارش‌های آنلاینِ بدون شعبه
    // (branchId=null) را هم نشان می‌دهد (همان قاعده‌ی به‌کاررفته در order.ts و
    // accounting.ts)، totalOrders/totalReveune کلی ممکن است شامل داده‌ی سایر
    // فایل‌های تست هم باشد. برای همین اینجا فقط سطل مخصوص خودِ branchB را
    // می‌سنجیم، نه جمع‌های کلی را.
    it('شعبه‌ی تازه در ابتدا هیچ سطل فروشی در گزارش ندارد', async () => {
      const res = await branchBAccountant.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      expect(res.success).toBe(true);
      const bucket = res.revenueByBranch.find((b: any) => b.branchId === branchBId);
      expect(bucket).toBeUndefined();
    });

    it('سفارش لغوشده در جمع فروش لحاظ نمی‌شود', async () => {
      const orderRes = await branchBAccountant.call('createOrder', [{ menuItemId, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.branchId).toBe(branchBId);

      const cancelRes = await admin.call('updateOrderStatus', orderRes.order.id, 'CANCELLED');
      expect(cancelRes.success).toBe(true);

      const res = await branchBAccountant.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      const bucket = res.revenueByBranch.find((b: any) => b.branchId === branchBId);
      expect(bucket).toBeUndefined();
    });

    it('سفارش PENDING به‌عنوان فروش واقعی با تفکیک درست آیتم/شعبه/ساعت/کانال شمرده می‌شود', async () => {
      // جمع‌های سراسری (ساعت/کانال/روند روزانه) ممکن است شامل سفارش‌های آنلاینِ
      // بدون شعبه‌ی سایر فایل‌های تست هم باشند؛ برای اینکه این تست به آن‌ها
      // حساس نباشد، همه‌جا دلتای قبل/بعدِ همین یک سفارش را می‌سنجیم.
      const before = await branchBAccountant.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      expect(before.success).toBe(true);
      const currentHour = new Date().getHours();
      const beforeHourCount = before.ordersByHour.find((h: any) => h.hour === currentHour)?.count ?? 0;
      const beforeChannel = before.ordersByChannel.find((c: any) => c.channel === 'DINE_IN');
      const beforeChannelCount = beforeChannel?.count ?? 0;
      const beforeChannelRevenue = beforeChannel?.revenue ?? 0;
      const beforeDayOrders = before.revenueByDay.find((d: any) => d.date === today)?.orders ?? 0;

      const orderRes = await branchBAccountant.call('createOrder', [{ menuItemId, quantity: 3 }]);
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.status).toBe('PENDING');

      const res = await branchBAccountant.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      expect(res.success).toBe(true);

      // شعبه: سطل branchB (که فقط همین فایل به آن سفارش می‌دهد) دقیقاً همین یک سفارش را نشان می‌دهد
      const branchBucket = res.revenueByBranch.find((b: any) => b.branchId === branchBId);
      expect(branchBucket).toBeTruthy();
      expect(branchBucket.orders).toBe(1);
      expect(branchBucket.revenue).toBeCloseTo(orderRes.order.totalAmount, 5);

      // آیتم منو: چون این آیتم فقط در همین فایل ساخته و سفارش داده شده، عدد دقیق است
      const topEntry = res.topMenuItems.find((i: any) => i.menuItemId === menuItemId);
      expect(topEntry).toBeTruthy();
      expect(topEntry.quantitySold).toBe(3);
      expect(topEntry.revenue).toBeCloseTo(menuItemPrice * 3, 5);
      // توجه: چون bottomMenuItems فقط ۱۰ آیتمِ کم‌فروش‌ترین را نشان می‌دهد و ممکن
      // است سفارش‌های آنلاینِ بدون‌شعبه‌ی سایر فایل‌های تست (که طبق قاعده‌ی
      // فاز ۵ در این گزارش هم دیده می‌شوند) با آیتم‌های دیگر آن لیست را پر کرده
      // باشند، اینجا فقط در صورت حضور، درستی مقدارش را می‌سنجیم؛ حضورش را
      // اجباری نمی‌کنیم.
      const bottomEntry = res.bottomMenuItems.find((i: any) => i.menuItemId === menuItemId);
      if (bottomEntry) {
        expect(bottomEntry.quantitySold).toBe(3);
      }

      // کانال فروش: سفارش صندوق باید زیر DINE_IN شمرده شود (سنجش با دلتا)
      const afterChannel = res.ordersByChannel.find((c: any) => c.channel === 'DINE_IN');
      expect(afterChannel).toBeTruthy();
      expect(afterChannel.count - beforeChannelCount).toBe(1);
      expect(afterChannel.revenue - beforeChannelRevenue).toBeCloseTo(orderRes.order.totalAmount, 5);

      // ساعت پرمشتری: باید در سطل ساعت جاری بیفتد (سنجش با دلتا)
      const afterHourCount = res.ordersByHour.find((h: any) => h.hour === currentHour)?.count ?? 0;
      expect(afterHourCount - beforeHourCount).toBe(1);

      // روند روزانه: امروز باید دقیقاً یک سفارش بیشتر از قبل داشته باشد
      const afterDayOrders = res.revenueByDay.find((d: any) => d.date === today)?.orders ?? 0;
      expect(afterDayOrders - beforeDayOrders).toBe(1);

      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
    });
  });

  describe('فیلتر صریح بازه‌ی زمانی', () => {
    it('بازه‌ی تاریخی که سفارش را در بر نمی‌گیرد، آن را از گزارش حذف می‌کند', async () => {
      const oldRange = await branchBAccountant.call('getSalesAnalytics', {
        dateFrom: '2000-01-01',
        dateTo: '2000-01-02',
      });
      expect(oldRange.success).toBe(true);
      expect(oldRange.totalOrders).toBe(0);

      const todayRange = await branchBAccountant.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      expect(todayRange.success).toBe(true);
      expect(todayRange.totalOrders).toBeGreaterThan(0);
    });
  });

  describe('تفکیک شعبه‌ای دسترسی', () => {
    // نکته: هر فیلتر شعبه‌ای طبق طراحی فاز ۵ سفارش‌های آنلاینِ بدون شعبه
    // (branchId=null) را هم نشان می‌دهد؛ پس «فقط شعبه‌ی خودش» یعنی هیچ شعبه‌ی
    // واقعی دیگری (غیر از branchB و سطل آنلاینِ بدون‌شعبه) دیده نشود.
    it('حسابدار شعبه‌ی ب همیشه فقط داده‌ی شعبه‌ی خودش (و سفارش‌های آنلاینِ بدون‌شعبه) را می‌بیند', async () => {
      const res = await branchBAccountant.call('getSalesAnalytics');
      expect(res.success).toBe(true);
      expect(res.revenueByBranch.every((b: any) => b.branchId === branchBId || b.branchId === null)).toBe(true);
    });

    it('حسابدار شعبه‌ی ب نمی‌تواند با فرستادن branchId دلخواه داده‌ی شعبه‌ی دیگری را ببیند', async () => {
      const res = await branchBAccountant.call('getSalesAnalytics', { branchId: defaultBranchId });
      expect(res.success).toBe(true);
      expect(res.revenueByBranch.every((b: any) => b.branchId === branchBId || b.branchId === null)).toBe(true);
    });

    it('ادمین با فیلتر صریح شعبه‌ی ب فقط همان شعبه (و سفارش‌های آنلاینِ بدون‌شعبه) را می‌بیند', async () => {
      const res = await admin.call('getSalesAnalytics', { dateFrom: today, dateTo: today, branchId: branchBId });
      expect(res.success).toBe(true);
      expect(res.revenueByBranch.some((b: any) => b.branchId === branchBId)).toBe(true);
      expect(res.revenueByBranch.every((b: any) => b.branchId === branchBId || b.branchId === null)).toBe(true);
    });

    it('ادمین بدون فیلتر شعبه، شعبه‌ی ب را هم در کنار سایر شعبه‌ها می‌بیند', async () => {
      const res = await admin.call('getSalesAnalytics', { dateFrom: today, dateTo: today });
      expect(res.success).toBe(true);
      const branchIds = res.revenueByBranch.map((b: any) => b.branchId);
      expect(branchIds).toContain(branchBId);
    });
  });
});
