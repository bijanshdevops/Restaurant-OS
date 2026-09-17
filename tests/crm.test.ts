import { describe, it, expect, beforeAll } from 'vitest';
import { TestClient, loginAsAdmin } from './helpers';

/**
 * تست سراسری فاز ۶ (CRM و بازاریابی): پروفایل مشتری/یادداشت‌ها، بخش‌بندی و
 * کمپین‌های پیامکی (فقط ADMIN)، بازخورد سفارش (فقط مشتریِ صاحب سفارشِ
 * COMPLETED)، و برنامه‌ی معرفی (پاداش یک‌باره‌ی معرفی‌کننده در اولین سفارش
 * مشتریِ معرفی‌شده). getCustomers/createCustomer (که کارکنان صندوق هم به آن
 * نیاز دارند) عمداً دست‌نخورده مانده‌اند و اینجا فقط رگرسیونشان بررسی می‌شود.
 */

function randomPhone(): string {
  return '09' + (100000000 + Math.floor(Math.random() * 899999999)).toString();
}

function uniqueSuffix(): string {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

describe('CRM و بازاریابی (فاز ۶)', () => {
  let admin: TestClient;
  let cashier: TestClient;
  let menuItemId: string;
  const testTag = 'تگ-تست-' + uniqueSuffix();

  let customerAId: string;
  let customerBId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const menuRes = await admin.call('createMenuItem', {
      title: 'برگر تست CRM ' + uniqueSuffix(),
      price: 100000,
      category: 'غذا',
      subCategory: '',
      imageUrl: '',
    });
    menuItemId = menuRes.item.id;

    const cashierUsername = 'cashier_crm_' + uniqueSuffix();
    const createCashierRes = await admin.call('createUser', {
      name: 'صندوقدار تست CRM',
      username: cashierUsername,
      password: 'test123456',
      roles: ['CASHIER'],
    });
    expect(createCashierRes.success).toBe(true);

    cashier = new TestClient();
    const cashierLoginRes = await cashier.call('login', cashierUsername, 'test123456');
    expect(cashierLoginRes.success).toBe(true);

    const customerA = await admin.call('createCustomer', { fullName: 'مشتری الف CRM', phone: randomPhone() });
    const customerB = await admin.call('createCustomer', { fullName: 'مشتری ب CRM', phone: randomPhone() });
    customerAId = customerA.customer.id;
    customerBId = customerB.customer.id;

    await admin.call('updateCustomerProfile', customerAId, {
      email: 'customerA@test.local',
      tags: [testTag],
      marketingOptIn: true,
    });
    await admin.call('updateCustomerProfile', customerBId, {
      tags: [testTag],
      marketingOptIn: false, // این مشتری از دریافت پیامک بازاریابی صرف‌نظر کرده
    });
  });

  it('کارکنان صندوق همچنان به فهرست مشتریان (برای اتصال به سفارش) دسترسی دارند', async () => {
    const res = await cashier.call('getCustomers');
    expect(res.success).toBe(true);
    expect(Array.isArray(res.customers)).toBe(true);
  });

  it('مدیریت پروفایل CRM، یادداشت‌ها و کمپین‌ها فقط برای ADMIN است — کارکنان صندوق دسترسی ندارند', async () => {
    const detailRes = await cashier.call('getCustomerDetail', customerAId);
    expect(detailRes.success).toBe(false);

    const noteRes = await cashier.call('addCustomerNote', customerAId, 'یادداشت غیرمجاز');
    expect(noteRes.success).toBe(false);

    const profileRes = await cashier.call('updateCustomerProfile', customerAId, { email: 'x@x.com' });
    expect(profileRes.success).toBe(false);

    const campaignRes = await cashier.call('createCampaign', { name: 'کمپین غیرمجاز', message: 'سلام', segmentType: 'ALL' });
    expect(campaignRes.success).toBe(false);

    const listRes = await cashier.call('getCampaigns');
    expect(listRes.success).toBe(false);

    const birthdayRes = await cashier.call('getUpcomingBirthdayCustomers', 30);
    expect(birthdayRes.success).toBe(false);
  });

  it('ADMIN می‌تواند پروفایل مشتری (ایمیل/برچسب/رضایت بازاریابی) را ویرایش و یادداشت داخلی ثبت کند', async () => {
    const noteRes = await admin.call('addCustomerNote', customerAId, 'مشتری بسیار خوش‌رفتار');
    expect(noteRes.success).toBe(true);

    const detailRes = await admin.call('getCustomerDetail', customerAId);
    expect(detailRes.success).toBe(true);
    expect(detailRes.customer.email).toBe('customerA@test.local');
    expect(detailRes.customer.tags).toContain(testTag);
    expect(detailRes.customer.marketingOptIn).toBe(true);
    expect(detailRes.customer.notes.length).toBeGreaterThanOrEqual(1);
    expect(detailRes.customer.notes[0].content).toBe('مشتری بسیار خوش‌رفتار');
  });

  it('یادداشتِ خالی رد می‌شود', async () => {
    const res = await admin.call('addCustomerNote', customerAId, '   ');
    expect(res.success).toBe(false);
  });

  it('پیش‌نمایش بخش‌بندی (segment) به‌درستی رضایت دریافت پیامک را در نظر می‌گیرد', async () => {
    const res = await admin.call('getCustomerSegmentPreview', 'TAG', { tag: testTag });
    expect(res.success).toBe(true);
    expect(res.totalInSegment).toBe(2); // customerA + customerB
    expect(res.optedInCount).toBe(1); // فقط customerA رضایت داده
  });

  let campaignId: string;

  it('ADMIN یک کمپینِ پیش‌نویس می‌سازد که فقط شامل مشتریانِ راضی به دریافت پیامک است', async () => {
    const res = await admin.call('createCampaign', {
      name: 'کمپین تست ' + uniqueSuffix(),
      message: 'سلام! یک پیشنهاد ویژه برای شما داریم.',
      segmentType: 'TAG',
      segmentParams: { tag: testTag },
    });
    expect(res.success).toBe(true);
    expect(res.campaign.status).toBe('DRAFT');
    expect(res.campaign.recipientCount).toBe(1);
    campaignId = res.campaign.id;
  });

  it('ارسال کمپین، پیامک را فقط به مشتریان راضی می‌فرستد و وضعیت را SENT می‌کند', async () => {
    const res = await admin.call('sendCampaign', campaignId);
    expect(res.success).toBe(true);
    expect(res.campaign.status).toBe('SENT');
    expect(res.campaign.sentCount).toBe(1);
    expect(res.campaign.failedCount).toBe(0);

    const detailRes = await admin.call('getCampaignDetail', campaignId);
    expect(detailRes.success).toBe(true);
    expect(detailRes.campaign.recipients.length).toBe(1);
    expect(detailRes.campaign.recipients[0].customer.id).toBe(customerAId);
    expect(detailRes.campaign.recipients[0].status).toBe('SENT');
  });

  it('یک کمپینِ ارسال‌شده دوباره قابل ارسال نیست', async () => {
    const res = await admin.call('sendCampaign', campaignId);
    expect(res.success).toBe(false);
  });

  describe('بازخورد سفارش', () => {
    let feedbackCustomer: TestClient;
    let otherCustomer: TestClient;
    let completedOrderId: string;
    let pendingOrderId: string;
    const feedbackPhone = randomPhone();
    const otherPhone = randomPhone();

    beforeAll(async () => {
      feedbackCustomer = new TestClient();
      const req = await feedbackCustomer.call('requestOtp', feedbackPhone);
      const verify = await feedbackCustomer.call('verifyOtp', feedbackPhone, req.devCode, 'مشتری بازخورد');
      expect(verify.success).toBe(true);

      otherCustomer = new TestClient();
      const req2 = await otherCustomer.call('requestOtp', otherPhone);
      const verify2 = await otherCustomer.call('verifyOtp', otherPhone, req2.devCode, 'مشتری دیگر');
      expect(verify2.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId, quantity: 1 }], verify.customer.id);
      expect(orderRes.success).toBe(true);
      completedOrderId = orderRes.order.id;
      await admin.call('updateOrderStatus', completedOrderId, 'PREPARING');
      await admin.call('updateOrderStatus', completedOrderId, 'READY');
      await admin.call('updateOrderStatus', completedOrderId, 'COMPLETED');

      const pendingOrderRes = await admin.call('createOrder', [{ menuItemId, quantity: 1 }], verify.customer.id);
      pendingOrderId = pendingOrderRes.order.id; // عمداً در وضعیت PENDING باقی می‌ماند
    });

    it('فقط برای سفارش‌های تکمیل‌شده می‌توان بازخورد ثبت کرد', async () => {
      const res = await feedbackCustomer.call('submitOrderFeedback', pendingOrderId, 4);
      expect(res.success).toBe(false);
    });

    it('یک مشتری نمی‌تواند برای سفارشِ مشتریِ دیگر بازخورد ثبت کند', async () => {
      const res = await otherCustomer.call('submitOrderFeedback', completedOrderId, 5);
      expect(res.success).toBe(false);
    });

    it('مشتریِ صاحبِ سفارشِ تکمیل‌شده می‌تواند بازخورد ثبت کند', async () => {
      const res = await feedbackCustomer.call('submitOrderFeedback', completedOrderId, 5, 'عالی بود، ممنون!');
      expect(res.success).toBe(true);
      expect(res.feedback.rating).toBe(5);
    });

    it('برای یک سفارش نمی‌توان دوباره بازخورد ثبت کرد', async () => {
      const res = await feedbackCustomer.call('submitOrderFeedback', completedOrderId, 3);
      expect(res.success).toBe(false);
    });

    it('ADMIN می‌تواند فهرست همه‌ی بازخوردها و میانگین امتیاز را ببیند', async () => {
      const res = await admin.call('getFeedbackList');
      expect(res.success).toBe(true);
      const mine = res.feedbacks.find((f: any) => f.order.orderNumber && f.rating === 5 && f.comment === 'عالی بود، ممنون!');
      expect(mine).toBeTruthy();
      expect(res.averageRating).toBeGreaterThan(0);
    });
  });

  describe('برنامه‌ی معرفی', () => {
    let referrer: TestClient;
    let referred: TestClient;
    let referrerCustomerId: string;
    let referredCustomerId: string;
    let referrerReferralCode: string;
    let expectedBonus: number;
    const referrerPhone = randomPhone();
    const referredPhone = randomPhone();

    beforeAll(async () => {
      referrer = new TestClient();
      const req = await referrer.call('requestOtp', referrerPhone);
      const verify = await referrer.call('verifyOtp', referrerPhone, req.devCode, 'معرفی‌کننده');
      expect(verify.success).toBe(true);
      referrerCustomerId = verify.customer.id;

      const referralInfoRes = await referrer.call('getMyReferralInfo');
      expect(referralInfoRes.success).toBe(true);
      expect(referralInfoRes.referralCode).toBeTruthy();
      referrerReferralCode = referralInfoRes.referralCode;

      const settingsRes = await admin.call('getSettings');
      expectedBonus = settingsRes.settings.referralBonusPoints;

      referred = new TestClient();
      const req2 = await referred.call('requestOtp', referredPhone);
      const verify2 = await referred.call('verifyOtp', referredPhone, req2.devCode, 'مشتریِ معرفی‌شده', referrerReferralCode);
      expect(verify2.success).toBe(true);
      referredCustomerId = verify2.customer.id;
    });

    it('ثبت‌نام با کد معرفی، مشتریِ معرفی‌کننده را به‌عنوان referredByCustomer ثبت می‌کند', async () => {
      const infoRes = await referrer.call('getMyReferralInfo');
      expect(infoRes.referredCount).toBe(1);
      expect(infoRes.rewardedCount).toBe(0); // هنوز سفارشی ثبت نشده
    });

    it('در اولین سفارشِ مشتریِ معرفی‌شده، معرفی‌کننده پاداش امتیازی یک‌باره می‌گیرد', async () => {
      const beforeRes = await admin.call('getCustomerDetail', referrerCustomerId);
      const balanceBefore = beforeRes.customer.pointsBalance;

      const orderRes = await admin.call('createOrder', [{ menuItemId, quantity: 1 }], referredCustomerId);
      expect(orderRes.success).toBe(true);

      const afterRes = await admin.call('getCustomerDetail', referrerCustomerId);
      expect(afterRes.customer.pointsBalance).toBe(balanceBefore + expectedBonus);

      const infoRes = await referrer.call('getMyReferralInfo');
      expect(infoRes.rewardedCount).toBe(1);
    });

    it('در سفارش‌های بعدیِ همان مشتری، پاداش دوباره اعطا نمی‌شود', async () => {
      const beforeRes = await admin.call('getCustomerDetail', referrerCustomerId);
      const balanceBefore = beforeRes.customer.pointsBalance;

      await admin.call('createOrder', [{ menuItemId, quantity: 1 }], referredCustomerId);

      const afterRes = await admin.call('getCustomerDetail', referrerCustomerId);
      expect(afterRes.customer.pointsBalance).toBe(balanceBefore); // بدون تغییر
    });
  });

  it('مشتریانِ با تاریخ تولدِ نزدیک در بخش «تولد نزدیک» شناسایی می‌شوند', async () => {
    const today = new Date();
    const isoBirthday = today.toISOString().slice(0, 10); // امروز، چند سال قبل هم فرقی ندارد (فقط ماه/روز مهم است)
    await admin.call('updateCustomerProfile', customerAId, { dateOfBirth: isoBirthday });

    const res = await admin.call('getUpcomingBirthdayCustomers', 30);
    expect(res.success).toBe(true);
    const found = res.customers.find((c: any) => c.id === customerAId);
    expect(found).toBeTruthy();
  });
});
