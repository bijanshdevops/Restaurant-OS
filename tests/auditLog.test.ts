import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

describe('لاگ عملیات و ممیزی (فاز ۱۱)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی لاگ ${rand()}`,
      username: `cashier_audit_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی: فقط ADMIN', () => {
    it('CASHIER به getAuditLogs/getAuditActionList دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getAuditLogs')).success).toBe(false);
      expect((await cashierOnly.call('getAuditActionList')).success).toBe(false);
    });
  });

  describe('ورود موفق/ناموفق', () => {
    it('ورود موفق یک رویداد LOGIN_SUCCESS با actor صحیح ثبت می‌کند', async () => {
      const username = `audit_login_${rand()}`;
      const userRes = await admin.call('createUser', {
        name: `کاربر تستی ورود ${rand()}`,
        username,
        password: '123456',
        roles: ['CASHIER'],
      });
      expect(userRes.success).toBe(true);

      const client = new TestClient();
      const loginRes = await client.call('login', username, '123456');
      expect(loginRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'LOGIN_SUCCESS', entityType: 'User' });
      expect(logsRes.success).toBe(true);
      const found = logsRes.logs.find((l: any) => l.entityId === userRes.user.id);
      expect(found).toBeTruthy();
      expect(found.actorUserId).toBe(userRes.user.id);
      expect(found.actorName).toBe(userRes.user.name);
      expect(found.success).toBe(true);
    });

    it('ورود با رمز اشتباه یک رویداد LOGIN_FAILURE ثبت می‌کند (actorUserId موجود، چون کاربر واقعی است)', async () => {
      const username = `audit_badlogin_${rand()}`;
      const userRes = await admin.call('createUser', {
        name: `کاربر تستی ورود ناموفق ${rand()}`,
        username,
        password: '123456',
        roles: ['CASHIER'],
      });
      expect(userRes.success).toBe(true);

      const client = new TestClient();
      const loginRes = await client.call('login', username, 'wrong-password');
      expect(loginRes.success).toBe(false);

      const logsRes = await admin.call('getAuditLogs', { action: 'LOGIN_FAILURE' });
      expect(logsRes.success).toBe(true);
      const found = logsRes.logs.find((l: any) => l.actorName === username);
      expect(found).toBeTruthy();
      expect(found.actorUserId).toBe(userRes.user.id);
      expect(found.success).toBe(false);
    });

    it('ورود با نام کاربری ناموجود، LOGIN_FAILURE بدون actorUserId ثبت می‌کند (بدون افشای رمز عبور در هیچ‌جا)', async () => {
      const username = `audit_nouser_${rand()}`;
      const client = new TestClient();
      const loginRes = await client.call('login', username, 'whatever');
      expect(loginRes.success).toBe(false);

      const logsRes = await admin.call('getAuditLogs', { action: 'LOGIN_FAILURE' });
      const found = logsRes.logs.find((l: any) => l.actorName === username);
      expect(found).toBeTruthy();
      expect(found.actorUserId).toBeNull();
    });
  });

  describe('ایجاد/حذف کاربر', () => {
    it('createUser یک رویداد USER_CREATED ثبت می‌کند', async () => {
      const username = `audit_newuser_${rand()}`;
      const userRes = await admin.call('createUser', {
        name: `کاربر تستی ایجاد ${rand()}`,
        username,
        password: '123456',
        roles: ['CASHIER'],
      });
      expect(userRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'USER_CREATED', entityType: 'User' });
      const found = logsRes.logs.find((l: any) => l.entityId === userRes.user.id);
      expect(found).toBeTruthy();
      expect(found.metadata.username).toBe(username);
    });

    it('deleteUser یک رویداد USER_DELETED ثبت می‌کند', async () => {
      const username = `audit_deluser_${rand()}`;
      const userRes = await admin.call('createUser', {
        name: `کاربر تستی حذف ${rand()}`,
        username,
        password: '123456',
        roles: ['CASHIER'],
      });
      expect(userRes.success).toBe(true);

      const delRes = await admin.call('deleteUser', userRes.user.id);
      expect(delRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'USER_DELETED', entityType: 'User' });
      const found = logsRes.logs.find((l: any) => l.entityId === userRes.user.id);
      expect(found).toBeTruthy();
      expect(found.metadata.username).toBe(username);
    });
  });

  describe('حذف/ویرایش تراکنش مالی', () => {
    it('deleteTransaction یک رویداد TRANSACTION_DELETED ثبت می‌کند', async () => {
      const expenseRes = await admin.call('createExpense', 'هزینه‌ی تستی لاگ', 10000);
      expect(expenseRes.success).toBe(true);

      const delRes = await admin.call('deleteTransaction', expenseRes.transaction.id);
      expect(delRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'TRANSACTION_DELETED', entityType: 'Transaction' });
      const found = logsRes.logs.find((l: any) => l.entityId === expenseRes.transaction.id);
      expect(found).toBeTruthy();
      expect(found.metadata.amount).toBe(10000);
    });

    it('updateTransactionCategory یک رویداد TRANSACTION_UPDATED ثبت می‌کند', async () => {
      const expenseRes = await admin.call('createExpense', 'هزینه‌ی تستی ویرایش لاگ', 20000);
      expect(expenseRes.success).toBe(true);

      const updateRes = await admin.call('updateTransactionCategory', expenseRes.transaction.id, {
        description: 'شرح ویرایش‌شده',
      });
      expect(updateRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'TRANSACTION_UPDATED', entityType: 'Transaction' });
      const found = logsRes.logs.find((l: any) => l.entityId === expenseRes.transaction.id);
      expect(found).toBeTruthy();
      expect(found.metadata.changes.description).toBe('شرح ویرایش‌شده');
    });
  });

  describe('ثبت مرجوعی', () => {
    it('createRefund یک رویداد REFUND_CREATED ثبت می‌کند', async () => {
      const itemRes = await admin.call('createMenuItem', {
        title: `قلم تستی لاگ ${rand()}`,
        price: 50000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(itemRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: itemRes.item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');

      const refundRes = await admin.call('createRefund', {
        orderId: orderRes.order.id,
        isFullRefund: true,
        reason: 'تست لاگ مرجوعی',
      });
      expect(refundRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'REFUND_CREATED', entityType: 'Refund' });
      const found = logsRes.logs.find((l: any) => l.entityId === refundRes.refund.id);
      expect(found).toBeTruthy();
      expect(found.metadata.orderNumber).toBe(orderRes.order.orderNumber);
    });
  });

  describe('تغییر تنظیمات', () => {
    it('updateSettings یک رویداد SETTINGS_UPDATED ثبت می‌کند', async () => {
      const current = await admin.call('getSettings');
      expect(current.success).toBe(true);

      const updateRes = await admin.call('updateSettings', {
        taxPercentage: current.settings.taxPercentage,
        packagingCost: current.settings.packagingCost,
        restaurantName: current.settings.restaurantName,
        contactNumber: current.settings.contactNumber,
        footerMessage: `پیام تست لاگ ${rand()}`,
      });
      expect(updateRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', {
        action: 'SETTINGS_UPDATED',
        entityType: 'RestaurantSettings',
      });
      expect(logsRes.success).toBe(true);
      expect(logsRes.logs.length).toBeGreaterThan(0);
      expect(logsRes.logs[0].metadata.footerMessage).toBeTruthy();
    });

    it('updateModianSettings متن کلید API را هرگز در متادیتای لاگ ذخیره نمی‌کند', async () => {
      const updateRes = await admin.call('updateModianSettings', {
        modianEnabled: false,
        economicCode: '123',
        nationalId: '456',
        tspProviderName: 'تست',
        tspApiBaseUrl: 'https://example.test',
        tspApiKey: 'یک-کلید-بسیار-محرمانه',
      });
      expect(updateRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'SETTINGS_UPDATED', entityType: 'ModianSettings' });
      expect(logsRes.success).toBe(true);
      expect(logsRes.logs.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(logsRes.logs[0].metadata);
      expect(serialized).not.toContain('یک-کلید-بسیار-محرمانه');
      expect(logsRes.logs[0].metadata.apiKeyChanged).toBe(true);
    });
  });

  describe('اجرای حقوق‌دهی', () => {
    it('runPayroll یک رویداد PAYROLL_RUN ثبت می‌کند', async () => {
      const staffUser = await admin.call('createUser', {
        name: `پرسنل تستی حقوق لاگ ${rand()}`,
        username: `audit_payroll_${rand()}`,
        password: '123456',
        roles: ['CASHIER'],
      });
      expect(staffUser.success).toBe(true);
      const staffId = staffUser.user.id;

      const staffClient = new TestClient();
      const loginRes = await staffClient.call('login', staffUser.user.username, '123456');
      expect(loginRes.success).toBe(true);

      const today = new Date();
      const start = new Date(today.getTime() + 60_000);
      const end = new Date(today.getTime() + 3_600_000);
      const shiftRes = await admin.call('createShift', {
        date: today.toISOString().slice(0, 10),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      expect(shiftRes.success).toBe(true);

      const assignRes = await admin.call('assignStaffToShift', shiftRes.shift.id, staffId);
      expect(assignRes.success).toBe(true);

      const clockInRes = await staffClient.call('clockIn', assignRes.assignment.id);
      expect(clockInRes.success).toBe(true);
      await new Promise((r) => setTimeout(r, 1100));
      const clockOutRes = await staffClient.call('clockOut', assignRes.assignment.id);
      expect(clockOutRes.success).toBe(true);

      await admin.call('updateUserHourlyRate', staffId, 500_000);

      const payrollRes = await admin.call('runPayroll', staffId, '2000-01-01', '2100-01-01');
      expect(payrollRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { action: 'PAYROLL_RUN', entityType: 'PayrollPayment' });
      const found = logsRes.logs.find((l: any) => l.entityId === payrollRes.payment.id);
      expect(found).toBeTruthy();
      expect(found.metadata.targetUserId).toBe(staffId);
    });
  });

  describe('عدم ثبت رویدادهای معمولی (فقط رویدادهای حساس)', () => {
    it('ثبت یک سفارش عادی POS هیچ ردیفی در لاگ ممیزی ایجاد نمی‌کند', async () => {
      const itemRes = await admin.call('createMenuItem', {
        title: `قلم تستی بدون‌لاگ ${rand()}`,
        price: 15000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(itemRes.success).toBe(true);

      const orderRes = await admin.call('createOrder', [{ menuItemId: itemRes.item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);

      const logsRes = await admin.call('getAuditLogs', { limit: 500 });
      expect(logsRes.success).toBe(true);
      const relatedToOrder = logsRes.logs.filter((l: any) => l.entityId === orderRes.order.id);
      expect(relatedToOrder.length).toBe(0);
    });
  });
});
