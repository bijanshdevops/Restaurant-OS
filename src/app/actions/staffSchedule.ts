"use server";

import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';
import { requireRole, resolveBranchFilter, resolveBranchForCreate } from '@/lib/auth';
import { SYSTEM_CATEGORY_IDS } from '@/lib/accountingCategories';
import { logAudit, actorFieldsFromUser } from '@/lib/auditLog';

// مدیریت شیفت‌ها، تخصیص پرسنل، بازبینی درخواست‌ها و اجرای حقوق‌دهی فقط
// در اختیار مدیر سیستم است. اقدامات خودخدمت (مشاهده شیفت‌های خودم، ثبت
// حضور و غیاب، ثبت درخواست) با requireRole() بدون آرگومان، یعنی هر
// کاربر واردشده، مجاز است.
const STAFF_MANAGERS = ['ADMIN'] as const;

// =====================================================================
// Shifts (management)
// =====================================================================

/** لیست شیفت‌ها همراه با تخصیص‌ها و وضعیت حضور، برای پنل مدیریت. */
export async function getShifts(range?: { from?: string; to?: string }, branchId?: string) {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    const where: any = {};
    if (effectiveBranchId) where.branchId = effectiveBranchId;
    if (range?.from || range?.to) {
      where.date = {};
      if (range.from) where.date.gte = new Date(range.from);
      if (range.to) where.date.lte = new Date(range.to);
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        branch: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, username: true } }, attendance: true },
        },
      },
    });
    return { success: true, shifts };
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return { success: false, error: 'خطا در دریافت لیست شیفت‌ها' };
  }
}

export async function createShift(data: {
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
  notes?: string;
  branchId?: string;
}) {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  if (!data.date || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { success: false, error: 'تاریخ یا ساعت شیفت نامعتبر است' };
  }
  if (endTime <= startTime) {
    return { success: false, error: 'ساعت پایان شیفت باید بعد از ساعت شروع باشد' };
  }

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, data.branchId);
    const shift = await prisma.shift.create({
      data: {
        date: new Date(data.date),
        startTime,
        endTime,
        role: data.role?.trim() || '',
        notes: data.notes?.trim() || '',
        branchId: effectiveBranchId,
      },
      include: { assignments: true },
    });
    return { success: true, shift };
  } catch (error) {
    console.error('Error creating shift:', error);
    return { success: false, error: 'خطا در ثبت شیفت' };
  }
}

/** لغو یک شیفت؛ فقط تا زمانی که هیچ حضور واقعی‌ای برای آن ثبت نشده باشد. */
export async function cancelShift(id: string) {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { assignments: { include: { attendance: true } } },
    });
    if (!shift) return { success: false, error: 'شیفت یافت نشد' };
    if (shift.assignments.some((a) => a.attendance?.clockIn)) {
      return { success: false, error: 'شیفتی که برای آن حضور ثبت شده را نمی‌توان لغو کرد' };
    }

    const updated = await prisma.shift.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { success: true, shift: updated };
  } catch (error) {
    console.error('Error cancelling shift:', error);
    return { success: false, error: 'خطا در لغو شیفت' };
  }
}

/** تخصیص یک کاربر به یک شیفت. */
export async function assignStaffToShift(shiftId: string, userId: string) {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return { success: false, error: 'شیفت یافت نشد' };
    if (shift.status === 'CANCELLED') {
      return { success: false, error: 'نمی‌توان به شیفت لغوشده پرسنل تخصیص داد' };
    }

    const targetStaff = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetStaff) return { success: false, error: 'کاربر یافت نشد' };
    if (targetStaff.branchId !== shift.branchId) {
      return { success: false, error: 'این کاربر متعلق به شعبه‌ی این شیفت نیست' };
    }

    const existing = await prisma.shiftAssignment.findUnique({
      where: { shiftId_userId: { shiftId, userId } },
    });
    if (existing) return { success: false, error: 'این کاربر قبلاً به این شیفت تخصیص یافته است' };

    const assignment = await prisma.shiftAssignment.create({
      data: { shiftId, userId },
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    return { success: true, assignment };
  } catch (error) {
    console.error('Error assigning staff to shift:', error);
    return { success: false, error: 'خطا در تخصیص پرسنل به شیفت' };
  }
}

