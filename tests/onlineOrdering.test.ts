import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

// شماره‌های موبایل تصادفی برای جلوگیری از برخورد با اجراهای قبلی/موازی
const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);
const testPhone = `0912${rand()}`;
const testPhone2 = `0913${rand()}`;
const otherPhone = `0914${rand()}`;
const courierPhone = `0919${rand()}`;

describe('سفارش آنلاین، پرداخت و باشگاه مشتریان (چرخه کامل)', () => {
  let admin: TestClient;
  let customer: TestClient;
  let menuItemId: string;
  let menuItemPrice: number;
  let orderId: string;
  let orderTotalAmount: number;
  let courierId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings'); // اطمینان از وجود ردیف تنظیمات

    // همیشه یک آیتم منوی اختصاصی و «موجود» می‌سازیم؛ تکیه به آیتم‌های از قبل
    // موجود در دیتابیس ریسک دارد چون ممکن است isAvailable=false باشند یا
    // رسپی‌شان روی موجودی انبار اثر غیرقابل‌پیش‌بینی بگذارد.
    const created = await admin.call('createMenuItem', {
      title: `آیتم تستی سفارش آنلاین ${rand()}`,
      price: 150000,
      category: 'تست',
      subCategory: '',
      imageUrl: '',
    });
    menuItemId = created.item.id;
    menuItemPrice = created.item.price;

    customer = new TestClient();
  });

  it('ورود مشتری با OTP: کد صحیح باعث ساخت حساب و ورود می‌شود', async () => {
    const reqRes = await customer.call('requestOtp', testPhone);
    expect(reqRes.success).toBe(true);
    expect(reqRes.devCode).toBeTruthy();

    const verifyRes = await customer.call('verifyOtp', testPhone, reqRes.devCode, 'مشتری تستی');
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.customer.phone).toBe(testPhone);
    expect(verifyRes.customer.fullName).toBe('مشتری تستی');
  });

  it('کد اشتباه رد می‌شود', async () => {
    const otherClient = new TestClient();
    const reqRes = await otherClient.call('requestOtp', testPhone2);
    expect(reqRes.success).toBe(true);

    const wrongCode = reqRes.devCode === '111111' ? '222222' : '111111';
    const verifyRes = await otherClient.call('verifyOtp', testPhone2, wrongCode);
    expect(verifyRes.success).toBe(false);
  });

  it('منوی عمومی بدون نیاز به ورود مشتری در دسترس است', async () => {
    const anonymous = new TestClient();
    const items = await anonymous.call('getPublicMenuItems');
    expect(Array.isArray(items)).toBe(true);
    const found = items.find((i: any) => i.id === menuItemId);
    expect(found).toBeTruthy();
    expect(found.price).toBe(menuItemPrice);
    expect(found.ingredients).toBeUndefined();
  });

  it('ثبت سفارش آنلاین: مبلغ کل با محاسبه سمت سرور دقیقاً مطابقت دارد', async () => {
    const settingsRes = await customer.call('getPublicOrderSettings');
    expect(settingsRes.success).toBe(true);
    const s = settingsRes.settings;

    const quantity = 2;
    const subtotal = menuItemPrice * quantity;
    const taxAmount = Math.round((subtotal * s.taxPercentage) / 100);
    const expectedTotal = subtotal + taxAmount + s.packagingCost + s.defaultDeliveryFee;

    const res = await customer.call(
      'createOnlineOrder',
      [{ menuItemId, quantity }],
      'تهران، خیابان آزادی، پلاک ۱',
      0
    );
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('AWAITING_PAYMENT');
    expect(res.order.channel).toBe('ONLINE_DELIVERY');
    expect(res.order.totalAmount).toBe(expectedTotal);
    expect(res.payment.status).toBe('PENDING');
    expect(res.payment.amount).toBe(expectedTotal);

    orderId = res.order.id;
    orderTotalAmount = res.order.totalAmount;
  });

  it('مشتری دیگر نمی‌تواند سفارش این مشتری را ببیند', async () => {
    const otherCustomer = new TestClient();
    const reqRes = await otherCustomer.call('requestOtp', otherPhone);
    const verifyRes = await otherCustomer.call('verifyOtp', otherPhone, reqRes.devCode, 'مشتری دیگر');
    expect(verifyRes.success).toBe(true);

    const res = await otherCustomer.call('getMyOnlineOrder', orderId);
    expect(res.success).toBe(false);
  });

  it('مشتری صاحب سفارش می‌تواند سفارش خود را قبل از پرداخت ببیند', async () => {
    const res = await customer.call('getMyOnlineOrder', orderId);
    expect(res.success).toBe(true);
    expect(res.order.id).toBe(orderId);
    expect(res.order.status).toBe('AWAITING_PAYMENT');
  });

  it('نهایی‌سازی بعد از پرداخت: موجودی/درآمد/امتیاز اعمال و سفارش وارد صف آشپزخانه می‌شود', async () => {
    const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
    expect(finalized.status).toBe('PENDING');
    expect(finalized.deliveryStatus).toBe('PENDING_ASSIGNMENT');
    expect(finalized.pointsEarned).toBeGreaterThan(0);

    const profile = await customer.call('getCustomerProfile');
    expect(profile.success).toBe(true);
    expect(profile.customer.pointsBalance).toBe(finalized.pointsEarned);
    expect(profile.customer.totalOrders).toBe(1);
    expect(profile.customer.totalSpent).toBe(orderTotalAmount);
  });

  it('نهایی‌سازی دوباره (idempotent) تاثیر تکراری ندارد', async () => {
    const before = await customer.call('getCustomerProfile');
    const pointsBefore = before.customer.pointsBalance;

    const finalizedAgain = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
    expect(finalizedAgain.status).toBe('PENDING');

    const after = await customer.call('getCustomerProfile');
    expect(after.customer.pointsBalance).toBe(pointsBefore);
    expect(after.customer.totalOrders).toBe(1);
  });

  it('مشتری می‌تواند وضعیت سفارش تحویل‌شده را پیگیری کند', async () => {
    const res = await customer.call('getMyOnlineOrder', orderId);
    expect(res.success).toBe(true);
    expect(res.order.status).toBe('PENDING');
    expect(res.order.deliveryStatus).toBe('PENDING_ASSIGNMENT');
  });

  it('چرخه کامل پیک: تخصیص و پیشروی وضعیت تا تحویل', async () => {
    const createCourierRes = await admin.call('createCourier', { name: 'پیک تستی', phone: courierPhone });
    expect(createCourierRes.success).toBe(true);
    courierId = createCourierRes.courier.id;

    const board1 = await admin.call('getDeliveryBoard');
    expect(board1.success).toBe(true);
    expect(board1.orders.some((o: any) => o.id === orderId)).toBe(true);

    const assignRes = await admin.call('assignCourier', orderId, courierId);
    expect(assignRes.success).toBe(true);
    expect(assignRes.order.deliveryStatus).toBe('ASSIGNED');
    expect(assignRes.order.courierId).toBe(courierId);

    const step1 = await admin.call('advanceDeliveryStatus', orderId);
    expect(step1.order.deliveryStatus).toBe('PICKED_UP');

    const step2 = await admin.call('advanceDeliveryStatus', orderId);
    expect(step2.order.deliveryStatus).toBe('ON_THE_WAY');

    const step3 = await admin.call('advanceDeliveryStatus', orderId);
    expect(step3.order.deliveryStatus).toBe('DELIVERED');
    expect(step3.order.status).toBe('COMPLETED');

    const finalOrder = await customer.call('getMyOnlineOrder', orderId);
    expect(finalOrder.order.courier.id).toBe(courierId);
  });

  it('سفارش با پرداخت ناموفق لغو می‌شود', async () => {
    const res = await customer.call(
      'createOnlineOrder',
      [{ menuItemId, quantity: 1 }],
      'آدرس تستی برای لغو',
      0
    );
    expect(res.success).toBe(true);
    const failedOrderId = res.order.id;

    await admin.call('markOnlineOrderPaymentFailed', failedOrderId);

    const check = await customer.call('getMyOnlineOrder', failedOrderId);
    expect(check.order.status).toBe('CANCELLED');
  });

  it('استفاده از امتیاز: تخفیف محاسبه و سقف موجودی امتیاز رعایت می‌شود', async () => {
    const profile = await customer.call('getCustomerProfile');
    const pointsBalance = profile.customer.pointsBalance;
    expect(pointsBalance).toBeGreaterThan(0);

    const settingsRes = await customer.call('getPublicOrderSettings');
    const s = settingsRes.settings;

    const quantity = 1;
    const subtotal = menuItemPrice * quantity;
    const taxAmount = Math.round((subtotal * s.taxPercentage) / 100);
    const preDiscountTotal = subtotal + taxAmount + s.packagingCost + s.defaultDeliveryFee;

    // درخواست استفاده از تعداد امتیازی خیلی بیشتر از موجودی مشتری؛ باید سمت
    // سرور به موجودی واقعی محدود (clamp) شود.
    const overRedeemRequest = pointsBalance + 10_000;

    const res = await customer.call(
      'createOnlineOrder',
      [{ menuItemId, quantity }],
      'آدرس تستی برای امتیاز',
      overRedeemRequest
    );
    expect(res.success).toBe(true);

    const maxRedeemableByOrderValue = Math.floor(preDiscountTotal / Math.max(s.loyaltyPointValueToman, 1));
    const expectedPointsRedeemed = Math.min(pointsBalance, maxRedeemableByOrderValue);
    const expectedDiscount = expectedPointsRedeemed * s.loyaltyPointValueToman;
    const expectedTotal = Math.max(0, preDiscountTotal - expectedDiscount);

    expect(res.order.pointsRedeemed).toBe(expectedPointsRedeemed);
    expect(res.order.totalAmount).toBe(expectedTotal);
    expect(res.payment.amount).toBe(expectedTotal);
  });
});
