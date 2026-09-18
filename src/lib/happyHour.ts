/**
 * فاز ۱۵: منطقِ خالصِ (بدون دیتابیس) محاسبه‌ی این‌که «آیا این قانونِ Happy
 * Hour، همین الان، فعال است؟» و «قیمتِ نهاییِ یک آیتم بعد از اعمالِ
 * بهترین تخفیفِ منطبق چقدر است؟». عمداً خالص و بدونِ وابستگی به Prisma
 * نگه داشته شده تا هم توسطِ order.ts (برای قیمت‌گذاریِ واقعیِ سفارش) و
 * هم توسطِ اکشن‌های نمایشِ منو (برای پیش‌نمایشِ قیمت) با یک منطقِ واحد
 * استفاده شود، و هم به‌سادگی با تستِ واحد (بدون سرور/دیتابیس) قابلِ
 * بررسی باشد.
 */

export interface HappyHourRuleLike {
  id: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  daysOfWeek: number[]; // 0=Sunday..6=Saturday (Date.getDay())
  startMinute: number; // دقیقه از نیمه‌شب
  endMinute: number;
  isActive: boolean;
}

/** آیا این قانون، در لحظه‌ی «now»، از نظرِ روز/بازه‌ی زمانی فعال است؟ */
export function isRuleActiveNow(rule: HappyHourRuleLike, now: Date): boolean {
  if (!rule.isActive) return false;
  const day = now.getDay();
  if (!rule.daysOfWeek.includes(day)) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (rule.startMinute <= rule.endMinute) {
    return minutes >= rule.startMinute && minutes < rule.endMinute;
  }
  // بازه‌ای که از نیمه‌شب عبور می‌کند (مثلاً ۲۳:۰۰ تا ۰۱:۰۰).
  return minutes >= rule.startMinute || minutes < rule.endMinute;
}

/** مبلغِ تخفیفِ یک قانون روی یک قیمتِ پایه‌ی مشخص (هرگز بیش از خودِ قیمت). */
export function ruleDiscountAmount(rule: HappyHourRuleLike, basePrice: number): number {
  const raw = rule.discountType === 'PERCENT' ? (basePrice * rule.value) / 100 : rule.value;
  return Math.max(0, Math.min(raw, basePrice));
}

export interface EffectivePriceResult {
  effectivePrice: number;
  discountAmount: number;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
}

/**
 * از میانِ قوانینِ منطبق بر یک آیتم، در لحظه‌ی «now»، قانونی که بیش‌ترین
 * تخفیف را می‌دهد اعمال می‌شود (همیشه به نفعِ مشتری) — نک. توضیحِ تصمیمِ
 * محدوده در schema.prisma.
 */
export function computeEffectivePrice(
  basePrice: number,
  rules: HappyHourRuleLike[],
  now: Date = new Date()
): EffectivePriceResult {
  let best: EffectivePriceResult = {
    effectivePrice: basePrice,
    discountAmount: 0,
    appliedRuleId: null,
    appliedRuleName: null,
  };

  for (const rule of rules) {
    if (!isRuleActiveNow(rule, now)) continue;
    const discount = ruleDiscountAmount(rule, basePrice);
    if (discount > best.discountAmount) {
      best = {
        effectivePrice: basePrice - discount,
        discountAmount: discount,
        appliedRuleId: rule.id,
        appliedRuleName: rule.name,
      };
    }
  }

  return best;
}
