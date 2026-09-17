import { Prisma, LoyaltyTier } from '@prisma/client';

/** Lifetime-spend thresholds (in Toman) for each loyalty tier. */
const TIER_THRESHOLDS: [LoyaltyTier, number][] = [
  ['VIP', 15_000_000],
  ['GOLD', 7_000_000],
  ['SILVER', 3_000_000],
  ['BRONZE', 1_000_000],
];

export function tierForLifetimeSpend(totalSpent: number): LoyaltyTier {
  for (const [tier, threshold] of TIER_THRESHOLDS) {
    if (totalSpent >= threshold) return tier;
  }
  return 'NORMAL';
}

export function pointsForAmount(amountToman: number, pointsPerTenThousand: number): number {
  return Math.floor((amountToman / 10_000) * pointsPerTenThousand);
}

/** Generates a short, human-shareable referral code, e.g. "REF-8K3QZP". */
export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `REF-${code}`;
}

interface AwardLoyaltyParams {
  customerId: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  pointsRedeemed: number;
  pointsPerTenThousand: number;
  /** Bonus points granted to the referrer on the referred customer's first order (0 disables). */
  referralBonusPoints?: number;
}

/**
 * Applies the loyalty-club side effects of a completed/paid order to a
 * customer: awards points for the amount spent, records the points
 * redeemed (if any) as a ledger entry, updates lifetime spend/order count,
 * and recomputes the tier from real lifetime spend. Used by both the POS
 * flow (order paid instantly at the counter) and the online ordering flow
 * (order finalized once ZarinPal confirms payment).
 *
 * Must be called inside the same Prisma transaction as the rest of the
 * order's fulfillment side effects, so points/tier and the order they came
 * from are always consistent.
 */
export async function awardLoyaltyForOrder(
  tx: Prisma.TransactionClient,
  params: AwardLoyaltyParams
): Promise<number> {
  const { customerId, orderId, orderNumber, totalAmount, pointsRedeemed, pointsPerTenThousand, referralBonusPoints } = params;

  const customer = await tx.customer.findUnique({ where: { id: customerId } });
  if (!customer) return 0;

  const pointsEarned = pointsForAmount(totalAmount, pointsPerTenThousand);
  const newTotalSpent = customer.totalSpent + totalAmount;
  const isFirstOrder = customer.totalOrders === 0;

  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: totalAmount },
      pointsBalance: { increment: pointsEarned - pointsRedeemed },
      loyaltyTier: tierForLifetimeSpend(newTotalSpent),
    },
  });

  // --- Phase 6: referral program ---
  // اگر این اولین سفارش مشتری است و او با کد معرفیِ یک مشتری دیگر ثبت‌نام
  // کرده، به معرفی‌کننده یک‌بار پاداز امتیازی تعلق می‌گیرد. isFirstOrder از
  // روی totalOrders قبل از increment بالا محاسبه شده، پس این شرط دقیقاً یک
  // بار در طول عمر مشتریِ معرفی‌شده true می‌شود؛ فلگ referralRewardGranted
  // هم به‌عنوان یک لایه‌ی محافظتی اضافه (در برابر فراخوانی دوباره، مثلاً یک
  // callback تکراری درگاه پرداخت) نگه داشته می‌شود.
  if (
    isFirstOrder &&
    customer.referredByCustomerId &&
    !customer.referralRewardGranted &&
    referralBonusPoints &&
    referralBonusPoints > 0
  ) {
    await tx.customer.update({
      where: { id: customer.referredByCustomerId },
      data: { pointsBalance: { increment: referralBonusPoints } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        customerId: customer.referredByCustomerId,
        type: 'EARNED',
        points: referralBonusPoints,
        description: `پاداش معرفی مشتری جدید (اولین سفارش ${orderNumber})`,
      },
    });
    await tx.customer.update({
      where: { id: customerId },
      data: { referralRewardGranted: true },
    });
  }

  if (pointsRedeemed > 0) {
    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'REDEEMED',
        points: -pointsRedeemed,
        orderId,
        description: `استفاده از امتیاز در سفارش ${orderNumber}`,
      },
    });
  }

  if (pointsEarned > 0) {
    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'EARNED',
        points: pointsEarned,
        orderId,
        description: `امتیاز کسب‌شده از سفارش ${orderNumber}`,
      },
    });
  }

  return pointsEarned;
}

interface ReverseLoyaltyParams {
  customerId: string;
  orderId: string;
  orderNumber: string;
  /** امتیازی که باید به‌دلیل این مرجوعی از موجودی مشتری کسر شود (سهم مرجوع‌شده از امتیاز کسب‌شده‌ی سفارش). */
  pointsToClaw: number;
  /** امتیازی که باید برگردانده شود، چون مشتری در همین سفارش برای پرداخت آن استفاده کرده بود (سهم مرجوع‌شده). */
  pointsToReturn: number;
  /** مبلغی که باید از totalSpent کسر شود (سهم مرجوع‌شده از مبلغ سفارش). */
  refundedAmount: number;
  /** فقط برای مرجوعی‌ای که سفارش را به‌طور کامل مرجوع می‌کند: یک عدد از totalOrders کم می‌کند. */
  decrementOrderCount?: boolean;
}

/**
 * برگشت اثرات باشگاه مشتریان یک مرجوعی (کامل یا جزئی) روی حساب مشتری —
 * برعکسِ awardLoyaltyForOrder. چون هر مرجوعی حداکثر به‌اندازه‌ی مانده‌ی
 * تعدادِ هر ردیف سفارش مجاز است (نک. refund.ts)، مجموع pointsToClaw و
 * refundedAmount در طول عمر یک سفارش، در همه‌ی مرجوعی‌های آن، هرگز از مقدار
 * اصلی سفارش بیشتر نمی‌شود — پس این تابع نیازی به آگاهی از تاریخچه‌ی
 * مرجوعی‌های قبلی همان سفارش ندارد و می‌تواند مستقل برای هر مرجوعی صدا زده
 * شود. pointsBalance/totalSpent هرگز منفی نمی‌شوند (کف صفر).
 *
 * باید داخل همان تراکنش Prisma‌ای صدا زده شود که رکورد Refund را می‌سازد.
 */
export async function reverseLoyaltyForRefund(
  tx: Prisma.TransactionClient,
  params: ReverseLoyaltyParams
): Promise<void> {
  const { customerId, orderId, orderNumber, pointsToClaw, pointsToReturn, refundedAmount, decrementOrderCount } = params;

  const customer = await tx.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const newTotalSpent = Math.max(0, customer.totalSpent - refundedAmount);
  const newPointsBalance = Math.max(0, customer.pointsBalance + pointsToReturn - pointsToClaw);
  const newTotalOrders = decrementOrderCount ? Math.max(0, customer.totalOrders - 1) : customer.totalOrders;

  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      pointsBalance: newPointsBalance,
      loyaltyTier: tierForLifetimeSpend(newTotalSpent),
    },
  });

  if (pointsToClaw > 0) {
    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'ADJUSTED',
        points: -pointsToClaw,
        orderId,
        description: `کسر امتیاز به‌دلیل مرجوعی سفارش ${orderNumber}`,
      },
    });
  }

  if (pointsToReturn > 0) {
    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'ADJUSTED',
        points: pointsToReturn,
        orderId,
        description: `بازگشت امتیاز استفاده‌شده به‌دلیل مرجوعی سفارش ${orderNumber}`,
      },
    });
  }
}
