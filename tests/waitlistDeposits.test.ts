import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

const SYSTEM_CATEGORY_IDS = {
  INCOME_RESERVATION_DEPOSIT: 'txcat-income-reservation-deposit',
  EXPENSE_RESERVATION_DEPOSIT_REFUND: 'txcat-expense-reservation-deposit-refund',
};

async function makeTable(admin: TestClient, branchId?: string) {
  const number = 9000 + Math.floor(Math.random() * 90000);
  const res = await admin.call('createTable', number, 4, branchId);
  expect(res.success).toBe(true);
  return res.table as { id: string; number: number; branchId: string };
}

describe('لیست انتظار و رزرو با پیش‌پرداخت (فاز ۱۲)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;
  let chefOnly: TestClient;
  let tableId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    await admin.call('getSettings');

    const table = await makeTable(admin);
    tableId = table.id;

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی فاز۱۲ ${rand()}`,
      username: `cashier_p12_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    expect((await cashierOnly.call('login', cashierUser.user.username, '123456')).success).toBe(true);

    const chefUser = await admin.call('createUser', {
      name: `آشپز تستی فاز۱۲ ${rand()}`,
      username: `chef_p12_${rand()}`,
      password: '123456',
      roles: ['CHEF'],
    });
    expect(chefUser.success).toBe(true);
    chefOnly = new TestClient();
    expect((await chefOnly.call('login', chefUser.user.username, '123456')).success).toBe(true);
  });

  describe('کنترل دسترسی: ADMIN + CASHIER (مثل رزرو فعلی)', () => {
    it('CHEF به هیچ‌کدام از اکشن‌های لیست انتظار و پیش‌پرداخت دسترسی ندارد', async () => {
      expect((await chefOnly.call('getWaitlist')).success).toBe(false);
      expect(
        (await chefOnly.call('joinWaitlist', { guestName: 'ت', guestPhone: '0912', partySize: 2 })).success
      ).toBe(false);
      expect((await chefOnly.call('seatFromWaitlist', 'x', 'y')).success).toBe(false);
      expect((await chefOnly.call('cancelWaitlistEntry', 'x')).success).toBe(false);
      expect((await chefOnly.call('refundReservationDeposit', 'x')).success).toBe(false);
    });

    it('CASHIER دقیقاً مثل ADMIN به این اکشن‌ها دسترسی دارد', async () => {
      const joinRes = await cashierOnly.call('joinWaitlist', {
        guestName: `مشتری کشیر ${rand()}`,
        guestPhone: '09121111111',
        partySize: 2,
      });
      expect(joinRes.success).toBe(true);

      const listRes = await cashierOnly.call('getWaitlist');
      expect(listRes.success).toBe(true);

      const cancelRes = await cashierOnly.call('cancelWaitlistEntry', joinRes.entry.id);
      expect(cancelRes.success).toBe(true);
    });
  });

  describe('پیش‌پرداخت رزرو: ثبت درآمد و استرداد', () => {
    it('ثبت رزرو با پیش‌پرداخت، یک تراکنش INCOME با دسته‌ی سیستمی مخصوص می‌سازد', async () => {
      const time = new Date(Date.now() + 2 * 60 * 60000).toISOString();
      const res = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری پیش‌پرداخت ۱',
        guestPhone: '09130000001',
        partySize: 2,
        reservationTime: time,
        depositAmount: 200000,
      });
      expect(res.success).toBe(true);
      expect(res.reservation.depositAmount).toBe(200000);

      const txRes = await admin.call('getTransactions', {});
      expect(txRes.success).toBe(true);
      const depositTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'RESERVATION_DEPOSIT' && t.referenceId === res.reservation.id
      );
      expect(depositTx).toBeTruthy();
      expect(depositTx.type).toBe('INCOME');
      expect(depositTx.amount).toBe(200000);
      expect(depositTx.category.id).toBe(SYSTEM_CATEGORY_IDS.INCOME_RESERVATION_DEPOSIT);

      // پاکسازی
      await admin.call('updateReservationStatus', res.reservation.id, 'CANCELLED');
    });

    it('رزرو بدون پیش‌پرداخت هیچ تراکنشی نمی‌سازد', async () => {
      const time = new Date(Date.now() + 2.5 * 60 * 60000).toISOString();
      const res = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری بدون پیش‌پرداخت',
        guestPhone: '09130000002',
        partySize: 2,
        reservationTime: time,
      });
      expect(res.success).toBe(true);
      expect(res.reservation.depositAmount).toBe(0);

      const txRes = await admin.call('getTransactions', {});
      const depositTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'RESERVATION_DEPOSIT' && t.referenceId === res.reservation.id
      );
      expect(depositTx).toBeFalsy();

      await admin.call('updateReservationStatus', res.reservation.id, 'CANCELLED');
    });
  });

  describe('استرداد پیش‌پرداخت: اقدام صریح، کامل، در هر زمان', () => {
    it('استرداد یک تراکنش EXPENSE مقابل می‌سازد و depositRefundedAt را ثبت می‌کند', async () => {
      const time = new Date(Date.now() + 3 * 60 * 60000).toISOString();
      const created = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری استرداد ۱',
        guestPhone: '09130000003',
        partySize: 2,
        reservationTime: time,
        depositAmount: 150000,
      });
      expect(created.success).toBe(true);

      const refundRes = await admin.call('refundReservationDeposit', created.reservation.id);
      expect(refundRes.success).toBe(true);
      expect(refundRes.reservation.depositRefundedAt).toBeTruthy();

      const txRes = await admin.call('getTransactions', {});
      const refundTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'RESERVATION_DEPOSIT_REFUND' && t.referenceId === created.reservation.id
      );
      expect(refundTx).toBeTruthy();
      expect(refundTx.type).toBe('EXPENSE');
      expect(refundTx.amount).toBe(150000);
      expect(refundTx.category.id).toBe(SYSTEM_CATEGORY_IDS.EXPENSE_RESERVATION_DEPOSIT_REFUND);

      // تراکنش INCOME اصلی هنوز دست‌نخورده باقی است (قاعده‌ی فاز ۷)
      const depositTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'RESERVATION_DEPOSIT' && t.referenceId === created.reservation.id
      );
      expect(depositTx).toBeTruthy();
      expect(depositTx.type).toBe('INCOME');
      expect(depositTx.amount).toBe(150000);

      await admin.call('updateReservationStatus', created.reservation.id, 'CANCELLED');
    });

    it('استرداد دوباره روی همان رزرو رد می‌شود', async () => {
      const time = new Date(Date.now() + 3.5 * 60 * 60000).toISOString();
      const created = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری استرداد ۲',
        guestPhone: '09130000004',
        partySize: 2,
        reservationTime: time,
        depositAmount: 100000,
      });
      expect(created.success).toBe(true);

      const first = await admin.call('refundReservationDeposit', created.reservation.id);
      expect(first.success).toBe(true);
      const second = await admin.call('refundReservationDeposit', created.reservation.id);
      expect(second.success).toBe(false);

      await admin.call('updateReservationStatus', created.reservation.id, 'CANCELLED');
    });

    it('استرداد رزروی بدون پیش‌پرداخت رد می‌شود', async () => {
      const time = new Date(Date.now() + 4 * 60 * 60000).toISOString();
      const created = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری بدون پیش‌پرداخت برای استرداد',
        guestPhone: '09130000005',
        partySize: 2,
        reservationTime: time,
      });
      expect(created.success).toBe(true);

      const res = await admin.call('refundReservationDeposit', created.reservation.id);
      expect(res.success).toBe(false);

      await admin.call('updateReservationStatus', created.reservation.id, 'CANCELLED');
    });

    it('استرداد صرف‌نظر از وضعیت رزرو (حتی بعد از لغو یا عدم‌حضور) کار می‌کند', async () => {
      const time = new Date(Date.now() + 4.5 * 60 * 60000).toISOString();
      const created = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری استرداد بعد از لغو',
        guestPhone: '09130000006',
        partySize: 2,
        reservationTime: time,
        depositAmount: 80000,
      });
      expect(created.success).toBe(true);

      const cancelled = await admin.call('updateReservationStatus', created.reservation.id, 'CANCELLED');
      expect(cancelled.success).toBe(true);
      expect(cancelled.reservation.status).toBe('CANCELLED');

      // طبق سیاست انتخاب‌شده («استرداد کامل تا هر زمان»)، استرداد بعد از لغو هم مجاز است
      const refundRes = await admin.call('refundReservationDeposit', created.reservation.id);
      expect(refundRes.success).toBe(true);
      expect(refundRes.reservation.depositRefundedAt).toBeTruthy();
    });
  });

  describe('لیست انتظار: جریان نشاندن و لغو', () => {
    it('نشاندنِ یک مشتریِ منتظر روی میز، وضعیت را SEATED و میز را OCCUPIED می‌کند', async () => {
      const table = await makeTable(admin);
      const joinRes = await admin.call('joinWaitlist', {
        guestName: 'مشتری منتظر ۱',
        guestPhone: '09140000001',
        partySize: 3,
      });
      expect(joinRes.success).toBe(true);
      expect(joinRes.entry.status).toBe('WAITING');

      const seatRes = await admin.call('seatFromWaitlist', joinRes.entry.id, table.id);
      expect(seatRes.success).toBe(true);
      expect(seatRes.entry.status).toBe('SEATED');
      expect(seatRes.entry.tableId).toBe(table.id);
      expect(seatRes.entry.seatedAt).toBeTruthy();

      const tablesRes = await admin.call('getTables');
      const updatedTable = tablesRes.tables.find((t: any) => t.id === table.id);
      expect(updatedTable.status).toBe('OCCUPIED');

      // نشسته‌ها دیگر در getWaitlist (فقط WAITING) دیده نمی‌شوند
      const listRes = await admin.call('getWaitlist');
      expect(listRes.entries.find((e: any) => e.id === joinRes.entry.id)).toBeFalsy();

      await admin.call('updateTableStatus', table.id, 'AVAILABLE');
    });

    it('نشاندن دوباره‌ی یک موردِ غیرِ WAITING رد می‌شود', async () => {
      const table = await makeTable(admin);
      const joinRes = await admin.call('joinWaitlist', {
        guestName: 'مشتری منتظر ۲',
        guestPhone: '09140000002',
        partySize: 2,
      });
      expect(joinRes.success).toBe(true);

      const firstSeat = await admin.call('seatFromWaitlist', joinRes.entry.id, table.id);
      expect(firstSeat.success).toBe(true);

      const secondTable = await makeTable(admin);
      const secondSeat = await admin.call('seatFromWaitlist', joinRes.entry.id, secondTable.id);
      expect(secondSeat.success).toBe(false);

      await admin.call('updateTableStatus', table.id, 'AVAILABLE');
    });

    it('لغوِ یک موردِ منتظر، وضعیت آن را CANCELLED می‌کند و از لیست فعال حذف می‌شود', async () => {
      const joinRes = await admin.call('joinWaitlist', {
        guestName: 'مشتری منتظر ۳',
        guestPhone: '09140000003',
        partySize: 1,
      });
      expect(joinRes.success).toBe(true);

      const cancelRes = await admin.call('cancelWaitlistEntry', joinRes.entry.id);
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.entry.status).toBe('CANCELLED');

      const listRes = await admin.call('getWaitlist');
      expect(listRes.entries.find((e: any) => e.id === joinRes.entry.id)).toBeFalsy();
    });
  });

  describe('ایزوله‌سازی شعبه‌ای', () => {
    it('پرسنل شعبه‌ی دیگر نه لیست انتظار و نه پیش‌پرداخت شعبه‌ی دیگری را نمی‌بیند/تغییر نمی‌دهد', async () => {
      const branchRes = await admin.call('createBranch', {
        name: `شعبه تستی فاز۱۲ ${rand()}`,
        address: 'آدرس تستی',
        phone: '02100000000',
      });
      expect(branchRes.success).toBe(true);
      const branchBId = branchRes.branch.id;

      const cashierB = await admin.call('createUser', {
        name: `صندوقدار شعبه ب فاز۱۲ ${rand()}`,
        username: `cashier_p12b_${rand()}`,
        password: '123456',
        roles: ['CASHIER'],
        branchId: branchBId,
      });
      expect(cashierB.success).toBe(true);
      const staffB = new TestClient();
      expect((await staffB.call('login', cashierB.user.username, '123456')).success).toBe(true);

      // موردِ لیست انتظار در شعبه‌ی پیش‌فرض (توسط cashierOnly که در شعبه‌ی پیش‌فرض است)
      const joinRes = await cashierOnly.call('joinWaitlist', {
        guestName: 'مشتری شعبه پیش‌فرض',
        guestPhone: '09150000001',
        partySize: 2,
      });
      expect(joinRes.success).toBe(true);

      const staffBList = await staffB.call('getWaitlist');
      expect(staffBList.success).toBe(true);
      expect(staffBList.entries.find((e: any) => e.id === joinRes.entry.id)).toBeFalsy();

      expect((await staffB.call('cancelWaitlistEntry', joinRes.entry.id)).success).toBe(false);

      // رزروِ با پیش‌پرداخت در شعبه‌ی پیش‌فرض
      const time = new Date(Date.now() + 5 * 60 * 60000).toISOString();
      const reservationRes = await admin.call('createReservation', {
        tableId,
        guestName: 'مشتری ایزوله‌سازی',
        guestPhone: '09150000002',
        partySize: 2,
        reservationTime: time,
        depositAmount: 50000,
      });
      expect(reservationRes.success).toBe(true);

      const refundAttempt = await staffB.call('refundReservationDeposit', reservationRes.reservation.id);
      expect(refundAttempt.success).toBe(false);

      // ادمین (بدون محدودیت شعبه‌ای) باید همچنان بتواند استرداد کند
      const adminRefund = await admin.call('refundReservationDeposit', reservationRes.reservation.id);
      expect(adminRefund.success).toBe(true);

      await admin.call('updateReservationStatus', reservationRes.reservation.id, 'CANCELLED');
      await admin.call('cancelWaitlistEntry', joinRes.entry.id);
    });
  });
});
