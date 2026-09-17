"use server";

import { prisma } from '@/lib/prisma';
import { requireRole, resolveBranchFilter, resolveBranchForCreate, isBranchExempt } from '@/lib/auth';
import { ReservationStatus, TableStatus } from '@prisma/client';

// ---------- Tables ----------

export async function getTables(branchId?: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    const tables = await prisma.table.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
      orderBy: [{ branchId: 'asc' }, { number: 'asc' }],
      include: {
        branch: { select: { id: true, name: true } },
        reservations: {
          where: { status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] } },
          orderBy: { reservationTime: 'asc' },
          take: 3,
        },
      },
    });
    return { success: true, tables };
  } catch (error) {
    console.error('Error fetching tables:', error);
    return { success: false, error: 'خطا در دریافت میزها' };
  }
}

export async function createTable(number: number, capacity: number, branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!Number.isFinite(number) || number <= 0) {
      return { success: false, error: 'شماره میز نامعتبر است' };
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return { success: false, error: 'ظرفیت میز نامعتبر است' };
    }
    const effectiveBranchId = resolveBranchForCreate(auth.user, branchId);
    const table = await prisma.table.create({ data: { number, capacity, branchId: effectiveBranchId } });
    return { success: true, table };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'میزی با این شماره در این شعبه از قبل وجود دارد' };
    }
    console.error('Error creating table:', error);
    return { success: false, error: 'خطا در ایجاد میز' };
  }
}

export async function updateTableStatus(tableId: string, status: TableStatus) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.table.findUnique({ where: { id: tableId } });
    if (!existing) return { success: false, error: 'میز یافت نشد' };
    if (!isBranchExempt(auth.user) && existing.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const table = await prisma.table.update({ where: { id: tableId }, data: { status } });
    return { success: true, table };
  } catch (error) {
    console.error('Error updating table status:', error);
    return { success: false, error: 'خطا در تغییر وضعیت میز' };
  }
}

// ---------- Reservations ----------

const ACTIVE_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED'];
const CONFLICT_WINDOW_MINUTES = 90;

export async function getReservations(from?: Date, to?: Date, branchId?: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    const where: any = {};
    if (effectiveBranchId) where.branchId = effectiveBranchId;
    if (from || to) {
      where.reservationTime = {};
      if (from) where.reservationTime.gte = from;
      if (to) where.reservationTime.lte = to;
    }
    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: true, customer: true, branch: { select: { id: true, name: true } } },
      orderBy: { reservationTime: 'asc' },
    });
    return { success: true, reservations };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: 'خطا در دریافت رزروها' };
  }
}

interface CreateReservationInput {
  tableId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationTime: Date;
  customerId?: string;
  notes?: string;
}

export async function createReservation(input: CreateReservationInput) {
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
    const reservationTime = new Date(input.reservationTime);
    if (isNaN(reservationTime.getTime())) {
      return { success: false, error: 'زمان رزرو نامعتبر است' };
    }

    const table = await prisma.table.findUnique({ where: { id: input.tableId } });
    if (!table) {
      return { success: false, error: 'میز مورد نظر یافت نشد' };
    }
    // رزرو همیشه در همان شعبه‌ی میز ثبت می‌شود؛ پرسنل غیر مدیر فقط می‌توانند
    // برای میزهای شعبه‌ی خودشان رزرو بگیرند.
    if (!isBranchExempt(auth.user) && table.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    // Prevent double-booking the same table within a ±90 minute window
    const windowStart = new Date(reservationTime.getTime() - CONFLICT_WINDOW_MINUTES * 60000);
    const windowEnd = new Date(reservationTime.getTime() + CONFLICT_WINDOW_MINUTES * 60000);
    const conflict = await prisma.reservation.findFirst({
      where: {
        tableId: input.tableId,
        status: { in: ACTIVE_STATUSES },
        reservationTime: { gte: windowStart, lte: windowEnd },
      },
    });
    if (conflict) {
      return { success: false, error: 'این میز در این بازه زمانی قبلاً رزرو شده است' };
    }

    const reservation = await prisma.reservation.create({
      data: {
        tableId: input.tableId,
        branchId: table.branchId,
        guestName: input.guestName.trim(),
        guestPhone: input.guestPhone.trim(),
        partySize: input.partySize,
        reservationTime,
        customerId: input.customerId || null,
        notes: input.notes?.trim() || '',
      },
    });

    return { success: true, reservation };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { success: false, error: 'خطا در ثبت رزرو' };
  }
}

export async function updateReservationStatus(reservationId: string, status: ReservationStatus) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) {
      return { success: false, error: 'رزرو یافت نشد' };
    }
    if (!isBranchExempt(auth.user) && reservation.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status },
      });

      // Keep the table's own status roughly in sync with the reservation's lifecycle.
      if (status === 'SEATED') {
        await tx.table.update({ where: { id: reservation.tableId }, data: { status: 'OCCUPIED' } });
      } else if (status === 'CONFIRMED') {
        await tx.table.update({ where: { id: reservation.tableId }, data: { status: 'RESERVED' } });
      } else if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW') {
        // Only free the table up if there is no other active reservation still holding it right now
        const stillActive = await tx.reservation.findFirst({
          where: {
            tableId: reservation.tableId,
            status: { in: ACTIVE_STATUSES },
            id: { not: reservationId },
          },
        });
        if (!stillActive) {
          await tx.table.update({ where: { id: reservation.tableId }, data: { status: 'AVAILABLE' } });
        }
      }

      return updatedReservation;
    });

    return { success: true, reservation: updated };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return { success: false, error: 'خطا در تغییر وضعیت رزرو' };
  }
}