/** حذف تخصیص یک کاربر از شیفت؛ فقط اگر هنوز حضوری برای آن ثبت نشده باشد. */
export async function unassignStaffFromShift(assignmentId: string) {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { attendance: true },
    });
    if (!assignment) return { success: false, error: 'تخصیص یافت نشد' };
    if (assignment.attendance?.clockIn) {
      return { success: false, error: 'تخصیصی که برای آن حضور ثبت شده را نمی‌توان حذف کرد' };
    }

    await prisma.shiftAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  } catch (error) {
    console.error('Error unassigning staff from shift:', error);
    return { success: false, error: 'خطا در حذف تخصیص پرسنل' };
  }
}

// =====================================================================
// Self-service: my shifts & attendance
// =====================================================================

/** شیفت‌های خودِ کاربرِ واردشده، به‌همراه وضعیت حضور. */
export async function getMyShifts(range?: { from?: string; to?: string }) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const where: any = { userId: auth.user.id };
    if (range?.from || range?.to) {
      where.shift = {};
      if (range.from || range.to) where.shift.date = {};
      if (range.from) where.shift.date.gte = new Date(range.from);
      if (range.to) where.shift.date.lte = new Date(range.to);
    }

    const assignments = await prisma.shiftAssignment.findMany({
      where,
      orderBy: { shift: { date: 'asc' } },
      include: { shift: true, attendance: true },
    });
    return { success: true, assignments };
  } catch (error) {
    console.error('Error fetching my shifts:', error);
    return { success: false, error: 'خطا در دریافت شیفت‌های من' };
  }
}

/** ثبت ورود (clock-in) روی یک تخصیص شیفت متعلق به کاربر واردشده. */
export async function clockIn(assignmentId: string) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { attendance: true },
    });
    if (!assignment) return { success: false, error: 'تخصیص شیفت یافت نشد' };
    if (assignment.userId !== auth.user.id) {
      return { success: false, error: 'این شیفت متعلق به شما نیست' };
    }
    if (assignment.attendance?.clockIn && !assignment.attendance?.clockOut) {
      return { success: false, error: 'شما قبلاً برای این شیفت ورود ثبت کرده‌اید' };
    }

    const attendance = await prisma.attendance.upsert({
      where: { shiftAssignmentId: assignmentId },
      update: { clockIn: new Date(), clockOut: null },
      create: { shiftAssignmentId: assignmentId, clockIn: new Date() },
    });
    return { success: true, attendance };
  } catch (error) {
    console.error('Error clocking in:', error);
    return { success: false, error: 'خطا در ثبت ورود' };
  }
}

/** ثبت خروج (clock-out) روی یک تخصیص شیفت متعلق به کاربر واردشده. */
export async function clockOut(assignmentId: string) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { attendance: true },
    });
    if (!assignment) return { success: false, error: 'تخصیص شیفت یافت نشد' };
    if (assignment.userId !== auth.user.id) {
      return { success: false, error: 'این شیفت متعلق به شما نیست' };
    }
    if (!assignment.attendance?.clockIn) {
      return { success: false, error: 'ابتدا باید ورود ثبت کنید' };
    }
    if (assignment.attendance.clockOut) {
      return { success: false, error: 'شما قبلاً برای این شیفت خروج ثبت کرده‌اید' };
    }

    const clockOutTime = new Date();
    if (clockOutTime <= assignment.attendance.clockIn) {
      return { success: false, error: 'زمان خروج نامعتبر است' };
    }

    const attendance = await prisma.attendance.update({
      where: { shiftAssignmentId: assignmentId },
      data: { clockOut: clockOutTime },
    });
    return { success: true, attendance };
  } catch (error) {
    console.error('Error clocking out:', error);
    return { success: false, error: 'خطا در ثبت خروج' };
  }
}

// =====================================================================
// Self-service: leave & shift-swap requests
// =====================================================================

