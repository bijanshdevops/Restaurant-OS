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

interface AwardLoyaltyParams {
  customerId: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  pointsRedeemed: number;
  pointsPerTenThousand: number;
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
  const { customerId, orderId, orderNumber, totalAmount, pointsRedeemed, pointsPerTenThousand } = params;

  const customer = await tx.customer.findUnique({ where: { id: customerId } });
  if (!customer) return 0;

  const pointsEarned = pointsForAmount(totalAmount, pointsPerTenThousand);
  const newTotalSpent = customer.totalSpent + totalAmount;

  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: totalAmount },
      pointsBalance: { increment: pointsEarned - pointsRedeemed },
      loyaltyTier: tierForLifetimeSpend(newTotalSpent),
    },
  });

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
