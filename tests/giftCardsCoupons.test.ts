import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

/**
 * فاز ۱۴: کارت هدیه و کد تخفیف (Gift Cards & Discount Coupons) — هر دو
 * زیرامکان با هم، طبق پاسخ تأییدشده‌ی کاربر، با دسترسیِ مدیریتی فقط ADMIN
 * (مطابق مدل دسترسیِ فرمول/BOM در فاز ۱۳).
 *
 * نکته‌ی مهم دیگر این فایل: اثبات صریحِ تصمیمِ محدوده‌ی «مرجوعی، کارتِ
 * هدیه/کدِ تخفیفِ استفاده‌شده در آن سفارش را برنمی‌گرداند» — نک. توضیحِ
 * کامل در schema.prisma بالای بخشِ فازِ ۱۴.
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeMenuItem(admin: TestClient, price: number) {
  const res = await admin.call('createMenuItem', {
    title: `قلم تستی فاز۱۴ ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(res.success).toBe(true);
  return res.item as { id: string; title: string; price: number };
}

async function getTaxPackaging(admin: TestClient) {
  const res = await admin.call('getSettings');
  expect(res.success).toBe(true);
  return {
    taxPercentage: res.settings.taxPercentage as number,
    packagingCost: res.settings.packagingCost as number,
  };
}

describe('کارت هدیه و کد تخفیف (فاز ۱۴)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی فاز۱۴ ${rand()}`,
      username: `cashier_p14_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی: مدیریت فقط ADMIN', () => {
    it('CASHIER به مدیریتِ کارت هدیه/کد تخفیف دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getGiftCards')).success).toBe(false);
      expect((await cashierOnly.call('issueGiftCard', { initialBalance: 1000 })).success).toBe(false);
      expect((await cashierOnly.call('deactivateGiftCard', 'whatever')).success).toBe(false);
      expect((await cashierOnly.call('getGiftCardTransactions', 'whatever')).success).toBe(false);
      expect((await cashierOnly.call('getCoupons')).success).toBe(false);
      expect(
        (await cashierOnly.call('createCoupon', { code: `X${rand()}`, discountType: 'PERCENT', value: 10 })).success
      ).toBe(false);
      expect((await cashierOnly.call('updateCoupon', 'whatever', { value: 5 })).success).toBe(false);
      expect((await cashierOnly.call('deleteCoupon', 'whatever')).success).toBe(false);
    });

    it('بررسیِ اعتبارِ کد (checkGiftCardBalance/checkCouponForOrder) به دسترسیِ ADMIN نیاز ندارد', async () => {
      const anon = new TestClient();
      // کدِ نامعتبر است، اما نتیجه باید یک خطای «یافت نشد» معمولی باشد، نه خطای دسترسی
      const gcRes = await anon.call('checkGiftCardBalance', 'NONEXISTENT-CODE');
      expect(gcRes.success).toBe(false);
      expect(gcRes.error).toContain('یافت نشد');

      const couponRes = await anon.call('checkCouponForOrder', 'NONEXISTENT-CODE', 10000);
      expect(couponRes.success).toBe(false);
      expect(couponRes.error).toContain('یافت نشد');
    });
  });

  describe('صدور کارت هدیه', () => {
    it('کارتِ هدیه با موجودیِ اولیه و یک تراکنشِ ISSUE ساخته می‌شود', async () => {
      const res = await admin.call('issueGiftCard', { initialBalance: 50000 });
      expect(res.success).toBe(true);
      expect(res.giftCard.currentBalance).toBe(50000);
      expect(res.giftCard.code).toBeTruthy();

      const txRes = await admin.call('getGiftCardTransactions', res.giftCard.id);
      expect(txRes.success).toBe(true);
      expect(txRes.transactions.length).toBe(1);
      expect(txRes.transactions[0].type).toBe('ISSUE');
      expect(txRes.transactions[0].amount).toBe(50000);
    });

    it('کدِ سفارشیِ تکراری رد می‌شود', async () => {
      const code = `DUPTEST-${rand()}`;
      const first = await admin.call('issueGiftCard', { initialBalance: 1000, code });
      expect(first.success).toBe(true);
      const second = await admin.call('issueGiftCard', { initialBalance: 1000, code });
      expect(second.success).toBe(false);
    });

    it('مبلغِ اولیه‌ی نامعتبر (صفر یا منفی) رد می‌شود', async () => {
      expect((await admin.call('issueGiftCard', { initialBalance: 0 })).success).toBe(false);
      expect((await admin.call('issueGiftCard', { initialBalance: -100 })).success).toBe(false);
    });
  });

  describe('اعتبارسنجیِ ساختِ کد تخفیف', () => {
    it('درصدِ تخفیفِ خارج از بازه‌ی ۱ تا ۱۰۰ رد می‌شود', async () => {
      expect(
        (await admin.call('createCoupon', { code: `PCT-${rand()}`, discountType: 'PERCENT', value: 0 })).success
      ).toBe(false);
      expect(
        (await admin.call('createCoupon', { code: `PCT-${rand()}`, discountType: 'PERCENT', value: 101 })).success
      ).toBe(false);
    });

    it('مبلغِ ثابتِ نامعتبر (صفر یا منفی) رد می‌شود', async () => {
      expect(
        (await admin.call('createCoupon', { code: `FIX-${rand()}`, discountType: 'FIXED', value: 0 })).success
      ).toBe(false);
    });

    it('کدِ تکراری رد می‌شود', async () => {
      const code = `UNIQ-${rand()}`;
      const first = await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000 });
      expect(first.success).toBe(true);
      const second = await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000 });
      expect(second.success).toBe(false);
    });
  });

  describe('اعمالِ کدِ تخفیف روی سفارش', () => {
    it('تخفیفِ درصدی درست محاسبه می‌شود و usesCount افزایش می‌یابد', async () => {
      const { taxPercentage, packagingCost } = await getTaxPackaging(admin);
      const menuItem = await makeMenuItem(admin, 100000);
      const code = `PCT20-${rand()}`;
      const couponRes = await admin.call('createCoupon', { code, discountType: 'PERCENT', value: 20 });
      expect(couponRes.success).toBe(true);

      const subtotal = 100000;
      const discountAmount = subtotal * 0.2;
      const taxAmount = Math.round((subtotal * taxPercentage) / 100);
      const expectedTotal = subtotal - discountAmount + taxAmount + packagingCost;

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.discountAmount).toBe(discountAmount);
      expect(orderRes.order.couponCode).toBe(code.toUpperCase());
      expect(orderRes.order.totalAmount).toBe(expectedTotal);

      const listRes = await admin.call('getCoupons');
      const updated = listRes.coupons.find((c: any) => c.code === code.toUpperCase());
      expect(updated.usesCount).toBe(1);
    });

    it('تخفیفِ مبلغِ ثابتِ بزرگ‌تر از subtotal به‌جای منفی‌شدن، در حدِ subtotal محدود می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 5000);
      const code = `BIGFIX-${rand()}`;
      await admin.call('createCoupon', { code, discountType: 'FIXED', value: 999999 });

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.discountAmount).toBe(5000);
    });

    it('سفارشِ زیرِ حداقلِ مبلغِ مجاز رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 1000);
      const code = `MINAMT-${rand()}`;
      await admin.call('createCoupon', {
        code,
        discountType: 'FIXED',
        value: 500,
        minOrderAmount: 1000000,
      });

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(false);
    });

    it('کدی که به سقفِ تعدادِ استفاده رسیده، در استفاده‌ی بعدی رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 20000);
      const code = `MAXUSE-${rand()}`;
      await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000, maxUses: 1 });

      const first = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(first.success).toBe(true);

      const second = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(second.success).toBe(false);
    });

    it('کدِ منقضی‌شده رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 20000);
      const code = `EXPIRED-${rand()}`;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000, expiresAt: yesterday });

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(false);
    });

    it('کدِ غیرفعال‌شده رد می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 20000);
      const code = `DEACT-${rand()}`;
      const couponRes = await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000 });
      await admin.call('updateCoupon', couponRes.coupon.id, { isActive: false });

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(false);
    });

    it('کدِ نامعتبر باعثِ شکستِ کاملِ ثبتِ سفارش می‌شود (نه نادیده‌گرفتنِ آرام)', async () => {
      const menuItem = await makeMenuItem(admin, 20000);
      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        `NOPE-${rand()}`
      );
      expect(orderRes.success).toBe(false);
    });
  });

  describe('استفاده از کارت هدیه در سفارش', () => {
    it('وقتی موجودیِ کارت کمتر از مبلغِ سفارش است، کاملِ موجودی کسر می‌شود و باقیِ سفارش نقدی می‌ماند', async () => {
      const { taxPercentage, packagingCost } = await getTaxPackaging(admin);
      const menuItem = await makeMenuItem(admin, 100000);
      const giftCardRes = await admin.call('issueGiftCard', { initialBalance: 30000 });
      expect(giftCardRes.success).toBe(true);

      const subtotal = 100000;
      const taxAmount = Math.round((subtotal * taxPercentage) / 100);
      const preGiftCardTotal = subtotal + taxAmount + packagingCost;
      const expectedUsed = Math.min(30000, preGiftCardTotal);

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        giftCardRes.giftCard.code
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.giftCardAmountUsed).toBe(expectedUsed);
      expect(orderRes.order.totalAmount).toBe(preGiftCardTotal - expectedUsed);

      const cardsRes = await admin.call('getGiftCards');
      const updatedCard = cardsRes.giftCards.find((g: any) => g.id === giftCardRes.giftCard.id);
      expect(updatedCard.currentBalance).toBe(30000 - expectedUsed);
    });

    it('وقتی موجودیِ کارت بیشتر از مبلغِ سفارش است، سفارش رایگان می‌شود و فقط همان مقدار از کارت کسر می‌شود', async () => {
      const { taxPercentage, packagingCost } = await getTaxPackaging(admin);
      const menuItem = await makeMenuItem(admin, 5000);
      const giftCardRes = await admin.call('issueGiftCard', { initialBalance: 1000000 });

      const subtotal = 5000;
      const taxAmount = Math.round((subtotal * taxPercentage) / 100);
      const preGiftCardTotal = subtotal + taxAmount + packagingCost;

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        giftCardRes.giftCard.code
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.totalAmount).toBe(0);
      expect(orderRes.order.giftCardAmountUsed).toBe(preGiftCardTotal);

      const cardsRes = await admin.call('getGiftCards');
      const updatedCard = cardsRes.giftCards.find((g: any) => g.id === giftCardRes.giftCard.id);
      expect(updatedCard.currentBalance).toBe(1000000 - preGiftCardTotal);
    });

    it('کارتِ با موجودیِ صفر یا غیرفعال قابلِ استفاده نیست', async () => {
      const menuItem = await makeMenuItem(admin, 5000);

      const zeroCard = await admin.call('issueGiftCard', { initialBalance: 1000 });
      // آن را کاملاً خرج می‌کنیم
      const useUp = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        zeroCard.giftCard.code
      );
      expect(useUp.success).toBe(true);
      const reuse = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        zeroCard.giftCard.code
      );
      expect(reuse.success).toBe(false);

      const deactivated = await admin.call('issueGiftCard', { initialBalance: 5000 });
      await admin.call('deactivateGiftCard', deactivated.giftCard.id);
      const useDeactivated = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        deactivated.giftCard.code
      );
      expect(useDeactivated.success).toBe(false);
    });

    it('کدِ کارتِ هدیه‌ی نامعتبر باعثِ شکستِ کاملِ ثبتِ سفارش می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 5000);
      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        `NOPE-${rand()}`
      );
      expect(orderRes.success).toBe(false);
    });
  });

  describe('ترکیبِ کدِ تخفیف و کارتِ هدیه در یک سفارش', () => {
    it('لایه‌بندی: مالیات روی subtotalِ ناخالص، سپس کدِ تخفیف، سپس کارتِ هدیه به‌عنوانِ آخرین لایه', async () => {
      const { taxPercentage, packagingCost } = await getTaxPackaging(admin);
      const menuItem = await makeMenuItem(admin, 200000);
      const couponCode = `COMBO-${rand()}`;
      await admin.call('createCoupon', { code: couponCode, discountType: 'PERCENT', value: 10 });
      const giftCardRes = await admin.call('issueGiftCard', { initialBalance: 50000 });

      const subtotal = 200000;
      const discountAmount = subtotal * 0.1;
      const taxAmount = Math.round((subtotal * taxPercentage) / 100);
      const preGiftCardTotal = subtotal - discountAmount + taxAmount + packagingCost;
      const expectedTotal = preGiftCardTotal - 50000;

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        couponCode,
        giftCardRes.giftCard.code
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.discountAmount).toBe(discountAmount);
      expect(orderRes.order.giftCardAmountUsed).toBe(50000);
      expect(orderRes.order.totalAmount).toBe(expectedTotal);
    });
  });

  describe('مرجوعی، کارتِ هدیه/کدِ تخفیفِ استفاده‌شده را برنمی‌گرداند (تصمیمِ محدوده)', () => {
    it('پس از مرجوعیِ کاملِ سفارش، موجودیِ کارتِ هدیه و usesCountِ کد دست‌نخورده می‌مانند', async () => {
      const menuItem = await makeMenuItem(admin, 40000);
      const couponCode = `NOFUND-${rand()}`;
      await admin.call('createCoupon', { code: couponCode, discountType: 'FIXED', value: 5000 });
      const giftCardRes = await admin.call('issueGiftCard', { initialBalance: 10000 });

      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        couponCode,
        giftCardRes.giftCard.code
      );
      expect(orderRes.success).toBe(true);

      const cardsAfterOrder = await admin.call('getGiftCards');
      const balanceAfterOrder = cardsAfterOrder.giftCards.find(
        (g: any) => g.id === giftCardRes.giftCard.id
      ).currentBalance;
      const couponsAfterOrder = await admin.call('getCoupons');
      const usesAfterOrder = couponsAfterOrder.coupons.find(
        (c: any) => c.code === couponCode.toUpperCase()
      ).usesCount;

      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تستِ عدمِ برگردانِ کارتِ هدیه/کدِ تخفیف',
      });
      expect(refundRes.success).toBe(true);

      const cardsAfterRefund = await admin.call('getGiftCards');
      const balanceAfterRefund = cardsAfterRefund.giftCards.find(
        (g: any) => g.id === giftCardRes.giftCard.id
      ).currentBalance;
      const couponsAfterRefund = await admin.call('getCoupons');
      const usesAfterRefund = couponsAfterRefund.coupons.find(
        (c: any) => c.code === couponCode.toUpperCase()
      ).usesCount;

      expect(balanceAfterRefund).toBe(balanceAfterOrder);
      expect(usesAfterRefund).toBe(usesAfterOrder);
    });
  });

  describe('حذف کدِ تخفیف', () => {
    it('کدِ استفاده‌نشده کاملاً حذف می‌شود', async () => {
      const code = `DELUNUSED-${rand()}`;
      const couponRes = await admin.call('createCoupon', { code, discountType: 'FIXED', value: 1000 });
      const delRes = await admin.call('deleteCoupon', couponRes.coupon.id);
      expect(delRes.success).toBe(true);
      expect(delRes.deactivatedInstead).toBeFalsy();

      const listRes = await admin.call('getCoupons');
      expect(listRes.coupons.some((c: any) => c.id === couponRes.coupon.id)).toBe(false);
    });

    it('کدِ استفاده‌شده به‌جای حذف، فقط غیرفعال می‌شود', async () => {
      const menuItem = await makeMenuItem(admin, 10000);
      const code = `DELUSED-${rand()}`;
      const couponRes = await admin.call('createCoupon', { code, discountType: 'FIXED', value: 500 });
      const orderRes = await admin.call(
        'createOrder',
        [{ menuItemId: menuItem.id, quantity: 1 }],
        undefined,
        undefined,
        code
      );
      expect(orderRes.success).toBe(true);

      const delRes = await admin.call('deleteCoupon', couponRes.coupon.id);
      expect(delRes.success).toBe(true);
      expect(delRes.deactivatedInstead).toBe(true);

      const listRes = await admin.call('getCoupons');
      const stillThere = listRes.coupons.find((c: any) => c.id === couponRes.coupon.id);
      expect(stillThere).toBeTruthy();
      expect(stillThere.isActive).toBe(false);
    });
  });
});