/** فهرست ساده‌ی همکاران، برای انتخاب طرف مقابل در درخواست جابجایی شیفت. */
export async function getStaffDirectory() {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    // برای جابجایی شیفت، همکار مقصد باید در همان شعبه باشد؛ مدیر سیستم همه را می‌بیند.
    const effectiveBranchId = resolveBranchFilter(auth.user);
    const users = await prisma.user.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    });
    return { success: true, users };
  } catch (error) {
    console.error('Error fetching staff directory:', error);
    return { success: false, error: 'خطا در دریافت فهرست پرسنل' };
  }
}

/** ثبت درخواست مرخصی یا جابجایی شیفت توسط کاربر واردشده. */
export async function createStaffRequest(data: {
  type: 'LEAVE' | 'SHIFT_SWAP';
  reason?: string;
  startDate?: string;
  endDate?: string;
  sourceAssignmentId?: string;
  targetUserId?: string;
}) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (data.type === 'LEAVE') {
      const startDate = data.startDate ? new Date(data.startDate) : null;
      const endDate = data.endDate ? new Date(data.endDate) : null;
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { success: false, error: 'تاریخ شروع و پایان مرخصی الزامی است' };
      }
      if (endDate < startDate) {
        return { success: false, error: 'تاریخ پایان مرخصی نمی‌تواند قبل از تاریخ شروع باشد' };
      }

      const request = await prisma.staffRequest.create({
        data: {
          type: 'LEAVE',
          userId: auth.user.id,
          startDate,
          endDate,
          reason: data.reason?.trim() || '',
        },
      });
      return { success: true, request };
    }

    // SHIFT_SWAP
    if (!data.sourceAssignmentId || !data.targetUserId) {
      return { success: false, error: 'شیفت مبدأ و همکار مقصد را انتخاب کنید' };
    }
    if (data.targetUserId === auth.user.id) {
      return { success: false, error: 'نمی‌توانید با خودتان شیفت جابجا کنید' };
    }

    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: data.sourceAssignmentId },
      include: { attendance: true },
    });
    if (!assignment) return { success: false, error: 'تخصیص شیفت یافت نشد' };
    if (assignment.userId !== auth.user.id) {
      return { success: false, error: 'این شیفت متعلق به شما نیست' };
    }
    if (assignment.attendance?.clockIn) {
      return { success: false, error: 'شیفتی که برای آن حضور ثبت شده را نمی‌توان جابجا کرد' };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: data.targetUserId } });
    if (!targetUser) return { success: false, error: 'همکار مقصد یافت نشد' };

    const conflict = await prisma.shiftAssignment.findUnique({
      where: { shiftId_userId: { shiftId: assignment.shiftId, userId: data.targetUserId } },
    });
    if (conflict) return { success: false, error: 'همکار مقصد از قبل به این شیفت تخصیص یافته است' };

    const request = await prisma.staffRequest.create({
      data: {
        type: 'SHIFT_SWAP',
        userId: auth.user.id,
        sourceAssignmentId: data.sourceAssignmentId,
        targetUserId: data.targetUserId,
        reason: data.reason?.trim() || '',
      },
    });
    return { success: true, request };
  } catch (error) {
    console.error('Error creating staff request:', error);
    return { success: false, error: 'خطا در ثبت درخواست' };
  }
}

/** درخواست‌های ثبت‌شده توسط کاربر واردشده. */
export async function getMyStaffRequests() {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const requests = await prisma.staffRequest.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceAssignment: { include: { shift: true } },
        targetUser: { select: { id: true, name: true } },
      },
    });
    return { success: true, requests };
  } catch (error) {
    console.error('Error fetching my staff requests:', error);
    return { success: false, error: 'خطا در دریافت درخواست‌های من' };
  }
}

/** انصراف از یک درخواست، تا زمانی که هنوز در وضعیت «در انتظار» باشد. */
export async function cancelMyStaffRequest(id: string) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const request = await prisma.staffRequest.findUnique({ where: { id } });
    if (!request) return { success: false, error: 'درخواست یافت نشد' };
    if (request.userId !== auth.user.id) {
      return { success: false, error: 'این درخواست متعلق به شما نیست' };
    }
    if (request.status !== 'PENDING') {
      return { success: false, error: 'فقط درخواست‌های در انتظار قابل لغو هستند' };
    }

    const updated = await prisma.staffRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { success: true, request: updated };
  } catch (error) {
    console.error('Error cancelling staff request:', error);
    return { success: false, error: 'خطا در لغو درخواست' };
  }
}

