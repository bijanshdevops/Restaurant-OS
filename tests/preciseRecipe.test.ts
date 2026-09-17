import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

/**
 * فاز ۱۳: فرمول غذای دقیق‌تر — مدیفایر/افزودنی با مصرف موجودی، درصد
 * بازده (yield %) و زیرفرمول (سه قابلیت با هم، طبق پاسخ تأییدشده‌ی کاربر)،
 * با دسترسیِ فقط ADMIN.
 *
 * مهم‌ترین بخش این فایل، تست «عکسِ لحظه‌ای مصرف مواد اولیه» است: اثبات
 * می‌کند که تغییرِ فرمول/مدیفایر بعد از ثبتِ سفارش، روی برگردانِ موجودیِ
 * مرجوعیِ آن سفارش اثر نمی‌گذارد — رفعِ یک اشکالِ نهفته‌ی قبلی که در آن
 * refund.ts دوباره از رویِ فرمولِ زنده‌ی فعلی محاسبه می‌کرد.
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeInventoryItem(admin: TestClient, stock = 1000) {
  const res = await admin.call('createInventoryItem', {
    name: `ماده تستی فاز۱۳ ${rand()}`,
    category: 'تست',
    unit: 'عدد',
    currentStock: stock,
    minStockLevel: 5,
  });
  expect(res.success).toBe(true);
  return res.item.id as string;
}

async function makeMenuItem(admin: TestClient, price = 50000) {
  const res = await admin.call('createMenuItem', {
    title: `قلم تستی فاز۱۳ ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(res.success).toBe(true);
  return res.item as { id: string; title: string; price: number };
}

async function readStock(admin: TestClient, inventoryItemId: string) {
  const res = await admin.call('getInventoryItems');
  expect(res.success).toBe(true);
  const row = res.items.find((i: any) => i.id === inventoryItemId);
  expect(row).toBeTruthy();
  return row.currentStock as number;
}

async function completeOrder(admin: TestClient, orderId: string) {
  const res = await admin.call('updateOrderStatus', orderId, 'COMPLETED');
  expect(res.success).toBe(true);
}

describe('فرمول غذای دقیق‌تر: مدیفایر، درصد بازده، زیرفرمول (فاز ۱۳)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings');

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی فاز۱۳ ${rand()}`,
      username: `cashier_p13_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی: فقط ADMIN', () => {
    it('CASHIER به هیچ‌کدام از اکشن‌های زیرفرمول/مدیفایر دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getSubRecipes')).success).toBe(false);
      expect((await cashierOnly.call('saveSubRecipe', null, 'x', '', '', [])).success).toBe(false);
      expect((await cashierOnly.call('deleteSubRecipe', 'whatever')).success).toBe(false);
      expect((await cashierOnly.call('getModifierGroups')).success).toBe(false);
      expect((await cashierOnly.call('saveModifierGroup', null, 'x', 0, 1, [])).success).toBe(false);
      expect((await cashierOnly.call('deleteModifierGroup', 'whatever')).success).toBe(false);
      expect((await cashierOnly.call('getMenuItemModifierGroups', 'whatever')).success).toBe(false);
      expect((await cashierOnly.call('setMenuItemModifierGroups', 'whatever', [])).success).toBe(false);
    });
  });

  describe('درصد بازده (yield %)', () => {
    it('بازده ۵۰٪ دقیقاً دو برابرِ مقدارِ خام را کسر می‌کند', async () => {
      const invId = await makeInventoryItem(admin);
      const menuItem = await makeMenuItem(admin);
      const recipeRes = await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 2, yieldPercent: 50 },
      ]);
      expect(recipeRes.success).toBe(true);

      const before = await readStock(admin, invId);
      const orderRes = await admin.call('createOrder', [{ menuItemId: menuItem.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      const after = await readStock(admin, invId);
      // ۲ / (۵۰٪) = ۴ واحد کسر می‌شود، نه ۲ واحد خام
      expect(before - after).toBe(4);
    });
  });

  describe('زیرفرمول (Sub-recipe)', () => {
    it('مصرف زیرفرمول به‌درستی در فرمول یک آیتم منو بسط پیدا می‌کند', async () => {
      const invId = await makeInventoryItem(admin);
      const subRes = await admin.call('saveSubRecipe', null, `سس تستی ${rand()}`, 'کیلوگرم', '', [
        { inventoryItemId: invId, quantity: 2, yieldPercent: 100 },
      ]);
      expect(subRes.success).toBe(true);
      const subRecipeId = subRes.subRecipe.id;

      const menuItem = await makeMenuItem(admin);
      const recipeRes = await admin.call('saveMenuItemRecipe', menuItem.id, [
        { subRecipeId, quantity: 3, yieldPercent: 100 },
      ]);
      expect(recipeRes.success).toBe(true);

      const before = await readStock(admin, invId);
      const orderRes = await admin.call('createOrder', [{ menuItemId: menuItem.id, quantity: 2 }]);
      expect(orderRes.success).toBe(true);
      const after = await readStock(admin, invId);
      // هر واحد آیتم منو = ۳ واحد زیرفرمول × ۲ واحد ماده‌ی اولیه = ۶ واحد؛
      // برای ۲ واحد سفارش = ۱۲ واحد
      expect(before - after).toBe(12);
    });

    it('هزینه‌ی زیرفرمول در آنالیز فرمول آیتم منو صحیح محاسبه می‌شود', async () => {
      const invId = await makeInventoryItem(admin);
      await admin.call('updateInventoryItemCost', invId, 1000);

      const subRes = await admin.call('saveSubRecipe', null, `سس هزینه‌ای ${rand()}`, '', '', [
        { inventoryItemId: invId, quantity: 2, yieldPercent: 100 },
      ]);
      expect(subRes.success).toBe(true);

      const menuItem = await makeMenuItem(admin);
      const recipeDetail = await admin.call('getMenuItemRecipe', menuItem.id);
      expect(recipeDetail.success).toBe(true);
      const subOption = recipeDetail.subRecipes.find((s: any) => s.id === subRes.subRecipe.id);
      expect(subOption).toBeTruthy();
      // هزینه‌ی هر واحد زیرفرمول = ۲ واحدِ ماده‌ی اولیه × ۱۰۰۰ تومان = ۲۰۰۰ تومان
      expect(subOption.costPerUnit).toBe(2000);
    });

    it('حلقه‌ی مستقیم (خودارجاعی) رد می‌شود', async () => {
      const subRes = await admin.call('saveSubRecipe', null, `زیرفرمول حلقه ${rand()}`, '', '', []);
      expect(subRes.success).toBe(true);
      const subRecipeId = subRes.subRecipe.id;

      const res = await admin.call('saveSubRecipe', subRecipeId, subRes.subRecipe.name, '', '', [
        { childSubRecipeId: subRecipeId, quantity: 1, yieldPercent: 100 },
      ]);
      expect(res.success).toBe(false);
    });

    it('حلقه‌ی غیرمستقیم (A→B سپس B→A) رد می‌شود', async () => {
      const subA = await admin.call('saveSubRecipe', null, `زیرفرمول A ${rand()}`, '', '', []);
      expect(subA.success).toBe(true);
      const subB = await admin.call('saveSubRecipe', null, `زیرفرمول B ${rand()}`, '', '', [
        { childSubRecipeId: subA.subRecipe.id, quantity: 1, yieldPercent: 100 },
      ]);
      expect(subB.success).toBe(true);

      // اگر A هم به B اشاره کند، حلقه‌ی A→B→A شکل می‌گیرد
      const res = await admin.call('saveSubRecipe', subA.subRecipe.id, subA.subRecipe.name, '', '', [
        { childSubRecipeId: subB.subRecipe.id, quantity: 1, yieldPercent: 100 },
      ]);
      expect(res.success).toBe(false);
    });

    it('حذفِ زیرفرمولی که در فرمول یک آیتم منو استفاده شده رد می‌شود', async () => {
      const invId = await makeInventoryItem(admin);
      const subRes = await admin.call('saveSubRecipe', null, `زیرفرمول درحال‌استفاده ${rand()}`, '', '', [
        { inventoryItemId: invId, quantity: 1, yieldPercent: 100 },
      ]);
      expect(subRes.success).toBe(true);

      const menuItem = await makeMenuItem(admin);
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { subRecipeId: subRes.subRecipe.id, quantity: 1, yieldPercent: 100 },
      ]);

      const delRes = await admin.call('deleteSubRecipe', subRes.subRecipe.id);
      expect(delRes.success).toBe(false);
    });
  });

  describe('مدیفایر/افزودنی و اثر آن روی موجودی و قیمت', () => {
    it('انتخاب مدیفایر با اثر مثبت، مصرف موجودی را اضافه و قیمت را افزایش می‌دهد', async () => {
      const baseInvId = await makeInventoryItem(admin);
      const extraInvId = await makeInventoryItem(admin);
      const menuItem = await makeMenuItem(admin, 100000);
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: baseInvId, quantity: 2, yieldPercent: 100 },
      ]);

      const groupRes = await admin.call('saveModifierGroup', null, `گروه تستی ${rand()}`, 0, 1, [
        { name: 'پنیر اضافه', priceDelta: 15000, recipeLines: [{ inventoryItemId: extraInvId, quantity: 1 }] },
      ]);
      expect(groupRes.success).toBe(true);

      const groupsRes = await admin.call('getModifierGroups');
      const savedGroup = groupsRes.groups.find((g: any) => g.id === groupRes.group.id);
      const savedModifier = savedGroup.modifiers[0];

      const setLinkRes = await admin.call('setMenuItemModifierGroups', menuItem.id, [groupRes.group.id]);
      expect(setLinkRes.success).toBe(true);

      const beforeBase = await readStock(admin, baseInvId);
      const beforeExtra = await readStock(admin, extraInvId);

      const orderRes = await admin.call('createOrder', [
        { menuItemId: menuItem.id, quantity: 1, modifierIds: [savedModifier.id] },
      ]);
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.totalAmount).toBeGreaterThanOrEqual(115000);

      expect(beforeBase - (await readStock(admin, baseInvId))).toBe(2);
      expect(beforeExtra - (await readStock(admin, extraInvId))).toBe(1);
    });

    it('اثرِ منفیِ مدیفایر، مصرفِ ماده را کم می‌کند و در صفر کلیپ می‌شود (هرگز منفی نمی‌شود)', async () => {
      const invId = await makeInventoryItem(admin);
      const menuItem = await makeMenuItem(admin, 80000);
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 2, yieldPercent: 100 },
      ]);

      const groupRes = await admin.call('saveModifierGroup', null, `گروه بدون‌سس ${rand()}`, 0, 1, [
        { name: 'بدون سس', priceDelta: 0, recipeLines: [{ inventoryItemId: invId, quantity: -100 }] },
      ]);
      expect(groupRes.success).toBe(true);
      const groupsRes = await admin.call('getModifierGroups');
      const savedGroup = groupsRes.groups.find((g: any) => g.id === groupRes.group.id);
      const savedModifier = savedGroup.modifiers[0];
      await admin.call('setMenuItemModifierGroups', menuItem.id, [groupRes.group.id]);

      const before = await readStock(admin, invId);
      const orderRes = await admin.call('createOrder', [
        { menuItemId: menuItem.id, quantity: 1, modifierIds: [savedModifier.id] },
      ]);
      expect(orderRes.success).toBe(true);
      // ۲ - ۱۰۰ منفی می‌شود؛ باید در صفر کلیپ شود، نه این‌که موجودی را افزایش دهد یا کاهش نامعتبر بدهد
      expect(before - (await readStock(admin, invId))).toBe(0);
    });

    it('انتخابِ کمتر از حداقلِ الزامیِ گروه رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin);
      const groupRes = await admin.call('saveModifierGroup', null, `گروه الزامی ${rand()}`, 1, 1, [
        { name: 'یکی را انتخاب کن', priceDelta: 0, recipeLines: [] },
      ]);
      expect(groupRes.success).toBe(true);
      await admin.call('setMenuItemModifierGroups', menuItem.id, [groupRes.group.id]);

      const res = await admin.call('createOrder', [{ menuItemId: menuItem.id, quantity: 1 }]);
      expect(res.success).toBe(false);
    });

    it('انتخابِ بیش از حداکثرِ مجازِ گروه رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin);
      const groupRes = await admin.call('saveModifierGroup', null, `گروه تک‌انتخابی ${rand()}`, 0, 1, [
        { name: 'گزینه یک', priceDelta: 0, recipeLines: [] },
        { name: 'گزینه دو', priceDelta: 0, recipeLines: [] },
      ]);
      expect(groupRes.success).toBe(true);
      const groupsRes = await admin.call('getModifierGroups');
      const savedGroup = groupsRes.groups.find((g: any) => g.id === groupRes.group.id);
      await admin.call('setMenuItemModifierGroups', menuItem.id, [groupRes.group.id]);

      const res = await admin.call('createOrder', [
        {
          menuItemId: menuItem.id,
          quantity: 1,
          modifierIds: savedGroup.modifiers.map((m: any) => m.id),
        },
      ]);
      expect(res.success).toBe(false);
    });

    it('شناسه‌ی مدیفایرِ متعلق به آیتمِ منوی دیگر رد می‌شود', async () => {
      const menuItemA = await makeMenuItem(admin);
      const menuItemB = await makeMenuItem(admin);
      const groupRes = await admin.call('saveModifierGroup', null, `گروه اختصاصی A ${rand()}`, 0, 1, [
        { name: 'مخصوص A', priceDelta: 0, recipeLines: [] },
      ]);
      expect(groupRes.success).toBe(true);
      const groupsRes = await admin.call('getModifierGroups');
      const savedGroup = groupsRes.groups.find((g: any) => g.id === groupRes.group.id);
      await admin.call('setMenuItemModifierGroups', menuItemA.id, [groupRes.group.id]);
      // menuItemB هیچ گروه مدیفایری متصل ندارد

      const res = await admin.call('createOrder', [
        { menuItemId: menuItemB.id, quantity: 1, modifierIds: [savedGroup.modifiers[0].id] },
      ]);
      expect(res.success).toBe(false);
    });
  });

  describe('عکسِ لحظه‌ایِ مصرف مواد اولیه و برگردانِ درستِ موجودی در مرجوعی', () => {
    it('تغییرِ فرمول بعد از ثبتِ سفارش، روی برگردانِ موجودیِ مرجوعیِ همان سفارش اثر نمی‌گذارد', async () => {
      const invId = await makeInventoryItem(admin);
      const menuItem = await makeMenuItem(admin, 40000);
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 2, yieldPercent: 100 },
      ]);

      const before = await readStock(admin, invId);
      const orderRes = await admin.call('createOrder', [{ menuItemId: menuItem.id, quantity: 3 }]);
      expect(orderRes.success).toBe(true);
      expect(before - (await readStock(admin, invId))).toBe(6); // ۳ × ۲

      // فرمول را عوض می‌کنیم — از این پس هر واحد ۱۰ واحدِ ماده‌ی اولیه مصرف می‌کند
      const changeRes = await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 10, yieldPercent: 100 },
      ]);
      expect(changeRes.success).toBe(true);

      await completeOrder(admin, orderRes.order.id);
      const stockBeforeRefund = await readStock(admin, invId);

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تست عکس لحظه‌ای',
      });
      expect(refundRes.success).toBe(true);

      // اگر مرجوعی از فرمولِ زنده‌ی فعلی (اکنون ۱۰ واحد) استفاده می‌کرد، باید
      // ۳۰ واحد برمی‌گشت؛ چون از عکسِ لحظه‌ایِ ثبت‌شده در لحظه‌ی سفارش استفاده
      // می‌کند، دقیقاً همان ۶ واحدِ اصلی برمی‌گردد.
      expect((await readStock(admin, invId)) - stockBeforeRefund).toBe(6);
    });

    it('همین رفتار برای سفارش آنلاین هم برقرار است (عکس در لحظه‌ی ثبت سفارش، نه در لحظه‌ی تأیید پرداخت)', async () => {
      const invId = await makeInventoryItem(admin);
      const menuItem = await makeMenuItem(admin, 60000);
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 3, yieldPercent: 100 },
      ]);

      const customer = new TestClient();
      const phone = `0912${rand()}`;
      const otpRes = await customer.call('requestOtp', phone);
      expect(otpRes.success).toBe(true);
      const verifyRes = await customer.call('verifyOtp', phone, otpRes.devCode, 'مشتری تستی فاز۱۳');
      expect(verifyRes.success).toBe(true);

      const onlineOrderRes = await customer.call(
        'createOnlineOrder',
        [{ menuItemId: menuItem.id, quantity: 2 }],
        'تهران، تست فاز ۱۳',
        0
      );
      expect(onlineOrderRes.success).toBe(true);

      // فرمول را بعد از ثبتِ سفارشِ آنلاین (ولی پیش از تأیید پرداخت) عوض می‌کنیم
      await admin.call('saveMenuItemRecipe', menuItem.id, [
        { inventoryItemId: invId, quantity: 50, yieldPercent: 100 },
      ]);

      const before = await readStock(admin, invId);
      const finalizeRes = await admin.call('finalizeOnlineOrderAfterPayment', onlineOrderRes.order.id);
      expect(finalizeRes.id).toBe(onlineOrderRes.order.id);
      const after = await readStock(admin, invId);

      // باید طبق عکسِ لحظه‌ای (۳ واحد × ۲ = ۶ واحد) کسر شود، نه طبق فرمولِ
      // تغییریافته‌ی فعلی (که ۱۰۰ واحد می‌شد).
      expect(before - after).toBe(6);
    });
  });
});
