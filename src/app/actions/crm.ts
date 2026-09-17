"use server";

import { prisma } from '@/lib/prisma';
import { LoyaltyTier, Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { generateReferralCode } from '@/lib/loyalty';
import { getSmsProvider } from '@/lib/sms';
import { resolveSegmentWhere } from '@/lib/segments';
import { CampaignSegmentType } from '@prisma/client';

/**
 * فهرست پایه‌ی مشتریان — برای دو مصرف کاملاً متفاوت به‌کار می‌رود: پنل
 * مدیریت CRM (ADMIN) و انتخابگر مشتری در صفحه‌ی صندوق/POS (CASHIER، برای
 * اتصال مشتری به سفارش و اعطای امتیاز وفاداری). به همین دلیل نقش‌های مجاز
 * این اکشن نباید محدودتر شود، برخلاف بقیه‌ی اکشن‌های این فایل که مخصوص
 * مدیریت CRM هستند و فقط ADMIN اجازه‌ی استفاده از آن‌ها را دارد.
 */
export async function getCustomers() {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const customers = await prisma.customer.findMany({
      orderBy: [
        { loyaltyTier: 'desc' },
        { totalSpent: 'desc' }
      ]
    });
    return { success: true, customers };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }
}

export async function createCustomer(data: {
  fullName: string;
  phone: string;
}) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const newCustomer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        loyaltyTier: 'NORMAL',
        totalOrders: 0,
        totalSpent: 0,
        referralCode: generateReferralCode(),
      }
    });

    // پیام خوشامدگویی — یک پیامک تراکنشیِ یک‌بار (نه بازاریابی)، پس منتظر
    // marketingOptIn نمی‌ماند. خطای احتمالی ارسال هرگز ثبت مشتری را نمی‌شکند.
    getSmsProvider()
      .sendText(newCustomer.phone, `${newCustomer.fullName} عزیز، به باشگاه مشتریان ما خوش آمدید!`)
      .catch((err) => console.error('Error sending welcome SMS:', err));

    return { success: true, customer: newCustomer };
  } catch (error) {
    console.error('Error creating customer:', error);
    // Unique constraint on phone can throw an error
    return { success: false, error: 'Failed to create customer (Phone number might already exist)' };
  }
}

// =====================================================================
// Phase 6: CRM & Marketing — بخش‌های زیر مخصوص پنل مدیریت CRM هستند و
// فقط ADMIN اجازه‌ی استفاده از آن‌ها را دارد (برخلاف getCustomers/
// createCustomer بالا که برای گردش‌کار صندوق هم لازم‌اند).
// =====================================================================

/** پروفایل کامل یک مشتری: یادداشت‌ها، بازخوردها، تراکنش‌های وفاداری و معرفی‌ها. */
export async function getCustomerDetail(customerId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } },
        feedbacks: { orderBy: { createdAt: 'desc' }, include: { order: { select: { orderNumber: true } } } },
        loyaltyTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        orders: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true } },
        referredCustomers: { select: { id: true, fullName: true, phone: true, referralRewardGranted: true } },
        referredByCustomer: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (!customer) return { success: false, error: 'مشتری یافت نشد' };
    return { success: true, customer };
  } catch (error) {
    console.error('Error fetching customer detail:', error);
    return { success: false, error: 'خطا در دریافت اطلاعات مشتری' };
  }
}

/** یک یادداشت داخلی جدید روی پروفایل مشتری ثبت می‌کند (سلیقه، شکایت، تعامل خاص و...). */
export async function addCustomerNote(customerId: string, content: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!content?.trim()) {
    return { success: false, error: 'متن یادداشت نمی‌تواند خالی باشد' };
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { success: false, error: 'مشتری یافت نشد' };

    const note = await prisma.customerNote.create({
      data: { customerId, authorId: auth.user.id, content: content.trim() },
      include: { author: { select: { id: true, name: true } } },
    });
    return { success: true, note };
  } catch (error) {
    console.error('Error adding customer note:', error);
    return { success: false, error: 'خطا در ثبت یادداشت' };
  }
}

