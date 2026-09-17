import { describe, it, expect } from 'vitest';
import { tierForLifetimeSpend, pointsForAmount } from '../src/lib/loyalty';

describe('باشگاه مشتریان: محاسبات امتیاز و سطح (واحد، بدون نیاز به سرور)', () => {
  it('سطح مشتری را از روی مجموع خرید عمرش به‌درستی تعیین می‌کند', () => {
    expect(tierForLifetimeSpend(0)).toBe('NORMAL');
    expect(tierForLifetimeSpend(999_999)).toBe('NORMAL');
    expect(tierForLifetimeSpend(1_000_000)).toBe('BRONZE');
    expect(tierForLifetimeSpend(2_999_999)).toBe('BRONZE');
    expect(tierForLifetimeSpend(3_000_000)).toBe('SILVER');
    expect(tierForLifetimeSpend(7_000_000)).toBe('GOLD');
    expect(tierForLifetimeSpend(15_000_000)).toBe('VIP');
    expect(tierForLifetimeSpend(50_000_000)).toBe('VIP');
  });

  it('امتیاز کسب‌شده متناسب با نرخ تنظیم‌شده و مبلغ سفارش محاسبه می‌شود', () => {
    expect(pointsForAmount(100_000, 1)).toBe(10); // ۱۰۰,۰۰۰ تومان × ۱ امتیاز به ازای هر ۱۰,۰۰۰ تومان
    expect(pointsForAmount(105_000, 1)).toBe(10); // باقیمانده به نفع مشتری گرد نمی‌شود (floor)
    expect(pointsForAmount(100_000, 2)).toBe(20);
    expect(pointsForAmount(0, 1)).toBe(0);
  });
});
