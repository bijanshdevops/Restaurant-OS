"use client";

import { useAnalytics } from '../hooks/useAnalytics';
import { DollarSign, ShoppingCart, Crown, Users } from 'lucide-react';
import { formatCurrency, toPersianDigits } from '../../../shared/utils/formatters';

export function AnalyticsSummary() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />;
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl">
        خطا در دریافت آمار: {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
          <DollarSign className="w-6 h-6" />
        </div>
        <div className="ms-4">
          <p className="text-sm font-medium text-gray-500">مجموع درآمد</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
        </div>
      </div>

      {/* Total Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <div className="ms-4">
          <p className="text-sm font-medium text-gray-500">تعداد سفارشات</p>
          <p className="text-2xl font-bold text-gray-900">{toPersianDigits(data.totalOrders)}</p>
        </div>
      </div>

      {/* VIP Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
          <Crown className="w-6 h-6" />
        </div>
        <div className="ms-4">
          <p className="text-sm font-medium text-gray-500">درآمد ویژه (VIP)</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.revenueBySegment['VIP'] || 0)}
          </p>
        </div>
      </div>

      {/* Regular Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
          <Users className="w-6 h-6" />
        </div>
        <div className="ms-4">
          <p className="text-sm font-medium text-gray-500">درآمد عادی</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.revenueBySegment['REGULAR'] || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
