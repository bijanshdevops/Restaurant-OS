"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { getSalesAnalytics } from '@/app/actions/analytics';
import { getBranches } from '@/app/actions/branch';

interface DayBucket { date: string; revenue: number; orders: number }
interface BranchBucket { branchId: string | null; branchName: string; revenue: number; orders: number }
interface ItemBucket { menuItemId: string; title: string; quantitySold: number; revenue: number }
interface HourBucket { hour: number; count: number; revenue: number }
interface ChannelBucket { channel: string; label: string; count: number; revenue: number }

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByDay: DayBucket[];
  revenueByBranch: BranchBucket[];
  topMenuItems: ItemBucket[];
  bottomMenuItems: ItemBucket[];
  ordersByHour: HourBucket[];
  ordersByChannel: ChannelBucket[];
}

interface Branch { id: string; name: string }

const toPersianDigits = (num: number | string) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};
const formatCurrency = (amount: number) => toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount))));

const formatDayLabel = (isoDate: string) =>
  new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoDate + 'T00:00:00'));

const formatHourLabel = (hour: number) => `${toPersianDigits(hour.toString().padStart(2, '0'))}:۰۰`;

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes('ADMIN');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', branchId: '' });

  const activeFilters = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    branchId: filters.branchId || undefined,
  };

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const res = await getSalesAnalytics(activeFilters);
    if (res.success) {
      setAnalytics(res as unknown as Analytics);
    } else {
      setError(res.error || 'خطا در دریافت گزارش‌های تحلیلی');
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.branchId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (isAdmin) {
      getBranches().then((res: any) => {
        if (res.success && res.branches) setBranches(res.branches);
      });
    }
  }, [isAdmin]);

  const maxDayRevenue = Math.max(1, ...(analytics?.revenueByDay.map((d) => d.revenue) ?? [0]));
  const maxHourCount = Math.max(1, ...(analytics?.ordersByHour.map((h) => h.count) ?? [0]));
  const totalChannelCount = (analytics?.ordersByChannel ?? []).reduce((sum, c) => sum + c.count, 0);

  if (isLoading && !analytics) {
    return <div className="text-center py-20 text-gray-400">در حال بارگذاری گزارش‌های تحلیلی...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-black text-gray-900">گزارش‌گیری و تحلیل فروش</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">از تاریخ</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">تا تاریخ</label>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">شعبه</label>
            <select value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">همه شعبه‌ها</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => setFilters({ dateFrom: '', dateTo: '', branchId: '' })}
          className="text-sm font-bold text-gray-500 hover:text-gray-800 px-3 py-2"
        >
          پاک‌کردن فیلترها
        </button>
        <p className="text-xs text-gray-400 mr-auto">
          بدون انتخاب بازه، ۳۰ روز اخیر نمایش داده می‌شود. سفارش‌های لغوشده و در انتظار پرداخت در این گزارش لحاظ نمی‌شوند.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">درآمد کل</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-green-600">{formatCurrency(analytics?.totalRevenue ?? 0)}</span>
            <span className="text-gray-400 font-medium text-sm">تومان</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">تعداد سفارش‌ها</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-blue-700">{toPersianDigits(analytics?.totalOrders ?? 0)}</span>
            <span className="text-gray-400 font-medium text-sm">سفارش</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-md border border-blue-700 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/30 rounded-full blur-2xl"></div>
          <span className="text-blue-200 text-sm font-bold mb-2 relative z-10">میانگین ارزش سفارش</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-white">{formatCurrency(analytics?.averageOrderValue ?? 0)}</span>
            <span className="text-blue-200 font-medium text-sm">تومان</span>
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">روند فروش روزانه</h2>
        <div className="space-y-2">
          {(analytics?.revenueByDay ?? []).map((d) => (
            <div key={d.date} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-gray-500 font-mono text-xs shrink-0">{formatDayLabel(d.date)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${(d.revenue / maxDayRevenue) * 100}%` }}></div>
              </div>
              <span className="w-32 text-left font-bold text-gray-700 shrink-0">{formatCurrency(d.revenue)} تومان</span>
              <span className="w-16 text-left text-gray-400 shrink-0">{toPersianDigits(d.orders)} سفارش</span>
            </div>
          ))}
          {(!analytics || analytics.revenueByDay.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
          )}
        </div>
      </div>

      {/* Top / bottom menu items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">پرفروش‌ترین آیتم‌های منو</h2>
          <div className="space-y-2">
            {(analytics?.topMenuItems ?? []).map((item, idx) => (
              <div key={item.menuItemId} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-700 font-medium">{toPersianDigits(idx + 1)}. {item.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{toPersianDigits(item.quantitySold)} عدد</span>
                  <span className="font-bold text-green-600">{formatCurrency(item.revenue)} تومان</span>
                </span>
              </div>
            ))}
            {(!analytics || analytics.topMenuItems.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">کم‌فروش‌ترین آیتم‌های منو</h2>
          <div className="space-y-2">
            {(analytics?.bottomMenuItems ?? []).map((item, idx) => (
              <div key={item.menuItemId} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-700 font-medium">{toPersianDigits(idx + 1)}. {item.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{toPersianDigits(item.quantitySold)} عدد</span>
                  <span className="font-bold text-gray-500">{formatCurrency(item.revenue)} تومان</span>
                </span>
              </div>
            ))}
            {(!analytics || analytics.bottomMenuItems.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-6">
            این فهرست فقط شامل آیتم‌هایی است که حداقل یک بار در این بازه فروخته شده‌اند؛ آیتم‌هایی که اصلاً فروش نداشته‌اند در این گزارش دیده نمی‌شوند.
          </p>
        </div>
      </div>

      {/* Branch comparison */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">مقایسه عملکرد شعبه‌ها</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100">
                <th className="pb-2 font-bold">شعبه</th>
                <th className="pb-2 font-bold">تعداد سفارش</th>
                <th className="pb-2 font-bold">درآمد</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.revenueByBranch ?? []).map((b) => (
                <tr key={b.branchId ?? 'online'} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-700">{b.branchName}</td>
                  <td className="py-2 text-gray-500">{toPersianDigits(b.orders)}</td>
                  <td className="py-2 font-bold text-green-600">{formatCurrency(b.revenue)} تومان</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!analytics || analytics.revenueByBranch.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
          )}
        </div>
      </div>

      {/* Peak hours + channel mix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ساعات پرمشتری</h2>
          <div className="space-y-1.5">
            {(analytics?.ordersByHour ?? []).filter((h) => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 8).map((h) => (
              <div key={h.hour} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-gray-500 font-mono text-xs shrink-0">{formatHourLabel(h.hour)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${(h.count / maxHourCount) * 100}%` }}></div>
                </div>
                <span className="w-16 text-left text-gray-400 shrink-0">{toPersianDigits(h.count)} سفارش</span>
              </div>
            ))}
            {(!analytics || analytics.ordersByHour.every((h) => h.count === 0)) && (
              <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ترکیب کانال فروش</h2>
          <div className="space-y-3">
            {(analytics?.ordersByChannel ?? []).map((c) => (
              <div key={c.channel} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium">{c.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">
                    {toPersianDigits(totalChannelCount > 0 ? Math.round((c.count / totalChannelCount) * 100) : 0)}٪
                  </span>
                  <span className="font-bold text-blue-700">{formatCurrency(c.revenue)} تومان</span>
                </span>
              </div>
            ))}
            {(!analytics || analytics.ordersByChannel.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
