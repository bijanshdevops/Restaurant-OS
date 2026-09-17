"use server";

import { prisma } from '@/lib/prisma';
import { CampaignSegmentType } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { resolveSegmentWhere } from '@/lib/segments';
import { getSmsProvider } from '@/lib/sms';

/**
 * پیامک بازاریابی/کمپین: مدیریت CRM و ارسال کمپین فقط برای ADMIN باز است
 * (تصمیم صریح محدوده‌ی این فاز) — برخلاف getCustomers که کارکنان صندوق هم
 * برای اتصال مشتری به سفارش به آن نیاز دارند.
 */
const CRM_MARKETING_ROLE = 'ADMIN' as const;

/** یک کمپین جدید در وضعیت DRAFT می‌سازد؛ هنوز چیزی ارسال نمی‌شود. */
export async function createCampaign(data: {
  name: string;
  message: string;
  segmentType: CampaignSegmentType;
  segmentParams?: any;
}) {
  const auth = await requireRole(CRM_MARKETING_ROLE);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name?.trim() || !data.message?.trim()) {
    return { success: false, error: 'نام کمپین و متن پیام الزامی است' };
  }

  try {
    const recipientCount = await prisma.customer.count({
      where: resolveSegmentWhere(data.segmentType, data.segmentParams, true),
    });

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name.trim(),
        message: data.message.trim(),
        segmentType: data.segmentType,
        segmentParams: data.segmentParams ?? undefined,
        recipientCount,
        createdById: auth.user.id,
      },
    });
    return { success: true, campaign };
  } catch (error) {
    console.error('Error creating campaign:', error);
    return { success: false, error: 'خطا در ساخت کمپین' };
  }
}

/**
 * یک کمپین DRAFT را واقعاً ارسال می‌کند: بخش مخاطبان را دوباره محاسبه
 * می‌کند (تا مشتریان جدید/تغییریافته از زمان ساخت کمپین هم لحاظ شوند)،
 * برای هرکدام یک رکورد CampaignRecipient می‌سازد و پیامک را (best-effort،
 * یکی‌یکی) ارسال می‌کند. خطای ارسال به یک مشتری باعث توقف کل کمپین نمی‌شود.
 * فقط از وضعیت DRAFT قابل فراخوانی است — از ارسال دوباره‌ی یک کمپین
 * جلوگیری می‌کند.
 */
export async function sendCampaign(campaignId: string) {
  const auth = await requireRole(CRM_MARKETING_ROLE);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return { success: false, error: 'کمپین یافت نشد' };
    if (campaign.status !== 'DRAFT') {
      return { success: false, error: 'این کمپین قبلاً ارسال شده یا در حال ارسال است' };
    }

    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING' } });

    const recipients = await prisma.customer.findMany({
      where: resolveSegmentWhere(campaign.segmentType, campaign.segmentParams, true),
      select: { id: true, phone: true },
    });

    const smsProvider = getSmsProvider();
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of recipients) {
      try {
        await smsProvider.sendText(customer.phone, campaign.message);
        await prisma.campaignRecipient.upsert({
          where: { campaignId_customerId: { campaignId, customerId: customer.id } },
          create: { campaignId, customerId: customer.id, status: 'SENT', sentAt: new Date() },
          update: { status: 'SENT', sentAt: new Date(), error: null },
        });
        sentCount++;
      } catch (err: any) {
        await prisma.campaignRecipient.upsert({
          where: { campaignId_customerId: { campaignId, customerId: customer.id } },
          create: { campaignId, customerId: customer.id, status: 'FAILED', error: String(err?.message || err) },
          update: { status: 'FAILED', error: String(err?.message || err) },
        });
        failedCount++;
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        recipientCount: recipients.length,
        sentCount,
        failedCount,
      },
    });

    return { success: true, campaign: updated };
  } catch (error) {
    console.error('Error sending campaign:', error);
    await prisma.campaign.updateMany({ where: { id: campaignId, status: 'SENDING' }, data: { status: 'FAILED' } });
    return { success: false, error: 'خطا در ارسال کمپین' };
  }
}

/** فهرست همه‌ی کمپین‌ها (پرمصرف‌ترین/جدیدترین اول). */
export async function getCampaigns() {
  const auth = await requireRole(CRM_MARKETING_ROLE);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return { success: true, campaigns };
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return { success: false, error: 'خطا در دریافت کمپین‌ها' };
  }
}

/** جزئیات یک کمپین به‌همراه فهرست کامل گیرندگان و وضعیت ارسال هرکدام. */
export async function getCampaignDetail(campaignId: string) {
  const auth = await requireRole(CRM_MARKETING_ROLE);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: { select: { id: true, name: true } },
        recipients: {
          include: { customer: { select: { id: true, fullName: true, phone: true } } },
          orderBy: { sentAt: 'desc' },
        },
      },
    });
    if (!campaign) return { success: false, error: 'کمپین یافت نشد' };
    return { success: true, campaign };
  } catch (error) {
    console.error('Error fetching campaign detail:', error);
    return { success: false, error: 'خطا در دریافت جزئیات کمپین' };
  }
}
