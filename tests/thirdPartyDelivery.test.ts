import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

/**
 * فاز ۱۷: اتصال به پیک/ارسال شخص ثالث — طبق پاسخ‌های تأییدشده‌ی کاربر:
 * (۱) چون به هیچ API واقعی‌ای دسترسی/مستندات نداریم، یک لایه‌ی انتزاعیِ
 *     Provider عمومی (src/lib/deliveryProviders.ts) به‌همراه یک Provider
 *     شبیه‌سازی‌شده (MOCK_EXPRESS) ساخته شده، دقیقاً روی الگوی
 *     dispatch/webhook-callback زرین‌پال؛
 * (۲) این قابلیت در کنارِ گردش‌کارِ دستیِ پیکِ داخلیِ موجود اضافه شده، نه
 *     جایگزینِ آن — وقتی ارسال به شخص‌ثالث شکست بخورد، سفارش بی‌صدا روی
 *     همان تخته‌ی تحویلِ دستی می‌ماند (نک. چرخه‌ی پیک داخلیِ
 *     tests/onlineOrdering.test.ts که این مسیر را دقیقاً با همین نشانه‌ی
 *     تستی پوشش می‌دهد)؛
 * (۳) ارسال به شخص‌ثالث خودکار و بلافاصله بعد از پرداخت است، نه با کلیکِ
 *     دستیِ کارمند — وضعیت‌های بعدی هم فقط از طریقِ «وب‌هوکِ» شبیه‌سازی‌شده
 *     (receiveDeliveryProviderStatusUpdate / اکشن‌های simulate*) پیش می‌روند.
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeMenuItem(admin: TestClient, price: number) {
  const item = await admin.call('createMenuItem', {
    title: `آیتم تستی فاز۱۷ ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(item.success).toBe(true);
  return item.item.id as string;
}

async function loginNewCustomer(fullName: string) {
  const client = new TestClient();
  const phone = `0917${rand()}`;
  const otpRes = await client.call('requestOtp', phone);
  expect(otpRes.success).toBe(true);
  const verifyRes = await client.call('verifyOtp', phone, otpRes.devCode, fullName);
  expect(verifyRes.success).toBe(true);
  return client;
}

async function placeOnlineOrder(customer: TestClient, menuItemId: string, address: string) {
  const res = await customer.call('createOnlineOrder', [{ menuItemId, quantity: 1 }], address, 0);
  expect(res.success).toBe(true);
  return res.order.id as string;
}

describe('اتصال به پیک/ارسال شخص ثالث (فاز ۱۷)', () => {
  let admin: TestClient;
  let menuItemId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings');
    menuItemId = await makeMenuItem(admin, 90000);
  });

  describe('ارسال خودکار بعد از پرداخت', () => {
    it('سفارشِ ONLINE_DELIVERY بلافاصله بعد از finalize به شخص‌ثالث ارسال می‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی ارسال خودکار');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷');

      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
      expect(finalized.deliveryProvider).toBe('MOCK_EXPRESS');
      expect(finalized.deliveryStatus).toBe('ASSIGNED');
      expect(finalized.externalDeliveryId).toMatch(/^MEX-/);
      expect(finalized.externalTrackingUrl).toContain(finalized.externalDeliveryId);
    });

    it('تخته‌ی تحویل (getDeliveryBoard) سفارشِ ارسال‌شده به شخص‌ثالث را هم نشان می‌دهد', async () => {
      const customer = await loginNewCustomer('مشتری تستی تخته‌ی تحویل');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷ تخته');
      await admin.call('finalizeOnlineOrderAfterPayment', orderId);

      const board = await admin.call('getDeliveryBoard');
      expect(board.success).toBe(true);
      const found = board.orders.find((o: any) => o.id === orderId);
      expect(found).toBeTruthy();
      expect(found.deliveryProvider).toBe('MOCK_EXPRESS');
      expect(found.externalDeliveryId).toBeTruthy();
    });

    it('ارسالِ دوباره (idempotent) برای سفارشی که از قبل ارسال شده چیزی را عوض نمی‌کند', async () => {
      const customer = await loginNewCustomer('مشتری تستی idempotent');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷ idempotent');
      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
      const firstExternalId = finalized.externalDeliveryId;

      const again = await admin.call('dispatchOrderToThirdPartyProvider', orderId);
      expect(again.success).toBe(true);
      expect(again.order.externalDeliveryId).toBe(firstExternalId);
    });

    it('dispatchOrderToThirdPartyProvider روی شناسه‌ی سفارشِ نامعتبر رد می‌شود', async () => {
      const res = await admin.call('dispatchOrderToThirdPartyProvider', 'not-a-real-order-id');
      expect(res.success).toBe(false);
    });
  });

  describe('شکستِ ارسال به شخص‌ثالث: سقوط بی‌صدا به گردش‌کارِ دستیِ پیکِ داخلی', () => {
    it('با نشانه‌ی تستیِ شکستِ ارسال، سفارش روی PENDING_ASSIGNMENT می‌ماند و هیچ Providerای ثبت نمی‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی شکست ارسال');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی [TEST_DISPATCH_FAIL]');

      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
      expect(finalized.deliveryStatus).toBe('PENDING_ASSIGNMENT');
      expect(finalized.deliveryProvider).toBeFalsy();
      expect(finalized.externalDeliveryId).toBeFalsy();

      // همچنان روی تخته‌ی تحویلِ داخلی قابل مشاهده و تخصیص است
      const board = await admin.call('getDeliveryBoard');
      expect(board.orders.some((o: any) => o.id === orderId)).toBe(true);
    });
  });

  describe('دریافتِ وب‌هوکِ وضعیت از شخص‌ثالث (receiveDeliveryProviderStatusUpdate)', () => {
    it('شناسه‌ی پیگیریِ نامعتبر رد می‌شود', async () => {
      const res = await admin.call('receiveDeliveryProviderStatusUpdate', 'NOT-A-REAL-ID', 'PICKED_UP');
      expect(res.success).toBe(false);
    });

    it('وضعیتِ نامعتبر/ناشناخته رد می‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی وضعیت نامعتبر');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷ وضعیت نامعتبر');
      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);

      const res = await admin.call(
        'receiveDeliveryProviderStatusUpdate',
        finalized.externalDeliveryId,
        'SOME_GARBAGE_STATUS'
      );
      expect(res.success).toBe(false);
    });
  });

  describe('شبیه‌سازیِ پیشرفتِ وضعیت توسطِ کارمند (چون Providerِ واقعی وجود ندارد)', () => {
    it('چرخه‌ی کامل: ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED (و status سفارش می‌شود COMPLETED)', async () => {
      const customer = await loginNewCustomer('مشتری تستی چرخه شخص ثالث');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷ چرخه');
      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
      expect(finalized.deliveryStatus).toBe('ASSIGNED');

      const step1 = await admin.call('simulateNextProviderStatus', orderId);
      expect(step1.success).toBe(true);
      expect(step1.order.deliveryStatus).toBe('PICKED_UP');

      const step2 = await admin.call('simulateNextProviderStatus', orderId);
      expect(step2.order.deliveryStatus).toBe('ON_THE_WAY');

      const step3 = await admin.call('simulateNextProviderStatus', orderId);
      expect(step3.order.deliveryStatus).toBe('DELIVERED');
      expect(step3.order.status).toBe('COMPLETED');

      const noMore = await admin.call('simulateNextProviderStatus', orderId);
      expect(noMore.success).toBe(false);

      const tracked = await customer.call('getMyOnlineOrder', orderId);
      expect(tracked.order.deliveryStatus).toBe('DELIVERED');
    });

    it('شبیه‌سازیِ شکستِ ارسال (simulateProviderDeliveryFailure)', async () => {
      const customer = await loginNewCustomer('مشتری تستی شکست شبیه‌سازی‌شده');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی فاز۱۷ شکست شبیه‌سازی');
      await admin.call('finalizeOnlineOrderAfterPayment', orderId);

      const failRes = await admin.call('simulateProviderDeliveryFailure', orderId);
      expect(failRes.success).toBe(true);
      expect(failRes.order.deliveryStatus).toBe('FAILED');
    });

    it('برای سفارشی که با پیکِ داخلی (نه شخص‌ثالث) در حال ارسال است، شبیه‌سازی رد می‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی رد شبیه‌سازی روی پیک داخلی');
      const orderId = await placeOnlineOrder(customer, menuItemId, 'آدرس تستی [TEST_DISPATCH_FAIL] رد شبیه‌سازی');
      await admin.call('finalizeOnlineOrderAfterPayment', orderId);

      const advance = await admin.call('simulateNextProviderStatus', orderId);
      expect(advance.success).toBe(false);
      const fail = await admin.call('simulateProviderDeliveryFailure', orderId);
      expect(fail.success).toBe(false);
    });
  });

  describe('کنترل دسترسی', () => {
    it('CHEF به اکشن‌های شبیه‌سازیِ شخص‌ثالث دسترسی ندارد', async () => {
      const chefUser = await admin.call('createUser', {
        name: `آشپز تستی فاز۱۷ ${rand()}`,
        username: `chef_p17_${rand()}`,
        password: '123456',
        roles: ['CHEF'],
      });
      expect(chefUser.success).toBe(true);
      const chef = new TestClient();
      expect((await chef.call('login', chefUser.user.username, '123456')).success).toBe(true);

      expect((await chef.call('simulateNextProviderStatus', 'x')).success).toBe(false);
      expect((await chef.call('simulateProviderDeliveryFailure', 'x')).success).toBe(false);
    });
  });

  describe('رگرسیون: سفارشِ QR روی میز هرگز به شخص‌ثالث ارسال نمی‌شود', () => {
    it('createDineInQrOrder + finalize نه deliveryProvider می‌گیرد و نه deliveryStatus', async () => {
      const branchRes = await admin.call('getBranches');
      expect(branchRes.success).toBe(true);
      const branchId = branchRes.branches[0].id as string;
      const tableRes = await admin.call('createTable', 9500 + Math.floor(Math.random() * 400), 4, branchId);
      expect(tableRes.success).toBe(true);

      const customer = await loginNewCustomer('مشتری تستی رگرسیون QR فاز۱۷');
      const orderRes = await customer.call('createDineInQrOrder', tableRes.table.id, [
        { menuItemId, quantity: 1 },
      ]);
      expect(orderRes.success).toBe(true);

      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderRes.order.id);
      expect(finalized.deliveryProvider).toBeFalsy();
      expect(finalized.deliveryStatus).toBeFalsy();
    });
  });
});
