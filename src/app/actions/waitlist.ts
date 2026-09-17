"use server";

import { prisma } from '@/lib/prisma';
import { requireRole, resolveBranchFilter, resolveBranchForCreate, isBranchExempt } from '@/lib/auth';

// لیست انتظارِ حضوری (walk-in) — مستقل از Reservation؛ نگاه کلی طراحی در
// prisma/schema.prisma (بخش Phase 12) مستند شده است. دسترسی مثل رزرو
// فعلی: ADMIN + CASHIER.

export async function getWaitlist(branchId?: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        status: 'WAITING',
      },
      include: {
        table: { select: { id: true, number: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, entries };
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return { success: false, error: 'خطا در دریافت لیست انتظار' };
  }
}

interface JoinWaitlistInput {
  guestName: string;
  guestPhone: string;
  partySize: number;
  notes?: string;
  branchId?: string;
}

export async function joinWaitlist(input: JoinWaitlistInput) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!input.guestName?.trim()) {
      return { success: false, error: 'نام مشتری الزامی است' };
    }
    if (!input.guestPhone?.trim()) {
      return { success: false, error: 'شماره تماس الزامی است' };
    }
    if (!Number.isFinite(input.partySize) || input.partySize <= 0) {
      return { success: false, error: 'تعداد نفرات نامعتبر است' };
    }

    const effectiveBranchId = resolveBranchForCreate(auth.user, input.branchId);
    const entry = await prisma.waitlistEntry.create({
      data: {
        guestName: input.guestName.trim(),
        guestPhone: input.guestPhone.trim(),
        partySize: input.partySize,
        notes: input.notes?.trim() || '',
        branchId: effectiveBranchId,
      },
    });
    return { success: true, entry };
  } catch (error) {
    console.error('Error joining waitlist:', error);
    return { success: false, error: 'خطا در ثبت در لیست انتظار' };
  }
}

/**
 * نشاندنِ یک مشتریِ منتظر روی یک میزِ مشخص — وضعیت را به SEATED تغییر
 * می‌دهد و همان منطقِ همگام‌سازیِ Table.status را که در
 * updateReservationStatus (شاخه‌ی SEATED) استفاده شده، تکرار می‌کند.
 */
export async function seatFromWaitlist(id: string, tableId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
    if (!entry) return { success: false, error: 'مورد یافت نشد' };
    if (!isBranchExempt(auth.user) && entry.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }
    if (entry.status !== 'WAITING') {
      return { success: false, error: 'این مورد دیگر در وضعیت انتظار نیست' };
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) return { success: false, error: 'میز مورد نظر یافت نشد' };
    if (table.branchId !== entry.branchId) {
      return { success: false, error: 'میز متعلق به شعبه‌ی این مورد نیست' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.waitlistEntry.update({
        where: { id },
        data: { status: 'SEATED', seatedAt: new Date(), tableId },
      });
      await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
      return result;
    });

    return { success: true, entry: updated };
  } catch (error) {
    console.error('Error seating from waitlist:', error);
    return { success: false, error: 'خطا در نشاندن مشتری' };
  }
}

export async function cancelWaitlistEntry(id: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
    if (!entry) return { success: false, error: 'مورد یافت نشد' };
    if (!isBranchExempt(auth.user) && entry.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }
    if (entry.status !== 'WAITING') {
      return { success: false, error: 'این مورد دیگر در وضعیت انتظار نیست' };
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return { success: true, entry: updated };
  } catch (error) {
    console.error('Error cancelling waitlist entry:', error);
    return { success: false, error: 'خطا در لغو مورد' };
  }
}