/** ویرایش پروفایل بازاریابی مشتری: ایمیل، برچسب‌ها، رضایت دریافت پیامک، تاریخ تولد. */
export async function updateCustomerProfile(
  customerId: string,
  data: { email?: string; tags?: string[]; marketingOptIn?: boolean; dateOfBirth?: string | null }
) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) return { success: false, error: 'مشتری یافت نشد' };

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        email: data.email !== undefined ? data.email.trim() || null : undefined,
        tags: data.tags !== undefined ? data.tags.map((t) => t.trim()).filter(Boolean) : undefined,
        marketingOptIn: data.marketingOptIn,
        dateOfBirth: data.dateOfBirth !== undefined ? (data.dateOfBirth ? new Date(data.dateOfBirth) : null) : undefined,
      },
    });
    return { success: true, customer };
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return { success: false, error: 'خطا در ویرایش پروفایل مشتری' };
  }
}

/**
 * پیش‌نمایش یک بخش (segment) پیش از ساخت کمپین: چند نفر در کل در این بخش
 * هستند و از این تعداد، چند نفر واقعاً اجازه‌ی دریافت پیامک بازاریابی
 * داده‌اند (یعنی وقتی کمپین ارسال شود، پیامک به چند نفر می‌رسد).
 */
export async function getCustomerSegmentPreview(segmentType: CampaignSegmentType, segmentParams?: any) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const [totalInSegment, optedInCount] = await Promise.all([
      prisma.customer.count({ where: resolveSegmentWhere(segmentType, segmentParams, false) }),
      prisma.customer.count({ where: resolveSegmentWhere(segmentType, segmentParams, true) }),
    ]);
    return { success: true, totalInSegment, optedInCount };
  } catch (error) {
    console.error('Error previewing segment:', error);
    return { success: false, error: 'خطا در محاسبه‌ی بخش مخاطبان' };
  }
}

/** فهرست همه‌ی برچسب‌های در حال استفاده روی مشتریان — برای پرکردن گزینه‌های فیلتر «برچسب» در فرم کمپین. */
export async function getDistinctCustomerTags() {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const customers = await prisma.customer.findMany({ where: { tags: { isEmpty: false } }, select: { tags: true } });
    const tagSet = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return { success: true, tags: Array.from(tagSet).sort() };
  } catch (error) {
    console.error('Error fetching distinct tags:', error);
    return { success: false, error: 'خطا در دریافت برچسب‌ها' };
  }
}

/**
 * مشتریانی که تاریخ تولدشان (بدون توجه به سال) در N روز آینده قرار می‌گیرد
 * (برای پیام تبریک تولد). محاسبه در جاوااسکریپت انجام می‌شود چون Prisma
 * فیلتر بر اساس «ماه/روز» یک تاریخ را به‌صورت مستقیم پشتیبانی نمی‌کند؛ از
 * segmentType=CUSTOM (با همین فهرست شناسه‌ها) برای ساخت کمپین استفاده می‌شود.
 */
export async function getUpcomingBirthdayCustomers(withinDays: number = 30) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const customers = await prisma.customer.findMany({
      where: { dateOfBirth: { not: null }, marketingOptIn: true },
      select: { id: true, fullName: true, phone: true, dateOfBirth: true },
    });

    const today = new Date();

    const matches = customers.filter((c) => {
      const dob = c.dateOfBirth!;
      for (let offset = 0; offset <= withinDays; offset++) {
        const probe = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        if (probe.getMonth() === dob.getMonth() && probe.getDate() === dob.getDate()) return true;
      }
      return false;
    });

    return { success: true, customers: matches };
  } catch (error) {
    console.error('Error fetching upcoming birthdays:', error);
    return { success: false, error: 'خطا در محاسبه‌ی تولدهای نزدیک' };
  }
}
