"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCustomerProfile } from '@/app/actions/customerAuth';
import { useCustomerAuth } from '@/shared/context/CustomerAuthContext';
import { formatCurrency, formatDate, toPersianDigits } from '@/shared/utils/formatters';

const TIER_LABELS: Record<string, string> = {
  NORMAL: 'عادی',
  BRONZE: 'برنزی',
  SILVER: 'نقره‌ای',
  GOLD: 'طلایی',
  VIP: 'ویژه',
};

export default function CustomerProfilePage() {
  const router = useRouter();
  const { logout } = useCustomerAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCustomerProfile().then((res: any) => {
      if (res.success) setCustomer(res.customer);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-sans">درحال بارگذاری...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 text-center">
          <h1 className="text-xl font-black text-gray-900">{customer?.fullName}</h1>
          <p className="text-sm text-gray-500 mt-1" dir="ltr">{customer?.phone}</p>
          <div className="flex justify-center gap-4 mt-5">
            <div className="bg-blue-50 rounded-xl px-5 py-3">
              <p className="text-2xl font-black text-blue-600">{toPersianDigits(customer?.pointsBalance || 0)}</p>
              <p className="text-xs text-gray-500 font-bold mt-1">امتیاز</p>
            </div>
            <div className="bg-amber-50 rounded-xl px-5 py-3">
              <p className="text-lg font-black text-amber-600">{TIER_LABELS[customer?.loyaltyTier] || customer?.loyaltyTier}</p>
              <p className="text-xs text-gray-500 font-bold mt-1">سطح باشگاه</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">سفارش‌های اخیر</h2>
          <div className="space-y-3">
            {(customer?.orders || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">هنوز سفارشی ثبت نشده است.</p>
            )}
            {(customer?.orders || []).map((order: any) => (
              <button
                key={order.id}
                onClick={() => router.push(`/order/orders/${order.id}`)}
                className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-right transition-colors"
              >
                <div>
                  <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <span className="font-bold text-blue-600 text-sm">{formatCurrency(order.totalAmount)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/order')}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            سفارش جدید
          </button>
          <button
            onClick={logout}
            className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors"
          >
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
