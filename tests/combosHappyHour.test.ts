import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';
import { isRuleActiveNow, ruleDiscountAmount, computeEffectivePrice } from '../src/lib/happyHour';

/**
 * فاز ۱۵: کمبو و قیمت‌گذاری زمان‌بندی‌شده (Combo Meals & Happy Hour) — هر دو
 * زیرامکان با هم، طبق پاسخ تأییدشده‌ی کاربر، با دسترسیِ مدیریتی فقط ADMIN
 * (مطابق مدل دسترسیِ فازهای ۱۳/۱۴).
 *
 * نکاتِ مهمِ این فایل:
 * - کمبو با الگویِ «آیتمِ منویِ سایه» پیاده شده: هر Combo یک MenuItem مخفی
 *   (isCombo=true) دارد که سبد خرید/POS/آشپزخانه/چاپگر/گزارش‌ها آن را مثلِ
 *   هر آیتمِ منویِ دیگری می‌بینند — نک. توضیحِ کاملِ این تصمیمِ معماری در
 *   schema.prisma بالای بخشِ فازِ ۱۵.
 * - Happy Hour هرگز رویِ کمبو اعمال نمی‌شود (کمبو خودش قیمتِ ثابتِ بسته
 *   دارد) و اصلاً امکانِ اتصالِ یک قانون به یک آیتمِ combo وجود ندارد.
 * - تست‌هایِ یکپارچه‌یِ Happy Hour از ساعتِ واقعیِ سرور (new Date()) استفاده
 *   می‌کنند تا نیازی به mock کردنِ زمان نباشد؛ بازه‌ی هر قانون طوری ساخته
 *   می‌شود که همین الان را دربر بگیرد یا عمداً دربر نگیرد.
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeMenuItem(admin: TestClient, price: number) {
  const res = await admin.call('createMenuItem', {
    title: `قلم تستی فاز۱۵ ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(res.success).toBe(true);
  return res.item as { id: string; title: string; price: number };
}

async function makeInventoryItem(admin: TestClient, currentStock = 100000) {
  const res = await admin.call('createInventoryItem', {
    name: `ماده تستی فاز۱۵ ${rand()}`,
    category: 'تست',
    unit: 'gram',
    currentStock,
    minStockLevel: 0,
  });
  expect(res.success).toBe(true);
  return res.item.id as string;
}

async function readStock(admin: TestClient, inventoryItemId: string) {
  const res = await admin.call('getInventoryItems');
  expect(res.success).toBe(true);
  const row = res.items.find((i: any) => i.id === inventoryItemId);
  return row.currentStock as number;
}

async function getTaxPackaging(admin: TestClient) {
  const res = await admin.call('getSettings');
  expect(res.success).toBe(true);
  return {
    taxPercentage: res.settings.taxPercentage as number,
    packagingCost: res.settings.packagingCost as number,
  };
}
describe('کمبو و Happy Hour (فاز ۱۵)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings'); // اطمینان از وجودِ ردیفِ تنظیمات پیش از هر سفارش (نک. توضیحِ order.test.ts)

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی فاز۱۵ ${rand()}`,
      username: `cashier_p15_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی: مدیریتِ کمبو و Happy Hour فقط ADMIN', () => {
    it('CASHIER به هیچ‌کدام از اکشن‌های مدیریتیِ کمبو/Happy Hour دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getCombos')).success).toBe(false);
      expect((await cashierOnly.call('getComboEligibleMenuItems')).success).toBe(false);
      expect((await cashierOnly.call('createCombo', { name: 'x', price: 1000, items: [] })).success).toBe(false);
      expect(
        (await cashierOnly.call('updateCombo', 'whatever', { name: 'x', price: 1000, items: [] })).success
      ).toBe(false);
      expect((await cashierOnly.call('deleteCombo', 'whatever')).success).toBe(false);

      expect((await cashierOnly.call('getHappyHourRules')).success).toBe(false);
      expect((await cashierOnly.call('getHappyHourEligibleMenuItems')).success).toBe(false);
      const dummyRuleInput = {
        name: 'x',
        discountType: 'PERCENT',
        value: 10,
        daysOfWeek: [0],
        startMinute: 0,
        endMinute: 60,
        menuItemIds: [],
      };
      expect((await cashierOnly.call('createHappyHourRule', dummyRuleInput)).success).toBe(false);
      expect((await cashierOnly.call('updateHappyHourRule', 'whatever', dummyRuleInput)).success).toBe(false);
      expect((await cashierOnly.call('deleteHappyHourRule', 'whatever')).success).toBe(false);
    });
  });

  describe('ساخت و اعتبارسنجیِ کمبو', () => {
    it('نامِ خالی، قیمتِ نامعتبر و کمبویِ بدونِ هیچ آیتمی رد می‌شوند', async () => {
      expect(
        (await admin.call('createCombo', { name: '', price: 1000, items: [{ menuItemId: 'x', quantity: 1 }] }))
          .success
      ).toBe(false);
      expect(
        (await admin.call('createCombo', { name: 'ترکیب', price: 0, items: [{ menuItemId: 'x', quantity: 1 }] }))
          .success
      ).toBe(false);
      expect((await admin.call('createCombo', { name: 'ترکیب', price: 1000, items: [] })).success).toBe(false);
    });

    it('کمبو نمی‌تواند شاملِ کمبویِ دیگری باشد (منعِ کمبو-در-کمبو)', async () => {
      const base = await makeMenuItem(admin, 20000);
      const innerCombo = await admin.call('createCombo', {
        name: `کمبویِ داخلی ${rand()}`,
        price: 15000,
        items: [{ menuItemId: base.id, quantity: 1 }],
      });
      expect(innerCombo.success).toBe(true);

      const outerCombo = await admin.call('createCombo', {
        name: `کمبویِ بیرونی ${rand()}`,
        price: 25000,
        items: [{ menuItemId: innerCombo.combo.menuItemId, quantity: 1 }],
      });
      expect(outerCombo.success).toBe(false);
    });

    it('کمبویِ معتبر یک آیتمِ منویِ سایه می‌سازد که در فهرستِ منو ظاهر می‌شود ولی از فهرستِ اجزای مجازِ کمبو حذف است', async () => {
      const item1 = await makeMenuItem(admin, 30000);
      const item2 = await makeMenuItem(admin, 15000);
      const comboName = `کمبویِ تستی ${rand()}`;
      const comboRes = await admin.call('createCombo', {
        name: comboName,
        price: 40000,
        kitchenStation: 'گریل',
        items: [
          { menuItemId: item1.id, quantity: 1 },
          { menuItemId: item2.id, quantity: 2 },
        ],
      });
      expect(comboRes.success).toBe(true);
      expect(comboRes.combo.menuItem.isCombo).toBe(true);
      expect(comboRes.combo.menuItem.price).toBe(40000);
      expect(comboRes.combo.menuItem.kitchenStation).toBe('گریل');

      const menuList = await admin.call('getMenuItems');
      const shadow = menuList.find((m: any) => m.id === comboRes.combo.menuItemId);
      expect(shadow).toBeTruthy();
      expect(shadow.title).toBe(comboName);

      const eligible = await admin.call('getComboEligibleMenuItems');
      expect(eligible.success).toBe(true);
      expect(eligible.items.some((i: any) => i.id === comboRes.combo.menuItemId)).toBe(false);
    });
  });

  describe('سفارشِ کمبو: قیمتِ بسته، مصرفِ موجودیِ اجزا، و عکسِ لحظه‌ایِ اجزا', () => {
    it('کمبو با قیمتِ ثابتِ بسته (نه مجموعِ اجزا) حساب می‌شود و موجودیِ هر جزء متناسب با تعدادش در کمبو کسر می‌شود', async () => {
      const inv1 = await makeInventoryItem(admin);
      const inv2 = await makeInventoryItem(admin);

      const item1 = await makeMenuItem(admin, 30000);
      const item2 = await makeMenuItem(admin, 15000);
      await admin.call('saveMenuItemRecipe', item1.id, [{ inventoryItemId: inv1, quantity: 3, yieldPercent: 100 }]);
      await admin.call('saveMenuItemRecipe', item2.id, [{ inventoryItemId: inv2, quantity: 2, yieldPercent: 100 }]);

      // قیمتِ بسته عمداً کمتر از مجموعِ قیمتِ اجزا (۱×۳۰۰۰۰ + ۲×۱۵۰۰۰ = ۶۰۰۰۰) انتخاب شده
      const comboPrice = 40000;
      const comboRes = await admin.call('createCombo', {
        name: `کمبویِ سفارش ${rand()}`,
        price: comboPrice,
        kitchenStation: 'گریل',
        items: [
          { menuItemId: item1.id, quantity: 1 },
          { menuItemId: item2.id, quantity: 2 },
        ],
      });
      expect(comboRes.success).toBe(true);

      const before1 = await readStock(admin, inv1);
      const before2 = await readStock(admin, inv2);
      const { taxPercentage, packagingCost } = await getTaxPackaging(admin);

      const quantityOrdered = 2;
      const orderRes = await admin.call('createOrder', [
        { menuItemId: comboRes.combo.menuItemId, quantity: quantityOrdered },
      ]);
      expect(orderRes.success).toBe(true);

      // قیمت: فقط قیمتِ بسته × تعداد، هرگز مجموعِ قیمتِ اجزا
      const expectedSubtotal = comboPrice * quantityOrdered;
      const expectedTax = Math.round((expectedSubtotal * taxPercentage) / 100);
      expect(orderRes.order.totalAmount).toBe(expectedSubtotal + expectedTax + packagingCost);

      // موجودی: هر واحدِ کمبو = (۳ واحد inv1 × ۱ جزء) + (۲ واحد inv2 × ۲ جزء)؛ ۲ واحد کمبو سفارش داده شده
      const after1 = await readStock(admin, inv1);
      const after2 = await readStock(admin, inv2);
      expect(before1 - after1).toBe(3 * 1 * quantityOrdered);
      expect(before2 - after2).toBe(2 * 2 * quantityOrdered);

      // عکسِ لحظه‌ایِ اجزا (OrderItemComboComponent) و ایستگاهِ آشپزخانه‌ی یکتا برای کلِ ردیفِ کمبو
      const activeOrders = await admin.call('getActiveOrders');
      expect(activeOrders.success).toBe(true);
      const orderRow = activeOrders.orders.find((o: any) => o.id === orderRes.order.id);
      expect(orderRow).toBeTruthy();
      const line = orderRow.items.find((i: any) => i.menuItemId === comboRes.combo.menuItemId);
      expect(line.priceAtTime).toBe(comboPrice);
      expect(line.menuItem.kitchenStation).toBe('گریل');
      expect(line.comboComponents.length).toBe(2);
      const comp1 = line.comboComponents.find((c: any) => c.menuItemId === item1.id);
      const comp2 = line.comboComponents.find((c: any) => c.menuItemId === item2.id);
      expect(comp1.quantity).toBe(1);
      expect(comp1.menuItemTitle).toBe(item1.title);
      expect(comp2.quantity).toBe(2);
      expect(comp2.menuItemTitle).toBe(item2.title);

      // مرجوعیِ یک واحد از سفارشِ کمبو، موجودیِ همان یک واحد را بازمی‌گرداند (بازاستفاده از فرآیندِ refund موجود، بدون هیچ تغییری در آن)
      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
      const found = await admin.call('findOrderForRefund', orderRes.order.orderNumber);
      expect(found.success).toBe(true);
      const refundLine = found.order.items.find((i: any) => i.menuItemId === comboRes.combo.menuItemId);

      const refund = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: false,
        items: [{ orderItemId: refundLine.id, quantity: 1 }],
        reason: 'یک بسته‌ی کمبو ناقص بود',
      });
      expect(refund.success).toBe(true);

      const finalStock1 = await readStock(admin, inv1);
      const finalStock2 = await readStock(admin, inv2);
      expect(finalStock1).toBe(after1 + 3 * 1);
      expect(finalStock2).toBe(after2 + 2 * 2);
    });
  });

  describe('حذفِ کمبو: حذفِ کامل در برابرِ غیرفعال‌سازیِ مشروط', () => {
    it('کمبویی که هرگز سفارش داده نشده، کاملاً حذف می‌شود (هم ردیفِ Combo و هم آیتمِ منویِ سایه)', async () => {
      const item = await makeMenuItem(admin, 10000);
      const comboRes = await admin.call('createCombo', {
        name: `کمبویِ حذف‌شدنی ${rand()}`,
        price: 9000,
        items: [{ menuItemId: item.id, quantity: 1 }],
      });
      expect(comboRes.success).toBe(true);

      const del = await admin.call('deleteCombo', comboRes.combo.id);
      expect(del.success).toBe(true);
      expect(del.deactivatedInstead).toBe(false);

      const combos = await admin.call('getCombos');
      expect(combos.combos.some((c: any) => c.id === comboRes.combo.id)).toBe(false);
      const menuList = await admin.call('getMenuItems');
      expect(menuList.some((m: any) => m.id === comboRes.combo.menuItemId)).toBe(false);
    });

    it('کمبویی که قبلاً در یک سفارش استفاده شده، به‌جای حذف، غیرفعال می‌شود تا تاریخچه‌ی سفارش دست‌نخورده بماند', async () => {
      const item = await makeMenuItem(admin, 10000);
      const comboRes = await admin.call('createCombo', {
        name: `کمبویِ استفاده‌شده ${rand()}`,
        price: 9000,
        items: [{ menuItemId: item.id, quantity: 1 }],
      });
      expect(comboRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: comboRes.combo.menuItemId, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const del = await admin.call('deleteCombo', comboRes.combo.id);
      expect(del.success).toBe(true);
      expect(del.deactivatedInstead).toBe(true);

      const combos = await admin.call('getCombos');
      const stillThere = combos.combos.find((c: any) => c.id === comboRes.combo.id);
      expect(stillThere).toBeTruthy();
      expect(stillThere.isActive).toBe(false);

      const menuList = await admin.call('getMenuItems');
      const shadow = menuList.find((m: any) => m.id === comboRes.combo.menuItemId);
      expect(shadow).toBeTruthy();
      expect(shadow.isAvailable).toBe(false);
    });
  });

  describe('اعتبارسنجیِ ساختِ قانونِ Happy Hour', () => {
    it('درصدِ خارج از بازه، مبلغِ ثابتِ نامعتبر، نبودِ روز/آیتم و بازه‌ی زمانیِ نامعتبر رد می‌شوند', async () => {
      const item = await makeMenuItem(admin, 10000);
      const base = {
        name: 'قانونِ تستی',
        daysOfWeek: [1],
        startMinute: 0,
        endMinute: 60,
        menuItemIds: [item.id],
      };
      expect(
        (await admin.call('createHappyHourRule', { ...base, discountType: 'PERCENT', value: 0 })).success
      ).toBe(false);
      expect(
        (await admin.call('createHappyHourRule', { ...base, discountType: 'PERCENT', value: 101 })).success
      ).toBe(false);
      expect(
        (await admin.call('createHappyHourRule', { ...base, discountType: 'FIXED', value: 0 })).success
      ).toBe(false);
      expect(
        (await admin.call('createHappyHourRule', { ...base, discountType: 'PERCENT', value: 10, daysOfWeek: [] }))
          .success
      ).toBe(false);
      expect(
        (await admin.call('createHappyHourRule', { ...base, discountType: 'PERCENT', value: 10, menuItemIds: [] }))
          .success
      ).toBe(false);
      expect(
        (
          await admin.call('createHappyHourRule', {
            ...base,
            discountType: 'PERCENT',
            value: 10,
            startMinute: 30,
            endMinute: 30,
          })
        ).success
      ).toBe(false);
    });

    it('قانون نمی‌تواند رویِ یک آیتمِ combo اعمال شود و آن آیتم اصلاً در فهرستِ آیتم‌های مجاز ظاهر نمی‌شود', async () => {
      const baseItem = await makeMenuItem(admin, 10000);
      const comboRes = await admin.call('createCombo', {
        name: `کمبویِ Happy Hour ${rand()}`,
        price: 9000,
        items: [{ menuItemId: baseItem.id, quantity: 1 }],
      });
      expect(comboRes.success).toBe(true);

      const ruleRes = await admin.call('createHappyHourRule', {
        name: 'رویِ کمبو',
        discountType: 'PERCENT',
        value: 10,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startMinute: 0,
        endMinute: 1439,
        menuItemIds: [comboRes.combo.menuItemId],
      });
      expect(ruleRes.success).toBe(false);

      const eligible = await admin.call('getHappyHourEligibleMenuItems');
      expect(eligible.success).toBe(true);
      expect(eligible.items.some((i: any) => i.id === comboRes.combo.menuItemId)).toBe(false);
    });
  });

  describe('منطقِ خالصِ محاسبه‌ی Happy Hour (تستِ واحد، بدونِ سرور/دیتابیس)', () => {
    const allDays = [0, 1, 2, 3, 4, 5, 6];

    it('isRuleActiveNow بازه‌ی زمانیِ معمولی (بدونِ عبور از نیمه‌شب) را درست تشخیص می‌دهد', () => {
      const rule = {
        id: 'r1',
        name: 'تست',
        isActive: true,
        daysOfWeek: allDays,
        discountType: 'PERCENT' as const,
        value: 10,
        startMinute: 600, // ۱۰:۰۰
        endMinute: 660, // ۱۱:۰۰
      };
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 10, 30))).toBe(true);
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 9, 0))).toBe(false);
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 11, 30))).toBe(false);
      // انتهای بازه غیرشامل است (نیمه‌بازِ راست)
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 11, 0))).toBe(false);
    });

    it('isRuleActiveNow بازه‌ی عبورکننده از نیمه‌شب را درست تشخیص می‌دهد', () => {
      const rule = {
        id: 'r2',
        name: 'شب',
        isActive: true,
        daysOfWeek: allDays,
        discountType: 'FIXED' as const,
        value: 5000,
        startMinute: 1380, // ۲۳:۰۰
        endMinute: 60, // ۰۱:۰۰
      };
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 23, 30))).toBe(true);
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 0, 30))).toBe(true);
      expect(isRuleActiveNow(rule, new Date(2026, 0, 1, 12, 0))).toBe(false);
    });

    it('isRuleActiveNow روزِ هفته و پرچمِ isActive را هم چک می‌کند', () => {
      const now = new Date();
      const mismatchedDay = (now.getDay() + 3) % 7; // همیشه با روزِ امروز فرق دارد
      const wrongDayRule = {
        id: 'r3',
        name: 'روزِ اشتباه',
        isActive: true,
        daysOfWeek: [mismatchedDay],
        discountType: 'PERCENT' as const,
        value: 10,
        startMinute: 0,
        endMinute: 1439,
      };
      const inactiveRule = { ...wrongDayRule, id: 'r4', daysOfWeek: allDays, isActive: false };
      expect(isRuleActiveNow(wrongDayRule, now)).toBe(false);
      expect(isRuleActiveNow(inactiveRule, now)).toBe(false);
    });

    it('ruleDiscountAmount مبلغِ درصدی/ثابت را درست حساب می‌کند و هرگز از قیمتِ پایه بیشتر نمی‌شود', () => {
      const pctRule = {
        id: 'p',
        name: 'درصدی',
        isActive: true,
        daysOfWeek: allDays,
        discountType: 'PERCENT' as const,
        value: 20,
        startMinute: 0,
        endMinute: 1439,
      };
      const fixedRule = { ...pctRule, id: 'f', discountType: 'FIXED' as const, value: 999999 };
      expect(ruleDiscountAmount(pctRule, 100000)).toBe(20000);
      expect(ruleDiscountAmount(fixedRule, 5000)).toBe(5000); // در سقفِ قیمتِ پایه محدود می‌شود
    });

    it('computeEffectivePrice از میانِ چند قانونِ فعال، بیش‌ترین تخفیف را انتخاب می‌کند (همیشه به نفعِ مشتری)', () => {
      const now = new Date();
      const small = {
        id: 'small',
        name: 'کم',
        isActive: true,
        daysOfWeek: allDays,
        discountType: 'PERCENT' as const,
        value: 10,
        startMinute: 0,
        endMinute: 1439,
      };
      const big = { ...small, id: 'big', name: 'زیاد', discountType: 'FIXED' as const, value: 30000 };
      const inactiveButBigger = {
        ...small,
        id: 'inactive',
        name: 'غیرفعال',
        isActive: false,
        discountType: 'FIXED' as const,
        value: 90000,
      };

      const result = computeEffectivePrice(100000, [small, big, inactiveButBigger], now);
      expect(result.appliedRuleId).toBe('big');
      expect(result.discountAmount).toBe(30000);
      expect(result.effectivePrice).toBe(70000);
    });

    it('وقتی هیچ قانونی فعال نیست، قیمتِ پایه بدونِ تغییر برمی‌گردد', () => {
      const now = new Date();
      const wrongDay = (now.getDay() + 3) % 7;
      const rule = {
        id: 'wd',
        name: 'روزِ اشتباه',
        isActive: true,
        daysOfWeek: [wrongDay],
        discountType: 'PERCENT' as const,
        value: 50,
        startMinute: 0,
        endMinute: 1439,
      };
      const result = computeEffectivePrice(100000, [rule], now);
      expect(result.effectivePrice).toBe(100000);
      expect(result.discountAmount).toBe(0);
      expect(result.appliedRuleId).toBeNull();
    });
  });

  describe('اعمالِ Happy Hour در سفارشِ واقعی (تستِ یکپارچه، با ساعتِ واقعیِ سرور)', () => {
    it('وقتی قانون در بازه‌ی زمانیِ کنونی فعال است، تخفیف رویِ سفارش اعمال و در OrderItem ثبت می‌شود', async () => {
      const item = await makeMenuItem(admin, 100000);
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinute = (nowMinutes - 15 + 1440) % 1440;
      const endMinute = (nowMinutes + 15) % 1440;

      const ruleRes = await admin.call('createHappyHourRule', {
        name: `فعالِ الان ${rand()}`,
        discountType: 'PERCENT',
        value: 25,
        daysOfWeek: [now.getDay()],
        startMinute,
        endMinute,
        menuItemIds: [item.id],
      });
      expect(ruleRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 2 }]);
      expect(orderRes.success).toBe(true);

      const activeOrders = await admin.call('getActiveOrders');
      const orderRow = activeOrders.orders.find((o: any) => o.id === orderRes.order.id);
      const line = orderRow.items.find((i: any) => i.menuItemId === item.id);
      expect(line.happyHourRuleId).toBe(ruleRes.rule.id);
      expect(line.happyHourRuleName).toBe(ruleRes.rule.name);
      expect(line.happyHourDiscountPerUnit).toBe(25000); // ۲۵٪ از ۱۰۰,۰۰۰
      expect(line.priceAtTime).toBe(75000);
    });

    it('وقتی روزِ قانون با امروز نمی‌خورَد، هیچ تخفیفی اعمال نمی‌شود', async () => {
      const item = await makeMenuItem(admin, 50000);
      const now = new Date();
      const wrongDay = (now.getDay() + 1) % 7;

      const ruleRes = await admin.call('createHappyHourRule', {
        name: `روزِ اشتباه ${rand()}`,
        discountType: 'PERCENT',
        value: 50,
        daysOfWeek: [wrongDay],
        startMinute: 0,
        endMinute: 1439,
        menuItemIds: [item.id],
      });
      expect(ruleRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const activeOrders = await admin.call('getActiveOrders');
      const orderRow = activeOrders.orders.find((o: any) => o.id === orderRes.order.id);
      const line = orderRow.items.find((i: any) => i.menuItemId === item.id);
      expect(line.happyHourRuleId).toBeNull();
      expect(line.happyHourDiscountPerUnit).toBe(0);
      expect(line.priceAtTime).toBe(50000);
    });

    it('از میانِ چند قانونِ هم‌زمانِ فعال رویِ یک آیتم، قانونی که بیش‌ترین تخفیف را می‌دهد اعمال می‌شود', async () => {
      const item = await makeMenuItem(admin, 100000);
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinute = (nowMinutes - 15 + 1440) % 1440;
      const endMinute = (nowMinutes + 15) % 1440;

      await admin.call('createHappyHourRule', {
        name: `تخفیفِ کم ${rand()}`,
        discountType: 'PERCENT',
        value: 10,
        daysOfWeek: [now.getDay()],
        startMinute,
        endMinute,
        menuItemIds: [item.id],
      });
      const bigRule = await admin.call('createHappyHourRule', {
        name: `تخفیفِ زیاد ${rand()}`,
        discountType: 'FIXED',
        value: 40000,
        daysOfWeek: [now.getDay()],
        startMinute,
        endMinute,
        menuItemIds: [item.id],
      });
      expect(bigRule.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const activeOrders = await admin.call('getActiveOrders');
      const orderRow = activeOrders.orders.find((o: any) => o.id === orderRes.order.id);
      const line = orderRow.items.find((i: any) => i.menuItemId === item.id);
      expect(line.happyHourRuleId).toBe(bigRule.rule.id);
      expect(line.happyHourDiscountPerUnit).toBe(40000);
      expect(line.priceAtTime).toBe(60000);
    });

    it('کمبو هیچ‌وقت تحتِ تأثیرِ Happy Hour قرار نمی‌گیرد', async () => {
      const baseItem = await makeMenuItem(admin, 20000);
      const comboRes = await admin.call('createCombo', {
        name: `کمبویِ مصون از Happy Hour ${rand()}`,
        price: 18000,
        items: [{ menuItemId: baseItem.id, quantity: 1 }],
      });
      expect(comboRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: comboRes.combo.menuItemId, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const activeOrders = await admin.call('getActiveOrders');
      const orderRow = activeOrders.orders.find((o: any) => o.id === orderRes.order.id);
      const line = orderRow.items.find((i: any) => i.menuItemId === comboRes.combo.menuItemId);
      expect(line.priceAtTime).toBe(18000);
      expect(line.happyHourRuleId).toBeNull();
    });
  });
});
