"use server";

import { prisma } from '@/lib/prisma';
import { Prisma, OrderStatus } from '@prisma/client';
import { requireRole, resolveBranchFilter, SessionUser } from '@/lib/auth';

/**
 * Phase 9: sales analytics / BI dashboard.
 *
 * «فروش واقعی» در این ماژول یعنی هر سفارشی که وضعیتش CANCELLED یا
 * AWAITING_PAYMENT نیست — یعنی همان لحظه‌ای که در ماژول حسابداری هم به‌عنوان
 * درآمد ثبت می‌شود (سفارش‌های POS بلافاصله در PENDING، سفارش‌های آنلاین فقط
 * بعد از تأیید پرداخت). این تعریف را نمی‌شود کاربر عوض کند — فقط بازه‌ی
 * زمانی و شعبه فیلترپذیرند. اگر بازه‌ی زمانی داده نشود، پیش‌فرض ۳۰ روز
 * اخیر در نظر گرفته می‌شود.
 */

interface AnalyticsFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const EXCLUDED_STATUSES: OrderStatus[] = ['CANCELLED', 'AWAITING_PAYMENT'];
const DEFAULT_RANGE_DAYS = 30;
const ONLINE_BRANCH_LABEL = 'آنلاین (بدون شعبه)';

const CHANNEL_LABELS: Record<string, string> = {
  DINE_IN: 'حضوری',
  TAKEAWAY: 'بیرون‌بر',
  ONLINE_DELIVERY: 'آنلاین / ارسال',
};

function resolveDateRange(filters: AnalyticsFilters) {
  const to = filters.dateTo ? new Date(filters.dateTo) : new Date();
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (filters.dateFrom) {
    from = new Date(filters.dateFrom);
  } else {
    from = new Date(to);
    from.setDate(from.getDate() - (DEFAULT_RANGE_DAYS - 1));
  }
  from.setHours(0, 0, 0, 0);

  return { from, to };
}

function buildOrderWhere(user: SessionUser, filters: AnalyticsFilters): Prisma.OrderWhereInput {
  const { from, to } = resolveDateRange(filters);
  const effectiveBranchId = resolveBranchFilter(user, filters.branchId);

  const where: Prisma.OrderWhereInput = {
    status: { notIn: EXCLUDED_STATUSES },
    createdAt: { gte: from, lte: to },
  };

  // سفارش‌های آنلاین (branchId=null) در هر فیلتر شعبه‌ای هم دیده می‌شوند —
  // دقیقاً همان قاعده‌ای که در accounting.ts و order.ts استفاده شده.
  if (effectiveBranchId) {
    where.OR = [{ branchId: effectiveBranchId }, { branchId: null }];
  }

  return where;
}

async function fetchOrdersForAnalytics(user: SessionUser, filters: AnalyticsFilters) {
  const where = buildOrderWhere(user, filters);
  return prisma.order.findMany({
    where,
    select: {
      totalAmount: true,
      createdAt: true,
      branchId: true,
      channel: true,
      branch: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          priceAtTime: true,
          menuItemId: true,
          menuItem: { select: { title: true } },
        },
      },
    },
  });
}

type AnalyticsOrder = Awaited<ReturnType<typeof fetchOrdersForAnalytics>>[number];

interface DayBucket { date: string; revenue: number; orders: number }
interface BranchBucket { branchId: string | null; branchName: string; revenue: number; orders: number }
interface ItemBucket { menuItemId: string; title: string; quantitySold: number; revenue: number }
interface HourBucket { hour: number; count: number; revenue: number }
interface ChannelBucket { channel: string; label: string; count: number; revenue: number }

function computeSalesAnalytics(orders: AnalyticsOrder[]) {
  let totalRevenue = 0;
  const dayMap = new Map<string, DayBucket>();
  const branchMap = new Map<string, BranchBucket>();
  const itemMap = new Map<string, ItemBucket>();
  const hourMap = new Map<number, HourBucket>();
  const channelMap = new Map<string, ChannelBucket>();

  for (const order of orders) {
    totalRevenue += order.totalAmount;

    const dayKey = order.createdAt.toISOString().slice(0, 10);
    const day = dayMap.get(dayKey) ?? { date: dayKey, revenue: 0, orders: 0 };
    day.revenue += order.totalAmount;
    day.orders += 1;
    dayMap.set(dayKey, day);

    const branchKey = order.branchId ?? '__ONLINE__';
    const branch = branchMap.get(branchKey) ?? {
      branchId: order.branchId,
      branchName: order.branch?.name ?? ONLINE_BRANCH_LABEL,
      revenue: 0,
      orders: 0,
    };
    branch.revenue += order.totalAmount;
    branch.orders += 1;
    branchMap.set(branchKey, branch);

    const hourKey = order.createdAt.getHours();
    const hour = hourMap.get(hourKey) ?? { hour: hourKey, count: 0, revenue: 0 };
    hour.count += 1;
    hour.revenue += order.totalAmount;
    hourMap.set(hourKey, hour);

    const channelEntry = channelMap.get(order.channel) ?? {
      channel: order.channel,
      label: CHANNEL_LABELS[order.channel] ?? order.channel,
      count: 0,
      revenue: 0,
    };
    channelEntry.count += 1;
    channelEntry.revenue += order.totalAmount;
    channelMap.set(order.channel, channelEntry);

    for (const line of order.items) {
      const item = itemMap.get(line.menuItemId) ?? {
        menuItemId: line.menuItemId,
        title: line.menuItem.title,
        quantitySold: 0,
        revenue: 0,
      };
      item.quantitySold += line.quantity;
      item.revenue += line.priceAtTime * line.quantity;
      itemMap.set(line.menuItemId, item);
    }
  }

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const revenueByDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const revenueByBranch = [...branchMap.values()].sort((a, b) => b.revenue - a.revenue);

  // آیتم‌هایی که در این بازه اصلاً فروش نداشته‌اند اینجا ظاهر نمی‌شوند —
  // یعنی «کم‌فروش‌ترین» به معنای «کمترین فروش در میان آیتم‌های فروخته‌شده»
  // است، نه «هرگز فروخته نشده». مقایسه با کل منو خارج از دامنه‌ی این فاز است.
  const allItems = [...itemMap.values()];
  const topMenuItems = [...allItems].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const bottomMenuItems = [...allItems].sort((a, b) => a.quantitySold - b.quantitySold).slice(0, 10);

  const ordersByHour: HourBucket[] = Array.from({ length: 24 }, (_, hour) => {
    const existing = hourMap.get(hour);
    return existing ?? { hour, count: 0, revenue: 0 };
  });

  const ordersByChannel = [...channelMap.values()].sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    revenueByDay,
    revenueByBranch,
    topMenuItems,
    bottomMenuItems,
    ordersByHour,
    ordersByChannel,
  };
}

export async function getSalesAnalytics(filters: AnalyticsFilters = {}) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const { from, to } = resolveDateRange(filters);
    const orders = await fetchOrdersForAnalytics(auth.user, filters);
    const analytics = computeSalesAnalytics(orders);

    return {
      success: true,
      periodFrom: from,
      periodTo: to,
      ...analytics,
    };
  } catch (error) {
    console.error('Error computing sales analytics:', error);
    return { success: false, error: 'خطا در محاسبه‌ی گزارش‌های تحلیلی' };
  }
}
