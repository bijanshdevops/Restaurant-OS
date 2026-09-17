import { prisma } from '@/lib/prisma';
import { Prisma, AuditAction } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';

type AuditDbClient = typeof prisma | Prisma.TransactionClient;

interface LogAuditParams {
  actorUserId?: string | null;
  actorName: string;
  actorRole?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
}

/**
 * ثبت یک رویداد در لاگ عملیات و ممیزی (Phase 11).
 *
 * فقط برای رویدادهای «حساس» فراخوانی شود (نک. README برای فهرست کامل) —
 * نه برای خواندن‌های معمول و نه برای سفارش‌های عادی POS.
 *
 * این تابع هرگز نباید عملیات اصلیِ صداکننده را مختل کند: هر خطایی در
 * نوشتن ردیف لاگ (مثلاً قطعی موقت دیتابیس) فقط در کنسول ثبت می‌شود، نه
 * throw — یک نقص در ثبت لاگ نباید یک عملیات تجاری واقعی (حذف کاربر، ثبت
 * مرجوعی، اجرای حقوق‌دهی و…) را با شکست مواجه کند.
 *
 * وقتی این تابع از داخل یک prisma.$transaction فراخوانی می‌شود، حتماً
 * همان کلاینت تراکنش (tx) را به‌عنوان آرگومان دوم پاس بدهید — وگرنه ممکن
 * است یک ردیف لاگ برای عملیاتی commit شود که خودِ تراکنش‌اش در نهایت
 * rollback می‌شود و هرگز واقعاً اتفاق نمی‌افتد.
 */
export async function logAudit(params: LogAuditParams, db: AuditDbClient = prisma): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorName: params.actorName,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata === undefined ? Prisma.JsonNull : (params.metadata as Prisma.InputJsonValue),
        success: params.success ?? true,
      },
    });
  } catch (error) {
    console.error('Error writing audit log (non-blocking):', error);
  }
}

/** فیلدهای actor استاندارد از روی SessionUser، برای استفاده‌ی تکراری در نقاط ثبت لاگ. */
export function actorFieldsFromUser(user: SessionUser) {
  return {
    actorUserId: user.id,
    actorName: user.name,
    actorRole: user.roles?.[0] ?? null,
  };
}
