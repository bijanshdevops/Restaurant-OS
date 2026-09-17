"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { AuditAction, Prisma } from '@prisma/client';

/**
 * Phase 11: لاگ عملیات و ممیزی.
 *
 * دسترسی این ماژول عمداً فقط ADMIN است (طبق انتخاب کاربر). این اکشن‌ها
 * فقط برای خواندن/فیلترکردن لاگ‌اند؛ خودِ ثبت لاگ از طریق logAudit()
 * (src/lib/auditLog.ts) در نقاط رویدادهای حساس صورت می‌گیرد، نه اینجا.
 */

interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/** فهرست فیلترشده‌ی لاگ عملیات و ممیزی، جدیدترین اول. */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, logs };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'خطا در دریافت لاگ عملیات و ممیزی' };
  }
}

/** فهرست مقادیر ممکنِ نوع رویداد (action)، برای پر کردن فیلتر در رابط کاربری. */
export async function getAuditActionList() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  return { success: true, actions: Object.values(AuditAction) };
}
