import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

/**
 * فاز ۱۸: جریان نقدی و مغایرت‌گیری صندوق/بانک — طبق پاسخ‌های تأییدشده‌ی کاربر:
 * (۱) حساب‌ها با سه پیش‌فرضِ سیستمی (نقد/بانک/درگاه پرداخت) شروع می‌شوند و
 *     ADMIN/ACCOUNTANT می‌توانند حساب دلخواه هم اضافه کنند؛
 * (۲) چون POS قبلاً اصلاً روش پرداخت را ثبت نمی‌کرد، یک انتخابِ نقد/کارت به
 *     ثبت سفارش صندوق اضافه شد که خودکار تراکنش را به حساب درست وصل می‌کند؛
 *     سفارش‌های آنلاین/QR همیشه به حساب «درگاه پرداخت» وصل می‌شوند؛
 * (۳) مغایرت‌گیری فقط ثبت/نمایش می‌شود — هیچ تراکنشِ اصلاحیِ خودکاری برای
 *     صفر کردنِ مغایرت ساخته نمی‌شود.
 */

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

async function makeMenuItem(admin: TestClient, price: number) {
  const item = await admin.call('createMenuItem', {
    title: `آیتم تستی فاز۱۸ ${rand()}`,
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
  const phone = `0918${rand()}`;
  const otpRes = await client.call('requestOtp', phone);
  expect(otpRes.success).toBe(true);
  const verifyRes = await client.call('verifyOtp', phone, otpRes.devCode, fullName);
  expect(verifyRes.success).toBe(true);
  return client;
}

async function getAccountBalance(admin: TestClient, accountId: string) {
  const res = await admin.call('getAccountBalances');
  expect(res.success).toBe(true);
  const row = res.accounts.find((r: any) => r.account.id === accountId);
  expect(row).toBeTruthy();
  return row.balance as number;
}

// همان شناسه‌های ثابتِ حساب‌های سیستمی که در
// prisma/migrations/20260918140000_phase18_cash_flow_accounts ساخته شده‌اند
// (نک. src/lib/accountingCategories.ts، SYSTEM_ACCOUNT_IDS).
const CASH_ACCOUNT_ID = 'txacc-cash';
const BANK_ACCOUNT_ID = 'txacc-bank';
const GATEWAY_ACCOUNT_ID = 'txacc-gateway';

describe('جریان نقدی و مغایرت‌گیری صندوق/بانک (فاز ۱۸)', () => {
  let admin: TestClient;
  let menuItemId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings');
    menuItemId = await makeMenuItem(admin, 80000);
  });

  describe('حساب‌های سیستمیِ پیش‌فرض', () => {
    it('سه حساب سیستمی (نقد/بانک/درگاه) از پیش ساخته شده‌اند', async () => {
      const res = await admin.call('getAccounts');
      expect(res.success).toBe(true);
      const byId = new Map(res.accounts.map((a: any) => [a.id, a]));
      expect(byId.get(CASH_ACCOUNT_ID)).toMatchObject({ type: 'CASH', isSystem: true });
      expect(byId.get(BANK_ACCOUNT_ID)).toMatchObject({ type: 'BANK', isSystem: true });
      expect(byId.get(GATEWAY_ACCOUNT_ID)).toMatchObject({ type: 'GATEWAY', isSystem: true });
    });
  });

  describe('اتصال خودکار تراکنش‌های صندوق (POS) به حساب', () => {
    it('سفارش صندوق با پرداختِ نقد، درآمدش را به حساب «صندوق نقد» وصل می‌کند', async () => {
      const before = await getAccountBalance(admin, CASH_ACCOUNT_ID);
      const order = await admin.call(
        'createOrder',
        [{ menuItemId, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        undefined,
        'CASH'
      );
      expect(order.success).toBe(true);
      const after = await getAccountBalance(admin, CASH_ACCOUNT_ID);
      expect(after - before).toBe(order.order.totalAmount);
    });

    it('سفارش صندوق با پرداختِ کارت، درآمدش را به حساب «بانک» وصل می‌کند', async () => {
      const before = await getAccountBalance(admin, BANK_ACCOUNT_ID);
      const order = await admin.call(
        'createOrder',
        [{ menuItemId, quantity: 1 }],
        undefined,
        undefined,
        undefined,
        undefined,
        'CARD'
      );
      expect(order.success).toBe(true);
      const after = await getAccountBalance(admin, BANK_ACCOUNT_ID);
      expect(after - before).toBe(order.order.totalAmount);
    });

    it('بدون مشخص‌کردنِ روش پرداخت، پیش‌فرض «نقد» در نظر گرفته می‌شود', async () => {
      const before = await getAccountBalance(admin, CASH_ACCOUNT_ID);
      const order = await admin.call('createOrder', [{ menuItemId, quantity: 1 }]);
      expect(order.success).toBe(true);
      const after = await getAccountBalance(admin, CASH_ACCOUNT_ID);
      expect(after - before).toBe(order.order.totalAmount);
    });

    it('روش پرداخت نامعتبر رد می‌شود', async () => {
      const res = await admin.call('createOrder', [{ menuItemId, quantity: 1 }], undefined, undefined, undefined, undefined, 'CHEQUE');
      expect(res.success).toBe(false);
    });
  });

  describe('اتصال خودکار سفارش‌های آنلاین/QR به حساب «درگاه پرداخت»', () => {
    it('finalizeOnlineOrderAfterPayment درآمد را به حساب درگاه پرداخت وصل می‌کند', async () => {
      const before = await getAccountBalance(admin, GATEWAY_ACCOUNT_ID);
      const customer = await loginNewCustomer('مشتری تستی فاز۱۸');
      const orderRes = await customer.call('createOnlineOrder', [{ menuItemId, quantity: 1 }], 'آدرس تستی فاز۱۸', 0);
      expect(orderRes.success).toBe(true);
      const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderRes.order.id);
      const after = await getAccountBalance(admin, GATEWAY_ACCOUNT_ID);
      expect(after - before).toBe(finalized.totalAmount);
    });
  });

  describe('حساب‌های دلخواه و انتقال بین‌حسابی', () => {
    it('حساب دلخواه ساخته می‌شود و انتقال بین دو حساب موجودیِ هر دو را درست تغییر می‌دهد', async () => {
      const cashCustom = await admin.call('createAccount', `صندوق تستی فاز۱۸ ${rand()}`, 'CASH');
      expect(cashCustom.success).toBe(true);
      const bankCustom = await admin.call('createAccount', `بانک تستی فاز۱۸ ${rand()}`, 'BANK');
      expect(bankCustom.success).toBe(true);

      const fund = await admin.call('createIncome', 'شارژ اولیه تستی', 200000, {
        accountId: cashCustom.account.id,
      });
      expect(fund.success).toBe(true);

      const transfer = await admin.call('createAccountTransfer', cashCustom.account.id, bankCustom.account.id, 70000, 'واریز به بانک');
      expect(transfer.success).toBe(true);

      const cashBalance = await getAccountBalance(admin, cashCustom.account.id);
      const bankBalance = await getAccountBalance(admin, bankCustom.account.id);
      expect(cashBalance).toBe(130000);
      expect(bankBalance).toBe(70000);
    });

    it('انتقال با حساب مبدا/مقصد یکسان یا مبلغ نامعتبر رد می‌شود', async () => {
      const acc = await admin.call('createAccount', `حساب تستی فاز۱۸ ${rand()}`, 'OTHER');
      expect(acc.success).toBe(true);
      expect((await admin.call('createAccountTransfer', acc.account.id, acc.account.id, 1000)).success).toBe(false);
      expect((await admin.call('createAccountTransfer', acc.account.id, CASH_ACCOUNT_ID, 0)).success).toBe(false);
      expect((await admin.call('createAccountTransfer', acc.account.id, CASH_ACCOUNT_ID, -500)).success).toBe(false);
    });
  });

  describe('مغایرت‌گیری', () => {
    it('فقط مغایرت را ثبت/نمایش می‌دهد؛ هیچ تراکنشِ اصلاحیِ خودکاری نمی‌سازد', async () => {
      const acc = await admin.call('createAccount', `حساب مغایرت‌گیری فاز۱۸ ${rand()}`, 'CASH');
      expect(acc.success).toBe(true);
      await admin.call('createIncome', 'شارژ برای تست مغایرت', 100000, { accountId: acc.account.id });

      const computedBefore = await getAccountBalance(admin, acc.account.id);
      const reconcile = await admin.call('createAccountReconciliation', acc.account.id, computedBefore + 5000, 'کسری صندوق برای بررسی');
      expect(reconcile.success).toBe(true);
      expect(reconcile.reconciliation.computedBalance).toBe(computedBefore);
      expect(reconcile.reconciliation.difference).toBe(5000);

      // مغایرت ثبت شد، اما موجودیِ محاسبه‌شده از دفتر عوض نشده — یعنی هیچ
      // تراکنشِ اصلاحیِ خودکاری برای صفر کردنِ مغایرت ساخته نشده است.
      const computedAfter = await getAccountBalance(admin, acc.account.id);
      expect(computedAfter).toBe(computedBefore);

      const history = await admin.call('getAccountReconciliations', acc.account.id);
      expect(history.success).toBe(true);
      expect(history.reconciliations.some((r: any) => r.id === reconcile.reconciliation.id)).toBe(true);
    });

    it('مغایرت‌گیری برای حسابِ ناموجود رد می‌شود', async () => {
      const res = await admin.call('createAccountReconciliation', 'not-a-real-account-id', 1000);
      expect(res.success).toBe(false);
    });
  });

  describe('تخصیصِ دستیِ حساب به تراکنش‌های بدون حساب', () => {
    it('updateTransactionCategory می‌تواند accountId یک تراکنشِ بدون‌حساب را هم تنظیم/پاک کند', async () => {
      // مثل یک تراکنشِ خودکارِ خرید از تأمین‌کننده یا حقوق که در این فاز
      // هنوز به‌طور خودکار به هیچ حسابی وصل نمی‌شود (نک. مستندات schema.prisma).
      const expense = await admin.call('createExpense', 'هزینه تستی بدون حساب فاز۱۸', 30000, {});
      expect(expense.success).toBe(true);
      expect(expense.transaction.accountId).toBeNull();

      const assigned = await admin.call('updateTransactionCategory', expense.transaction.id, { accountId: BANK_ACCOUNT_ID });
      expect(assigned.success).toBe(true);
      expect(assigned.transaction.account?.id).toBe(BANK_ACCOUNT_ID);

      const cleared = await admin.call('updateTransactionCategory', expense.transaction.id, { accountId: null });
      expect(cleared.success).toBe(true);
      expect(cleared.transaction.accountId).toBeNull();
    });
  });

  describe('کنترل دسترسی', () => {
    it('CHEF به هیچ‌کدام از اکشن‌های حساب/جریان نقدی دسترسی ندارد', async () => {
      const chefUser = await admin.call('createUser', {
        name: `آشپز تستی فاز۱۸ ${rand()}`,
        username: `chef_p18_${rand()}`,
        password: '123456',
        roles: ['CHEF'],
      });
      expect(chefUser.success).toBe(true);
      const chef = new TestClient();
      expect((await chef.call('login', chefUser.user.username, '123456')).success).toBe(true);

      expect((await chef.call('getAccounts')).success).toBe(false);
      expect((await chef.call('createAccount', 'x', 'CASH')).success).toBe(false);
      expect((await chef.call('getAccountBalances')).success).toBe(false);
      expect((await chef.call('createAccountTransfer', CASH_ACCOUNT_ID, BANK_ACCOUNT_ID, 1000)).success).toBe(false);
      expect((await chef.call('createAccountReconciliation', CASH_ACCOUNT_ID, 1000)).success).toBe(false);
    });
  });
});
