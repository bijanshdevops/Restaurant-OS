"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth';

/**
 * فاز ۱۴: کارت هدیه (Gift Card).
 *
 * مدیریت (صدور/فهرست/غیرفعال‌سازی) فقط برای ADMIN است (طبق تصمیمِ
 * تأییدشده‌ی محدوده — نک. توضیحِ کاملِ تصمیم‌ها در schema.prisma بالای
 * بخشِ فازِ ۱۴). استفاده‌ی واقعی از یک کارتِ هدیه در سفارش از طریقِ
 * redeemGiftCardForOrder انجام می‌شود که order.ts آن را از داخلِ همان
 * تراکنشِ ساختِ سفارش صدا می‌زند (نه یک اکشنِ جدا با نقشِ محدودِ خودش) —
 * چون اعتبارسنجی/کسرِ موجودیِ کارت باید اتمیک با خودِ ساختِ سفارش باشد.
 */

function generateGiftCardCode(): string {
  return `GC-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function getGiftCards() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const giftCards = await prisma.giftCard.findMany({
      include: {
        issuedToCustomer: { select: { id: true, fullName: true, phone: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, giftCards };
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    return { success: false, error: 'خطا در دریافت فهرست کارت‌های هدیه' };
  }
}

interface IssueGiftCardInput {
  initialBalance: number;
  code?: string;
  expiresAt?: string | null;
  note?: string;
  customerId?: string;
}

export async function issueGiftCard(input: IssueGiftCardInput) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!Number.isFinite(input.initialBalance) || input.initialBalance <= 0) {
    return { success: false, error: 'مبلغ اولیه‌ی کارت هدیه باید عددی مثبت باشد' };
  }

  const code = (input.code?.trim() || generateGiftCardCode()).toUpperCase();

  try {
    const giftCard = await prisma.$transaction(async (tx) => {
      const existing = await tx.giftCard.findUnique({ where: { code } });
      if (existing) throw new Error('این کد کارت هدیه قبلاً استفاده شده است');

      const created = await tx.giftCard.create({
        data: {
          code,
          initialBalance: input.initialBalance,
          currentBalance: input.initialBalance,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          note: input.note?.trim() || null,
          issuedToCustomerId: input.customerId || null,
          createdByUserId: auth.user.id,
        },
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: created.id,
          type: 'ISSUE',
          amount: input.initialBalance,
          balanceAfter: input.initialBalance,
        },
      });

      return created;
    });

    return { success: true, giftCard };
  } catch (error: any) {
    console.error('Error issuing gift card:', error);
    return { success: false, error: error?.message || 'خطا در صدور کارت هدیه' };
  }
}

export async function deactivateGiftCard(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const giftCard = await prisma.giftCard.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true, giftCard };
  } catch (error) {
    console.error('Error deactivating gift card:', error);
    return { success: false, error: 'خطا در غیرفعال‌سازی کارت هدیه' };
  }
}

export async function getGiftCardTransactions(giftCardId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const transactions = await prisma.giftCardTransaction.findMany({
      where: { giftCardId },
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, transactions };
  } catch (error) {
    console.error('Error fetching gift card transactions:', error);
    return { success: false, error: 'خطا در دریافت تاریخچه‌ی کارت هدیه' };
  }
}

/**
 * اعتبارسنجیِ یک کدِ کارتِ هدیه برای استفاده در سفارش — بدون کسرِ موجودی
 * (فقط برای پیش‌نمایشِ مبلغِ قابلِ استفاده در رابط‌کاربری). کسرِ واقعی در
 * لحظه‌ی ثبتِ سفارش، داخلِ تراکنشِ order.ts، توسطِ applyGiftCardWithinTx
 * انجام می‌شود.
 */
export async function checkGiftCardBalance(code: string) {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return { success: false, error: 'کد کارت هدیه را وارد کنید' };

  try {
    const giftCard = await prisma.giftCard.findUnique({ where: { code: trimmed } });
    if (!giftCard) return { success: false, error: 'کارت هدیه‌ای با این کد یافت نشد' };
    if (!giftCard.isActive) return { success: false, error: 'این کارت هدیه غیرفعال شده است' };
    if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
      return { success: false, error: 'این کارت هدیه منقضی شده است' };
    }
    if (giftCard.currentBalance <= 0) {
      return { success: false, error: 'موجودی این کارت هدیه صفر شده است' };
    }
    return { success: true, balance: giftCard.currentBalance };
  } catch (error) {
    console.error('Error checking gift card balance:', error);
    return { success: false, error: 'خطا در بررسی کارت هدیه' };
  }
}

/**
 * اعتبارسنجی + کسرِ واقعیِ یک کدِ کارتِ هدیه، فراخوانی‌شده از داخلِ همان
 * تراکنشِ Prisma که سفارش را می‌سازد (order.ts) — تا اعتبارسنجی و کسرِ
 * موجودی هرگز از خودِ ساختِ سفارش جدا نیفتد (شرطِ مسابقه‌ی احتمالی بینِ دو
 * سفارشِ هم‌زمان با یک کارت). amountRequested سقفِ مبلغِ باقی‌مانده‌ی
 * سفارش است؛ مبلغِ واقعاً کسرشده هرگز از موجودیِ کارت یا این سقف بیشتر
 * نمی‌شود.
 */
export async function applyGiftCardWithinTx(
  tx: Prisma.TransactionClient,
  code: string,
  amountRequested: number
): Promise<{ giftCardId: string; amountUsed: number }> {
  const trimmed = code.trim().toUpperCase();
  const giftCard = await tx.giftCard.findUnique({ where: { code: trimmed } });
  if (!giftCard) throw new Error('کارت هدیه‌ای با این کد یافت نشد');
  if (!giftCard.isActive) throw new Error('این کارت هدیه غیرفعال شده است');
  if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
    throw new Error('این کارت هدیه منقضی شده است');
  }
  if (giftCard.currentBalance <= 0) {
    throw new Error('موجودی این کارت هدیه صفر شده است');
  }

  const amountUsed = Math.min(giftCard.currentBalance, Math.max(0, amountRequested));
  const balanceAfter = giftCard.currentBalance - amountUsed;

  await tx.giftCard.update({
    where: { id: giftCard.id },
    data: { currentBalance: balanceAfter },
  });

  return { giftCardId: giftCard.id, amountUsed };
}
