"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

// Powers the main /dashboard landing page widgets with real data from the
// actual Postgres database (these used to be fed by a completely separate,
// disconnected mock API that always returned hardcoded demo numbers).

export async function getDashboardAnalytics() {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const orders = await prisma.order.findMany({
      select: {
        totalAmount: true,
        customer: { select: { loyaltyTier: true } },
      },
    });

    const totalOrders = orders.length;
    let totalRevenue = 0;
    let vipRevenue = 0;
    let regularRevenue = 0;

    for (const order of orders) {
      totalRevenue += order.totalAmount;
      if (order.customer?.loyaltyTier === 'VIP') {
        vipRevenue += order.totalAmount;
      } else {
        regularRevenue += order.totalAmount;
      }
    }

    return {
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        revenueBySegment: { VIP: vipRevenue, REGULAR: regularRevenue },
      },
    };
  } catch (error) {
    console.error('Error computing dashboard analytics:', error);
    return { success: false, error: 'خطا در محاسبه‌ی آمار داشبورد' };
  }
}

export async function getRecentOrders(limit: number = 8) {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { customer: true },
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return { success: false, error: 'خطا در دریافت سفارشات اخیر' };
  }
}
