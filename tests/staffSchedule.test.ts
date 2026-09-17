import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe('مدیریت پرسنل و شیفت‌بندی', () => {
  let admin: TestClient;
  let staffA: TestClient;
  let staffB: TestClient;
  let staffAId: string;
  let staffBId: string;
  const today = new Date();

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const userA = await admin.call('createUser', {
      name: `پرسنل تستی الف ${rand()}`,
      username: `staffA_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(userA.success).toBe(true);
    staffAId = userA.user.id;

    const userB = await admin.call('createUser', {
      name: `پرسنل تستی ب ${rand()}`,
      username: `staffB_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(userB.success).toBe(true);
    staffBId = userB.user.id;

    staffA = new TestClient();
    const loginA = await staffA.call('login', userA.user.username, '123456');
    expect(loginA.success).toBe(true);

    staffB = new TestClient();
    const loginB = await staffB.call('login', userB.user.username, '123456');
    expect(loginB.success).toBe(true);
  });

  let shiftId: string;
  let assignmentAId: string;

  it('کاربر غیرمدیر اجازه ساخت شیفت را ندارد', async () => {
    const res = await staffA.call('createShift', {
      date: isoDate(today),
      startTime: today.toISOString(),
      endTime: today.toISOString(),
    });
    expect(res.success).toBe(false);
  });

  it('مدیر یک شیفت جدید تعریف می‌کند', async () => {
    const start = new Date(today.getTime() + 60_000);
    const end = new Date(today.getTime() + 3_600_000);
    const res = await admin.call('createShift', {
      date: isoDate(today),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      role: 'صندوق‌دار',
    });
    expect(res.success).toBe(true);
    expect(res.shift.status).toBe('SCHEDULED');
    shiftId = res.shift.id;
  });

  it('مدیر یک پرسنل را به شیفت تخصیص می‌دهد و تخصیص تکراری رد می‌شود', async () => {
    const res = await admin.call('assignStaffToShift', shiftId, staffAId);
    expect(res.success).toBe(true);
    assignmentAId = res.assignment.id;

    const dup = await admin.call('assignStaffToShift', shiftId, staffAId);
    expect(dup.success).toBe(false);
  });

  it('پرسنل تخصیص‌یافته شیفت خودش را در «شیفت‌های من» می‌بیند', async () => {
    const res = await staffA.call('getMyShifts');
    expect(res.success).toBe(true);
    const found = res.assignments.find((a: any) => a.id === assignmentAId);
    expect(found).toBeTruthy();
    expect(found.shift.id).toBe(shiftId);
  });

  it('کاربر دیگر نمی‌تواند برای شیفتِ پرسنل الف حضور ثبت کند', async () => {
    const res = await staffB.call('clockIn', assignmentAId);
    expect(res.success).toBe(false);
  });

  let clockInAt: string;

  it('پرسنل الف ورود ثبت می‌کند و ثبت ورود دوباره رد می‌شود', async () => {
    const res = await staffA.call('clockIn', assignmentAId);
    expect(res.success).toBe(true);
    expect(res.attendance.clockIn).toBeTruthy();
    clockInAt = res.attendance.clockIn;

    const dup = await staffA.call('clockIn', assignmentAId);
    expect(dup.success).toBe(false);
  });

  it('تخصیصی که برای آن ورود ثبت شده را نمی‌توان حذف کرد', async () => {
    const res = await admin.call('unassignStaffFromShift', assignmentAId);
    expect(res.success).toBe(false);
  });

  it('پرسنل الف خروج ثبت می‌کند و ثبت خروج دوباره رد می‌شود', async () => {
    await new Promise((r) => setTimeout(r, 1100));
    const res = await staffA.call('clockOut', assignmentAId);
    expect(res.success).toBe(true);
    expect(res.attendance.clockOut).toBeTruthy();
    expect(new Date(res.attendance.clockOut).getTime()).toBeGreaterThanOrEqual(new Date(clockInAt).getTime());

    const dup = await staffA.call('clockOut', assignmentAId);
    expect(dup.success).toBe(false);
  });

  let leaveShiftId: string;
  let leaveAssignmentId: string;
  let leaveRequestId: string;

  it('درخواست مرخصیِ تأییدشده، شیفتِ بدون حضورِ ثبت‌شده را آزاد می‌کند', async () => {
    const start = new Date(today.getTime() + 2 * 3_600_000);
    const end = new Date(today.getTime() + 3 * 3_600_000);
    const shiftRes = await admin.call('createShift', {
      date: isoDate(today),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    expect(shiftRes.success).toBe(true);
    leaveShiftId = shiftRes.shift.id;

    const assignRes = await admin.call('assignStaffToShift', leaveShiftId, staffBId);
    expect(assignRes.success).toBe(true);
    leaveAssignmentId = assignRes.assignment.id;

    const reqRes = await staffB.call('createStaffRequest', {
      type: 'LEAVE',
      startDate: isoDate(today),
      endDate: isoDate(today),
      reason: 'مرخصی استعلاجی',
    });
    expect(reqRes.success).toBe(true);
    leaveRequestId = reqRes.request.id;

    const approveRes = await admin.call('reviewStaffRequest', leaveRequestId, 'APPROVED');
    expect(approveRes.success).toBe(true);
    expect(approveRes.request.status).toBe('APPROVED');

    const myShifts = await staffB.call('getMyShifts');
    const stillThere = myShifts.assignments.find((a: any) => a.id === leaveAssignmentId);
    expect(stillThere).toBeUndefined();
  });

  it('نمی‌توان درخواستی را که قبلاً بررسی شده دوباره بررسی کرد', async () => {
    const res = await admin.call('reviewStaffRequest', leaveRequestId, 'REJECTED');
    expect(res.success).toBe(false);
  });

  let swapShiftId: string;
  let swapAssignmentId: string;

  it('درخواست جابجایی شیفتِ تأییدشده، مالکیت تخصیص را به همکار مقصد منتقل می‌کند', async () => {
    const start = new Date(today.getTime() + 4 * 3_600_000);
    const end = new Date(today.getTime() + 5 * 3_600_000);
    const shiftRes = await admin.call('createShift', {
      date: isoDate(today),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    expect(shiftRes.success).toBe(true);
    swapShiftId = shiftRes.shift.id;

    const assignRes = await admin.call('assignStaffToShift', swapShiftId, staffAId);
    expect(assignRes.success).toBe(true);
    swapAssignmentId = assignRes.assignment.id;

    const swapReq = await staffA.call('createStaffRequest', {
      type: 'SHIFT_SWAP',
      sourceAssignmentId: swapAssignmentId,
      targetUserId: staffBId,
      reason: 'ناهماهنگی برنامه',
    });
    expect(swapReq.success).toBe(true);

    const approveRes = await admin.call('reviewStaffRequest', swapReq.request.id, 'APPROVED');
    expect(approveRes.success).toBe(true);

    const myShiftsA = await staffA.call('getMyShifts');
    expect(myShiftsA.assignments.find((a: any) => a.id === swapAssignmentId)).toBeUndefined();

    const myShiftsB = await staffB.call('getMyShifts');
    expect(myShiftsB.assignments.find((a: any) => a.id === swapAssignmentId)).toBeTruthy();
  });

  it('نمی‌توان با همکاری که از قبل به همان شیفت تخصیص یافته جابجا کرد', async () => {
    const assignRes = await admin.call('assignStaffToShift', swapShiftId, staffAId);
    expect(assignRes.success).toBe(true);

    // چون همکار مقصد (پرسنل الف) از قبل به این شیفت تخصیص یافته، حتی ثبت
    // درخواست جابجایی هم همان لحظه رد می‌شود (نه فقط در زمان تأیید مدیر).
    const swapReq = await staffB.call('createStaffRequest', {
      type: 'SHIFT_SWAP',
      sourceAssignmentId: swapAssignmentId,
      targetUserId: staffAId,
      reason: 'برگشت شیفت',
    });
    expect(swapReq.success).toBe(false);
  });

  it('پرسنل می‌تواند از یک درخواستِ در انتظار خودش صرف‌نظر کند', async () => {
    const reqRes = await staffA.call('createStaffRequest', {
      type: 'LEAVE',
      startDate: isoDate(new Date(today.getTime() + 30 * 86_400_000)),
      endDate: isoDate(new Date(today.getTime() + 31 * 86_400_000)),
      reason: 'سفر',
    });
    expect(reqRes.success).toBe(true);

    const cancelRes = await staffA.call('cancelMyStaffRequest', reqRes.request.id);
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.request.status).toBe('CANCELLED');

    const cancelAgain = await staffA.call('cancelMyStaffRequest', reqRes.request.id);
    expect(cancelAgain.success).toBe(false);
  });

  it('مدیر فهرست درخواست‌های در انتظار را می‌بیند اما پرسنل معمولی اجازه‌ی دسترسی ندارد', async () => {
    const asStaff = await staffA.call('getStaffRequests');
    expect(asStaff.success).toBe(false);

    const asAdmin = await admin.call('getStaffRequests', 'APPROVED');
    expect(asAdmin.success).toBe(true);
    expect(asAdmin.requests.every((r: any) => r.status === 'APPROVED')).toBe(true);
  });

  describe('حقوق و دستمزد بر مبنای نرخ ساعتی ثابت', () => {
    const hourlyRate = 500_000;
    const periodStart = '2000-01-01';
    const periodEnd = '2100-01-01';

    it('کاربر غیرمجاز (نه ادمین) نمی‌تواند نرخ ساعتی تعیین کند', async () => {
      const res = await staffA.call('updateUserHourlyRate', staffAId, hourlyRate);
      expect(res.success).toBe(false);
    });

    it('مدیر نرخ ساعتی پرسنل الف را تنظیم می‌کند', async () => {
      const res = await admin.call('updateUserHourlyRate', staffAId, hourlyRate);
      expect(res.success).toBe(true);
      expect(res.user.hourlyRate).toBe(hourlyRate);
    });

    let previewHours: number;
    let previewAmount: number;

    it('پیش‌نمایش حقوق، ساعات کاریِ ثبت‌شده (ورود/خروج قبلی) را محاسبه می‌کند', async () => {
      const res = await admin.call('getPayrollPreview', staffAId, periodStart, periodEnd);
      expect(res.success).toBe(true);
      expect(res.preview.hourlyRate).toBe(hourlyRate);
      expect(res.preview.totalHours).toBeGreaterThan(0);
      expect(res.preview.totalAmount).toBeCloseTo(res.preview.totalHours * hourlyRate, 5);
      previewHours = res.preview.totalHours;
      previewAmount = res.preview.totalAmount;
    });

    it('اجرای نهایی حقوق‌دهی، پرداخت را ثبت و تراکنش هزینه ایجاد می‌کند', async () => {
      const beforeTx = await admin.call('getTransactions');
      const expenseCountBefore = beforeTx.transactions.filter((t: any) => t.type === 'EXPENSE').length;

      const res = await admin.call('runPayroll', staffAId, periodStart, periodEnd);
      expect(res.success).toBe(true);
      expect(res.payment.totalHours).toBeCloseTo(previewHours, 5);
      expect(res.payment.totalAmount).toBeCloseTo(previewAmount, 5);

      const afterTx = await admin.call('getTransactions');
      const expenseCountAfter = afterTx.transactions.filter((t: any) => t.type === 'EXPENSE').length;
      expect(expenseCountAfter).toBe(expenseCountBefore + 1);
    });

    it('اجرای دوباره‌ی حقوق‌دهی برای همان بازه، چون ساعتی باقی نمانده رد می‌شود', async () => {
      const res = await admin.call('runPayroll', staffAId, periodStart, periodEnd);
      expect(res.success).toBe(false);
    });

    it('تاریخچه حقوق‌دهی، پرداخت ثبت‌شده را نشان می‌دهد و حسابدار هم به آن دسترسی دارد', async () => {
      const accountantUser = await admin.call('createUser', {
        name: `حسابدار تستی ${rand()}`,
        username: `accountant_${rand()}`,
        password: '123456',
        roles: ['ACCOUNTANT'],
      });
      expect(accountantUser.success).toBe(true);

      const accountant = new TestClient();
      const loginRes = await accountant.call('login', accountantUser.user.username, '123456');
      expect(loginRes.success).toBe(true);

      const res = await accountant.call('getPayrollHistory', staffAId);
      expect(res.success).toBe(true);
      expect(res.payments.length).toBeGreaterThan(0);
      expect(res.payments[0].userId).toBe(staffAId);
    });
  });
});