// =====================================================================
// Management: reviewing leave / shift-swap requests
// =====================================================================

export async function getStaffRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED') {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const requests = await prisma.staffRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true } },
        targetUser: { select: { id: true, name: true, username: true } },
        reviewedBy: { select: { id: true, name: true } },
        sourceAssignment: { include: { shift: true } },
      },
    });
    return { success: true, requests };
  } catch (error) {
    console.error('Error fetching staff requests:', error);
    return { success: false, error: 'خطا در دریافت درخواست‌های پرسنل' };
  }
}

/**
 * تأیید یا رد یک درخواست. تأیید مرخصی، شیفت‌های آن بازه‌ی زمانی را که
 * هنوز حضوری برایشان ثبت نشده آزاد می‌کند (تا مدیر بتواند جایگزین کند).
 * تأیید جابجایی شیفت، مالکیت تخصیص را از درخواست‌دهنده به همکار مقصد
 * منتقل می‌کند. رد کردن هیچ تغییری در شیفت‌ها ایجاد نمی‌کند.
 */
export async function reviewStaffRequest(id: string, decision: 'APPROVED' | 'REJECTED') {
  const auth = await requireRole(...STAFF_MANAGERS);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.staffRequest.findUnique({
        where: { id },
        include: { sourceAssignment: { include: { attendance: true } } },
      });
      if (!request) throw new Error('درخواست یافت نشد');
      if (request.status !== 'PENDING') throw new Error('این درخواست قبلاً بررسی شده است');

      if (decision === 'REJECTED') {
        return tx.staffRequest.update({
          where: { id },
          data: { status: 'REJECTED', reviewedById: auth.user.id, reviewedAt: new Date() },
        });
      }

      if (request.type === 'LEAVE') {
        if (!request.startDate || !request.endDate) throw new Error('بازه‌ی مرخصی نامعتبر است');
        const freeable = await tx.shiftAssignment.findMany({
          where: {
            userId: request.userId,
            shift: { date: { gte: request.startDate, lte: request.endDate } },
          },
          include: { attendance: true },
        });
        const toFree = freeable.filter((a) => !a.attendance?.clockIn);
        if (toFree.length > 0) {
          await tx.shiftAssignment.deleteMany({ where: { id: { in: toFree.map((a) => a.id) } } });
        }
      } else {
        // SHIFT_SWAP
        if (!request.sourceAssignmentId || !request.targetUserId) {
          throw new Error('اطلاعات جابجایی شیفت ناقص است');
        }
        if (request.sourceAssignment?.attendance?.clockIn) {
          throw new Error('برای این شیفت حضور ثبت شده و دیگر قابل جابجایی نیست');
        }
        const conflict = await tx.shiftAssignment.findUnique({
          where: {
            shiftId_userId: { shiftId: request.sourceAssignment!.shiftId, userId: request.targetUserId },
          },
        });
        if (conflict) throw new Error('همکار مقصد از قبل به این شیفت تخصیص یافته است');

        await tx.shiftAssignment.update({
          where: { id: request.sourceAssignmentId },
          data: { userId: request.targetUserId },
        });
      }

      return tx.staffRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById: auth.user.id, reviewedAt: new Date() },
      });
    });

    return { success: true, request: result };
  } catch (error: any) {
    console.error('Error reviewing staff request:', error);
    return { success: false, error: error?.message || 'خطا در بررسی درخواست' };
  }
}

// =====================================================================
// Payroll (fixed hourly rate per user)
// =====================================================================

const PAYROLL_ROLES = ['ADMIN', 'ACCOUNTANT'] as const;

async function computeUnpaidHours(userId: string, periodStart: Date, periodEnd: Date) {
  const attendances = await prisma.attendance.findMany({
    where: {
      payrollPaymentId: null,
      clockIn: { gte: periodStart, lte: periodEnd, not: null },
      clockOut: { not: null },
      shiftAssignment: { userId },
    },
  });

  const totalHours = attendances.reduce((sum, a) => {
    if (!a.clockIn || !a.clockOut) return sum;
    return sum + (a.clockOut.getTime() - a.clockIn.getTime()) / (1000 * 60 * 60);
  }, 0);

  return { attendances, totalHours };
}

