"use client";

import { useState, useEffect } from 'react';
import { formatCurrency, toPersianDigits } from '@/shared/utils/formatters';
import {
  getCouriers,
  createCourier,
  setCourierActive,
  getDeliveryBoard,
  assignCourier,
  advanceDeliveryStatus,
  markDeliveryFailed,
} from '@/app/actions/delivery';
import { simulateNextProviderStatus, simulateProviderDeliveryFailure } from '@/app/actions/deliveryProvider';

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'در انتظار تخصیص',
  ASSIGNED: 'تخصیص یافته',
  PICKED_UP: 'تحویل پیک شد',
  ON_THE_WAY: 'در راه',
};

// فاز ۱۷: برچسبِ متناظرِ هر deliveryStatus برای سفارش‌هایی که به شخص‌ثالث
// ارسال شده‌اند — متن کمی متفاوت است چون فاعلِ کار «شخص ثالث» است نه پیکِ داخلی.
const PROVIDER_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'پذیرفته‌شده توسط شخص ثالث',
  PICKED_UP: 'تحویل شخص ثالث شد',
  ON_THE_WAY: 'در راه (شخص ثالث)',
};

const PROVIDER_NEXT_ACTION_LABELS: Record<string, string> = {
  ASSIGNED: 'شبیه‌سازی: تحویل به پیک',
  PICKED_UP: 'شبیه‌سازی: خروج برای ارسال',
  ON_THE_WAY: 'شبیه‌سازی: تحویل به مشتری',
};

const NEXT_ACTION_LABELS: Record<string, string> = {
  ASSIGNED: 'ثبت تحویل به پیک',
  PICKED_UP: 'ثبت خروج برای ارسال',
  ON_THE_WAY: 'ثبت تحویل به مشتری',
};

export default function DeliveryPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [error, setError] = useState('');

  const fetchAll = async () => {
    const [couriersRes, boardRes] = await Promise.all([getCouriers(), getDeliveryBoard()]);
    if (couriersRes.success) setCouriers(couriersRes.couriers || []);
    if (boardRes.success) setOrders(boardRes.orders || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await createCourier({ name: newCourierName, phone: newCourierPhone });
    if (res.success) {
      setNewCourierName('');
      setNewCourierPhone('');
      fetchAll();
    } else {
      setError(res.error || 'خطا در ثبت پیک');
    }
  };

  const handleAssign = async (orderId: string, courierId: string) => {
    if (!courierId) return;
    await assignCourier(orderId, courierId);
    fetchAll();
  };

  const handleAdvance = async (orderId: string) => {
    await advanceDeliveryStatus(orderId);
    fetchAll();
  };

  const handleFail = async (orderId: string) => {
    await markDeliveryFailed(orderId);
    fetchAll();
  };

  const handleSimulateAdvance = async (orderId: string) => {
    await simulateNextProviderStatus(orderId);
    fetchAll();
  };

  const handleSimulateFail = async (orderId: string) => {
    await simulateProviderDeliveryFailure(orderId);
    fetchAll();
  };

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400">درحال بارگذاری...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">پیک و تحویل سفارش‌های آنلاین</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4">پیک‌ها</h2>
        {error && <p className="text-red-600 text-sm font-bold mb-3">{error}</p>}
        <div className="flex flex-wrap gap-3 mb-5">
          {couriers.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${
                c.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span>{c.name}</span>
              <span className="text-xs font-mono" dir="ltr">{c.phone}</span>
              <button
                onClick={() => setCourierActive(c.id, !c.isActive).then(fetchAll)}
                className="text-xs underline"
              >
                {c.isActive ? 'غیرفعال' : 'فعال'}
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddCourier} className="flex gap-3">
          <input
            value={newCourierName}
            onChange={(e) => setNewCourierName(e.target.value)}
            placeholder="نام پیک"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            value={newCourierPhone}
            onChange={(e) => setNewCourierPhone(e.target.value)}
            placeholder="شماره موبایل"
            dir="ltr"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left"
            required
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
            افزودن پیک
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4">سفارش‌های در حال ارسال</h2>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">در حال حاضر سفارش فعالی برای ارسال وجود ندارد.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.customer?.fullName} — {order.customer?.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.deliveryAddress}</p>
                    {order.deliveryProvider && (
                      <p className="text-xs text-purple-600 font-bold mt-1">
                        📦 شخص ثالث (شبیه‌سازی) — کد پیگیری: <span dir="ltr">{order.externalDeliveryId}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-blue-600">{formatCurrency(order.totalAmount)}</p>
                    <span className="text-xs font-bold text-gray-500">
                      {order.deliveryProvider
                        ? PROVIDER_STATUS_LABELS[order.deliveryStatus]
                        : STATUS_LABELS[order.deliveryStatus]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  {order.deliveryProvider ? (
                    <>
                      <button
                        onClick={() => handleSimulateAdvance(order.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        {PROVIDER_NEXT_ACTION_LABELS[order.deliveryStatus]}
                      </button>
                      <button
                        onClick={() => handleSimulateFail(order.id)}
                        className="text-red-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        شبیه‌سازی: ارسال ناموفق
                      </button>
                    </>
                  ) : order.deliveryStatus === 'PENDING_ASSIGNMENT' ? (
                    <select
                      onChange={(e) => handleAssign(order.id, e.target.value)}
                      defaultValue=""
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="" disabled>انتخاب پیک...</option>
                      {couriers.filter((c) => c.isActive).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500">پیک: {order.courier?.name}</span>
                      <button
                        onClick={() => handleAdvance(order.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        {NEXT_ACTION_LABELS[order.deliveryStatus]}
                      </button>
                      <button
                        onClick={() => handleFail(order.id)}
                        className="text-red-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        ارسال ناموفق
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
