import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

/**
 * فاز ۱۶: سفارشِ خودکارِ مشتری با اسکنِ کدِ QR روی میز — ورود با OTP
 * (مثلِ سفارشِ آنلاینِ فعلی) و پرداختِ آنلاین در لحظه‌ی سفارش (همان
 * درگاهِ زرین‌پالِ مشترک)، طبقِ پاسخ‌های تأییدشده‌ی کاربر.
 *
 * تفاوتِ کلیدی با سفارشِ آنلاینِ ارسالی که این فایل روی آن تمرکز دارد:
 * سفارشِ QR روی میز از قبل به شعبه‌ی میزِ اسکن‌شده متصل است (tableId و
 * branchId)، پس کسرِ موجودی/درآمد باید به همان شعبه نسبت داده شود، نه
 * شعبه‌ی پیش‌فرض (نک. finalizeOnlineOrderAfterPayment در order.ts) —
 * برخلافِ سفارشِ آنلاینِ ارسالی که همچنان branchId ندارد و به شعبه‌ی
 * پیش‌فرض نسبت داده می‌شود (نک. تستِ رگرسیونِ انتهای این فایل).
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeMenuItemWithRecipe(
  admin: TestClient,
  price: number,
  branchId: string,
  quantityPerUnit = 2,
  currentStock = 1000
) {
  const inv = await admin.call('createInventoryItem', {
    name: `ماده تستی فاز۱۶ ${rand()}`,
    category: 'تست',
    unit: 'gram',
    currentStock,
    minStockLevel: 0,
    branchId,
  });
  expect(inv.success).toBe(true);

  const item = await admin.call('createMenuItem', {
    title: `قلم تستی فاز۱۶ ${rand()}`,
    price,
    category: 'تست',
    subCategory: '',
    imageUrl: '',
  });
  expect(item.success).toBe(true);

  const recipe = await admin.call('saveMenuItemRecipe', item.item.id, [
    { inventoryItemId: inv.item.id, quantity: quantityPerUnit, yieldPercent: 100 },
  ]);
  expect(recipe.success).toBe(true);

  return {
    menuItemId: item.item.id as string,
    price: item.item.price as number,
    inventoryItemId: inv.item.id as string,
  };
}

async function readStock(admin: TestClient, inventoryItemId: string, branchId: string) {
  const res = await admin.call('getInventoryItems', branchId);
  expect(res.success).toBe(true);
  const row = res.items.find((i: any) => i.id === inventoryItemId);
  return row ? (row.currentStock as number) : null;
}

async function loginNewCustomer(fullName: string) {
  const client = new TestClient();
  const phone = `0918${rand()}`;
  const otpRes = await client.call('requestOtp', phone);
  expect(otpRes.success).toBe(true);
  const verifyRes = await client.call('verifyOtp', phone, otpRes.devCode, fullName);
  expect(verifyRes.success).toBe(true);
  return client;
}

describe('سفارشِ خودکار مشتری با QR روی میز (فاز ۱۶)', () => {
  let admin: TestClient;
  let defaultBranchId: string;
  let tableBranchId: string;
  let tableId: string;
  let tableNumber: number;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings'); // اطمینان از وجودِ ردیفِ تنظیمات

    const branchesRes = await admin.call('getBranches');
    expect(branchesRes.success).toBe(true);
    const defaultBranch = branchesRes.branches.find((b: any) => b.isDefault);
    expect(defaultBranch).toBeTruthy();
    defaultBranchId = defaultBranch.id;

    // میزِ QR این فایل عمداً در یک شعبه‌ی غیرِپیش‌فرض ساخته می‌شود تا
    // بتوان نسبت‌دهیِ صحیحِ موجودی/درآمد به «شعبه‌ی میز» را از نسبت‌دهیِ
    // (اشتباهیِ) «شعبه‌ی پیش‌فرض» به‌وضوح تشخیص داد.
    const branchRes = await admin.call('createBranch', {
      name: `شعبه‌ی تستیِ QR ${rand()}`,
      address: 'آدرس تستی',
      phone: '02100000000',
    });
    expect(branchRes.success).toBe(true);
    tableBranchId = branchRes.branch.id;

    tableNumber = 8000 + Math.floor(Math.random() * 900);
    const tableRes = await admin.call('createTable', tableNumber, 4, tableBranchId);
    expect(tableRes.success).toBe(true);
    tableId = tableRes.table.id;
  });

  describe('getTableForOrder: بدونِ نیاز به ورود، برای اعتبارسنجیِ کدِ QR پیش از OTP', () => {
    it('میزِ معتبر: شماره، شناسه‌ی شعبه و نامِ شعبه را برمی‌گرداند', async () => {
      const anonymous = new TestClient();
      const res = await anonymous.call('getTableForOrder', tableId);
      expect(res.success).toBe(true);
      expect(res.table.id).toBe(tableId);
      expect(res.table.number).toBe(tableNumber);
      expect(res.table.branchId).toBe(tableBranchId);
      expect(typeof res.table.branchName).toBe('string');
    });

    it('شناسه‌ی میزِ نامعتبر/حذف‌شده: خطا برمی‌گرداند نه throw', async () => {
      const anonymous = new TestClient();
      const res = await anonymous.call('getTableForOrder', 'not-a-real-table-id');
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
    });
  });

  describe('createDineInQrOrder: ورود با OTP الزامی است (طبقِ تأییدِ کاربر)', () => {
    it('بدونِ ورود، ثبتِ سفارش رد می‌شود', async () => {
      const anonymous = new TestClient();
      const res = await anonymous.call('createDineInQrOrder', tableId, [
        { menuItemId: 'whatever', quantity: 1 },
      ]);
      expect(res.success).toBe(false);
    });
  });

  describe('createDineInQrOrder: اعتبارسنجیِ ورودی', () => {
    it('میزِ نامعتبر رد می‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی QR اعتبارسنجی میز');
      const res = await customer.call('createDineInQrOrder', 'not-a-real-table-id', [
        { menuItemId: 'x', quantity: 1 },
      ]);
      expect(res.success).toBe(false);
    });

    it('سبدِ خالی رد می‌شود', async () => {
      const customer = await loginNewCustomer('مشتری تستی QR سبد خالی');
      const res = await customer.call('createDineInQrOrder', tableId, []);
      expect(res.success).toBe(false);
    });
  });

  describe('createDineInQrOrder: محاسبه‌ی قیمت و اتصال به میز/شعبه', () => {
    it('مبلغ بدونِ هزینه‌ی بسته‌بندی/ارسال محاسبه می‌شود و سفارش به میز و شعبه‌ی آن متصل است', async () => {
      const { menuItemId, price } = await makeMenuItemWithRecipe(admin, 120000, tableBranchId, 2, 500);

      const settingsRes = await admin.call('getSettings');
      expect(settingsRes.success).toBe(true);
      const taxPercentage = settingsRes.settings.taxPercentage as number;

      const customer = await loginNewCustomer('مشتری تستی QR سفارش کامل');
      const quantity = 2;
      const subtotal = price * quantity;
      const expectedTax = Math.round((subtotal * taxPercentage) / 100);
      const expectedTotal = subtotal + expectedTax;

      const res = await customer.call('createDineInQrOrder', tableId, [{ menuItemId, quantity }]);
      expect(res.success).toBe(true);
      expect(res.order.status).toBe('AWAITING_PAYMENT');
      expect(res.order.channel).toBe('QR_DINE_IN');
      expect(res.order.tableId).toBe(tableId);
      expect(res.order.branchId).toBe(tableBranchId);
      expect(res.order.deliveryFee).toBe(0);
      expect(res.order.totalAmount).toBe(expectedTotal);
      expect(res.payment.status).toBe('PENDING');
      expect(res.payment.amount).toBe(expectedTotal);
    });
  });

  describe('finalizeOnlineOrderAfterPayment: نسبت‌دهیِ آگاه به شعبه (فاز ۱۶)', () => {
    it('موجودی و درآمد از شعبه‌ی میزِ اسکن‌شده کسر/ثبت می‌شود، نه شعبه‌ی پیش‌فرض؛ deliveryStatus بی‌معناست', async () => {
      const { menuItemId, inventoryItemId } = await makeMenuItemWithRecipe(
        admin,
        90000,
        tableBranchId,
        3,
        200
      );

      const beforeTableBranch = await readStock(admin, inventoryItemId, tableBranchId);
      const beforeDefaultBranch = await readStock(admin, inventoryItemId, defaultBranchId);
      // این ماده اصلاً در شعبه‌ی پیش‌فرض موجودی ندارد (چون فقط برایِ
      // tableBranchId ساخته شد) — اثباتِ اضافه‌ای که هیچ ردیفِ اشتباهی
      // در شعبه‌ی پیش‌فرض لمس نمی‌شود.
      expect(beforeDefaultBranch).toBeNull();

      const customer = await loginNewCustomer('مشتری تستی QR نهایی‌سازی');
      const quantity = 3;
      const orderRes = await customer.call('createDineInQrOrder', tableId, [
        { menuItemId, quantity },
      ]);
      expect(orderRes.success).toBe(true);
      const orderId = orderRes.order.id as string;
      const orderNumber = orderRes.order.orderNumber as string;

      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderId);
      expect(finalized.status).toBe('PENDING');
      // فاز ۱۶: برخلافِ سفارشِ آنلاینِ ارسالی، سفارشِ QR روی میز مستقیماً به
      // آشپزخانه می‌رود — هیچ خطِ تحویلی وجود ندارد.
      expect(finalized.deliveryStatus).toBeFalsy();

      const afterTableBranch = await readStock(admin, inventoryItemId, tableBranchId);
      expect(beforeTableBranch! - afterTableBranch!).toBe(3 * quantity);

      // شعبه‌ی پیش‌فرض همچنان هیچ ردیفِ موجودی برایِ این ماده ندارد —
      // یعنی finalize اصلاً به آن شعبه دست نزده است.
      const afterDefaultBranch = await readStock(admin, inventoryItemId, defaultBranchId);
      expect(afterDefaultBranch).toBeNull();

      // تراکنشِ درآمدِ ثبت‌شده باید به شعبه‌ی میز نسبت داده شده باشد.
      const txRes = await admin.call('getTransactions');
      expect(txRes.success).toBe(true);
      const tx = txRes.transactions.find((t: any) => t.referenceId === orderId && t.referenceType === 'ORDER');
      expect(tx).toBeTruthy();
      expect(tx.branchId).toBe(tableBranchId);
      expect(tx.description).toContain(orderNumber);
    });
  });

  describe('رگرسیون: مسیرِ سفارشِ آنلاینِ ارسالیِ قبلی (ONLINE_DELIVERY) دست‌نخورده می‌ماند', () => {
    it('نهایی‌سازیِ سفارشِ آنلاینِ ارسالی همچنان از شعبه‌ی پیش‌فرض کسر می‌کند و deliveryStatus ست می‌شود', async () => {
      const { menuItemId, inventoryItemId } = await makeMenuItemWithRecipe(
        admin,
        70000,
        defaultBranchId,
        1,
        300
      );

      const before = await readStock(admin, inventoryItemId, defaultBranchId);

      const customer = await loginNewCustomer('مشتری تستی رگرسیونِ آنلاین');
      const quantity = 1;
      const orderRes = await customer.call(
        'createOnlineOrder',
        [{ menuItemId, quantity }],
        'آدرس تستی رگرسیون فاز۱۶',
        0
      );
      expect(orderRes.success).toBe(true);
      expect(orderRes.order.channel).toBe('ONLINE_DELIVERY');
      expect(orderRes.order.branchId).toBeFalsy();

      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderRes.order.id);
      expect(finalized.status).toBe('PENDING');
      expect(finalized.deliveryStatus).toBe('PENDING_ASSIGNMENT');

      const after = await readStock(admin, inventoryItemId, defaultBranchId);
      expect(before! - after!).toBe(1 * quantity);
    });
  });

  describe('پیگیریِ سفارشِ QR توسطِ مشتری (بازاستفاده از getMyOnlineOrder)', () => {
    it('مشتریِ صاحبِ سفارش می‌تواند سفارشِ QR خود را ببیند؛ مشتریِ دیگر نمی‌تواند', async () => {
      const { menuItemId } = await makeMenuItemWithRecipe(admin, 50000, tableBranchId, 1, 400);

      const customer = await loginNewCustomer('مشتری تستی پیگیریِ QR');
      const orderRes = await customer.call('createDineInQrOrder', tableId, [
        { menuItemId, quantity: 1 },
      ]);
      expect(orderRes.success).toBe(true);
      const orderId = orderRes.order.id as string;

      const own = await customer.call('getMyOnlineOrder', orderId);
      expect(own.success).toBe(true);
      expect(own.order.id).toBe(orderId);
      expect(own.order.channel).toBe('QR_DINE_IN');
      // پیش از پرداخت هنوز deliveryStatus سفارش خالی است (اصلاً بخشِ
      // تحویل برای این کانال معنا ندارد — نک. توضیحاتِ finalize بالا).
      expect(own.order.deliveryStatus).toBeFalsy();

      const otherCustomer = await loginNewCustomer('مشتریِ دیگرِ فاز۱۶');
      const other = await otherCustomer.call('getMyOnlineOrder', orderId);
      expect(other.success).toBe(false);
    });
  });
});