/** پیش‌نمایش مبلغ حقوق قابل پرداخت در یک بازه، بدون ثبت نهایی. */
export async function getPayrollPreview(userId: string, periodStart: string, periodEnd: string) {
  const auth = await requireRole(...PAYROLL_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: 'کاربر یافت نشد' };

    const { totalHours } = await computeUnpaidHours(userId, new Date(periodStart), new Date(periodEnd));
    const totalAmount = totalHours * user.hourlyRate;

    return { success: true, preview: { userId, hourlyRate: user.hourlyRate, totalHours, totalAmount } };
  } catch (error) {
    console.error('Error computing payroll preview:', error);
    return { success: false, error: 'خطا در محاسبه پیش‌نمایش حقوق' };
  }
}

/**
 * اجرای نهایی حقوق‌دهی برای یک کاربر در یک بازه‌ی زمانی: ساعات کاریِ
 * پرداخت‌نشده را جمع می‌زند، بر مبنای نرخ ساعتی ثابت کاربر مبلغ را
 * محاسبه می‌کند، یک رکورد PayrollPayment می‌سازد، رکوردهای حضور مربوطه
 * را به آن پرداخت متصل می‌کند (تا در اجرای بعدی دوباره محاسبه نشوند) و
 * یک تراکنش هزینه (EXPENSE) در حسابداری ثبت می‌کند.
 */
export async function runPayroll(userId: string, periodStart: string, periodEnd: string) {
  const auth = await requireRole(...PAYROLL_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { success: false, error: 'بازه‌ی زمانی نامعتبر است' };
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('کاربر یافت نشد');

      const attendances = await tx.attendance.findMany({
        where: {
          payrollPaymentId: null,
          clockIn: { gte: start, lte: end, not: null },
          clockOut: { not: null },
          shiftAssignment: { userId },
        },
      });

      const totalHours = attendances.reduce((sum, a) => {
        if (!a.clockIn || !a.clockOut) return sum;
        return sum + (a.clockOut.getTime() - a.clockIn.getTime()) / (1000 * 60 * 60);
      }, 0);

      if (totalHours <= 0) {
        throw new Error('هیچ ساعت کاریِ پرداخت‌نشده‌ای در این بازه یافت نشد');
      }

      const totalAmount = totalHours * user.hourlyRate;

      const created = await tx.payrollPayment.create({
        data: { userId, periodStart: start, periodEnd: end, totalHours, hourlyRate: user.hourlyRate, totalAmount },
      });

      await tx.attendance.updateMany({
        where: { id: { in: attendances.map((a) => a.id) } },
        data: { payrollPaymentId: created.id },
      });

      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          description: `پرداخت حقوق ${user.name} (${periodStart.slice(0, 10)} تا ${periodEnd.slice(0, 10)})`,
          amount: totalAmount,
          branchId: user.branchId,
          categoryId: SYSTEM_CATEGORY_IDS.EXPENSE_PAYROLL,
          referenceType: 'PAYROLL',
          referenceId: created.id,
          createdByUserId: auth.user.id,
        },
      });

      await logAudit(
        {
          ...actorFieldsFromUser(auth.user),
          action: AuditAction.PAYROLL_RUN,
          entityType: 'PayrollPayment',
          entityId: created.id,
          metadata: { targetUserId: userId, targetUserName: user.name, totalHours, totalAmount, periodStart, periodEnd },
        },
        tx
      );

      return created;
    });

    return { success: true, payment };
  } catch (error: any) {
    console.error('Error running payroll:', error);
    return { success: false, error: error?.message || 'خطا در اجرای حقوق‌دهی' };
  }
}

/** تاریخچه‌ی پرداخت‌های حقوق، در صورت نیاز فیلترشده بر اساس کاربر. */
export async function getPayrollHistory(userId?: string) {
  const auth = await requireRole(...PAYROLL_ROLES);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const payments = await prisma.payrollPayment.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    return { success: false, error: 'خطا در دریافت تاریخچه حقوق‌دهی' };
  }
}
