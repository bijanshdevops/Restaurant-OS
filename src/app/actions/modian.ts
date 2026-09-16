"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/**
 * لایه‌ی ارسال صورتحساب الکترونیکی به سامانه مودیان.
 *
 * این پیاده‌سازی از طریق یک «معتمد مالیاتی» (TSP) مثل ماهر/زیبال/مالیتور کار می‌کند،
 * نه با اتصال مستقیم و امضای دیجیتال RSA به tax.gov.ir. ساختار payload زیر بر اساس
 * فیلدهای رسمی سامانه مودیان (header: inno/indatim/tins، body: sstid/fee/vra) ساخته
 * شده، اما دقیقِ مسیر/فرمت درخواست HTTP به هر TSP ممکن است کمی متفاوت باشد — وقتی
 * providerی انتخاب و مستندات API آن مشخص شد، فقط تابع sendToTsp نیاز به تنظیم دقیق دارد.
 */

export async function getTaxInvoices() {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const orders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      include: { taxInvoice: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching tax invoices:', error);
    return { success: false, error: 'خطا در دریافت وضعیت صورتحساب‌ها' };
  }
}

function buildInvoicePayload(order: any, settings: any) {
  const issuedAt = new Date();
  return {
    header: {
      // شماره سریال صورتحساب نزد فروشنده (inno طبق مستندات سامانه مودیان)
      inno: order.orderNumber,
      // تاریخ و زمان صدور
      indatim: issuedAt.toISOString(),
      // شناسه/کد اقتصادی فروشنده (tins)
      tins: settings.economicCode,
      nationalId: settings.nationalId,
    },
    body: order.items.map((item: any) => ({
      // کد کالا/خدمت — در نبود کدینگ رسمی کالا، فعلاً از شناسه داخلی استفاده می‌شود
      sstid: item.menuItemId,
      description: item.menuItem?.title || '',
      quantity: item.quantity,
      // مبلغ واحد قبل از مالیات
      fee: item.priceAtTime,
      // نرخ مالیات بر ارزش افزوده (درصد)
      vra: settings.taxPercentage,
    })),
    totalAmount: order.totalAmount,
    orderNumber: order.orderNumber,
  };
}

/**
 * فراخوانی واقعی API معتمد مالیاتی. این تابع یک آداپتور عمومی REST است:
 * payload را به صورت JSON با هدر Authorization به آدرس تنظیم‌شده می‌فرستد.
 * وقتی یک TSP مشخص (مثلاً ماهر یا زیبال) انتخاب شد، ممکن است لازم باشد
 * مسیر دقیق endpoint یا نام هدر احراز هویت طبق مستندات همان سرویس اصلاح شود.
 */
async function sendToTsp(settings: any, payload: any) {
  const endpoint = settings.tspApiBaseUrl.replace(/\/+$/, '') + '/invoices';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.tspApiKey}`,
    },
    body: JSON.stringify(payload),
    // به‌طور پیش‌فرض بدون کش، چون هر ارسال یک عملیات یکتاست
    cache: 'no-store',
  });

  const rawText = await response.text();
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    // پاسخ JSON نبود؛ متن خام را نگه می‌داریم
  }

  if (!response.ok) {
    const message = json?.message || json?.error || rawText || `خطای HTTP ${response.status}`;
    throw new Error(message);
  }

  return {
    raw: json ?? rawText,
    // نام فیلدهای پاسخ بین TSPها متفاوت است؛ رایج‌ترین حالت‌ها را پوشش می‌دهیم
    uid: json?.uid || json?.id || null,
    referenceNumber: json?.referenceNumber || json?.refNumber || null,
    taxUid: json?.taxUid || json?.taxId || json?.uniqueTaxId || null,
  };
}

export async function submitInvoiceToTsp(orderId: string) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const settings = await prisma.restaurantSettings.findUnique({ where: { id: 'default' } });
    if (!settings || !settings.modianEnabled) {
      return { success: false, error: 'اتصال به سامانه مودیان فعال نیست. ابتدا از تنظیمات آن را فعال کنید.' };
    }
    if (!settings.tspApiBaseUrl || !settings.tspApiKey) {
      return { success: false, error: 'آدرس یا کلید API معتمد مالیاتی تنظیم نشده است.' };
    }
    if (!settings.economicCode) {
      return { success: false, error: 'کد اقتصادی رستوران در تنظیمات وارد نشده است.' };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) {
      return { success: false, error: 'سفارش یافت نشد' };
    }
    if (order.status !== 'COMPLETED') {
      return { success: false, error: 'فقط سفارش‌های تکمیل‌شده قابل ارسال به سامانه مودیان هستند' };
    }

    const payload = buildInvoicePayload(order, settings);

    // رکورد را قبل از ارسال با وضعیت PENDING ثبت/به‌روزرسانی می‌کنیم
    await prisma.taxInvoice.upsert({
      where: { orderId },
      create: { orderId, status: 'PENDING', payload },
      update: { status: 'PENDING', payload, errorMessage: null },
    });

    try {
      const result = await sendToTsp(settings, payload);
      const updated = await prisma.taxInvoice.update({
        where: { orderId },
        data: {
          status: 'CONFIRMED',
          uid: result.uid,
          referenceNumber: result.referenceNumber,
          taxUid: result.taxUid,
          sentAt: new Date(),
          confirmedAt: new Date(),
          errorMessage: null,
        },
      });
      return { success: true, taxInvoice: updated };
    } catch (sendError: any) {
      const failed = await prisma.taxInvoice.update({
        where: { orderId },
        data: {
          status: 'FAILED',
          errorMessage: sendError?.message || 'خطا در ارتباط با معتمد مالیاتی',
          sentAt: new Date(),
        },
      });
      return { success: false, error: failed.errorMessage, taxInvoice: failed };
    }
  } catch (error) {
    console.error('Error submitting invoice to TSP:', error);
    return { success: false, error: 'خطای غیرمنتظره در ارسال صورتحساب' };
  }
}
