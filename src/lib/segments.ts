import { CampaignSegmentType, Prisma } from '@prisma/client';

/**
 * تبدیل یک نوع بخش‌بندی (segment) + پارامترهایش به شرط Prisma برای فیلتر
 * جدول Customer. هم در پیش‌نمایش شمار مخاطبان کمپین (CRM) و هم در واقعِ
 * ارسال کمپین (marketing) استفاده می‌شود، تا این دو همیشه دقیقاً یک
 * مخاطب‌گیری را ببینند.
 *
 * requireOptIn=true (پیش‌فرض) فقط مشتریانی را برمی‌گرداند که اجازه‌ی
 * دریافت پیامک بازاریابی داده‌اند — همان چیزی که هنگام واقعاً ارسال کردن
 * یک کمپین باید رعایت شود. پیش‌نمایش تعداد کل بخش (صرف‌نظر از opt-in) با
 * false به‌دست می‌آید تا ادمین بداند از چند نفر، چند نفر واقعاً پیامک
 * می‌گیرند.
 */
export function resolveSegmentWhere(
  segmentType: CampaignSegmentType,
  params: any,
  requireOptIn: boolean = true
): Prisma.CustomerWhereInput {
  const optInClause: Prisma.CustomerWhereInput = requireOptIn ? { marketingOptIn: true } : {};

  switch (segmentType) {
    case 'ALL':
      return optInClause;

    case 'TIER': {
      const tier = params?.tier;
      if (!tier) return { id: 'never-matches' };
      return { ...optInClause, loyaltyTier: tier };
    }

    case 'TAG': {
      const tag = params?.tag;
      if (!tag) return { id: 'never-matches' };
      return { ...optInClause, tags: { has: tag } };
    }

    case 'INACTIVE': {
      const days = Number(params?.daysSinceLastVisit) > 0 ? Number(params.daysSinceLastVisit) : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return { ...optInClause, lastVisit: { lt: cutoff } };
    }

    case 'CUSTOM': {
      const ids = Array.isArray(params?.customerIds) ? params.customerIds : [];
      if (ids.length === 0) return { id: 'never-matches' };
      return { ...optInClause, id: { in: ids } };
    }

    default:
      return { id: 'never-matches' };
  }
}
