"use client";

import { useOrders } from '../hooks/useOrders';
import { Activity } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

export function RecentOrders() {
  const { data, isLoading, error } = useOrders();

  if (isLoading) {
    return <div className="h-64 bg-gray-50 animate-pulse m-6 rounded-lg" />;
  }

  if (error || !data) {
    return <div className="m-6 p-4 bg-red-50 text-red-600 rounded-xl">خطا: {error}</div>;
  }

  if (data.length === 0) {
    return <div className="m-6 p-4 text-gray-400 text-sm">هنوز سفارشی ثبت نشده است.</div>;
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case 'PENDING': return 'در انتظار';
      case 'PREPARING': return 'در حال آماده‌سازی';
      case 'READY': return 'آماده تحویل';
      case 'COMPLETED': return 'تکمیل شده';
      default: return status;
    }
  };

  return (
    <div className="divide-y divide-gray-200">
      {data.map((order) => {
        const date = formatDate(order.createdAt);

        return (
          <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-1">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <span>{order.orderNumber}</span>
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {translateStatus(order.status)}
                  </span>
                </p>
                <div className="mt-1 text-sm text-gray-500 flex flex-col gap-1">
                  <span>مشتری: {order.customerName || 'بدون مشتری'}</span>
                </div>
              </div>
            </div>

            <div className="text-end flex flex-col items-end gap-2">
              <span className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
              <span className="text-xs text-gray-500">{date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
