"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/shared/context/CartContext';
import { getPublicOrderSettings } from '@/app/actions/settings';
import { getCustomerProfile } from '@/app/actions/customerAuth';
import { createOnlineOrder } from '@/app/actions/order';
import { initiatePayment } from '@/app/actions/payment';
import { formatCurrency, toPersianDigits } from '@/shared/utils/formatters';

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  failed: 'پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.',
  cancelled: 'پرداخت لغو شد.',
  error: 'خطایی در پردازش پرداخت رخ داد.',
};

interface OrderSettings {
  taxPercentage: number;
  packagingCost: number;
  defaultDeliveryFee: number;
  loyaltyPointValueToman: number;
}

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentIssue = searchParams.get('payment');

  const [settings, setSettings] = useState<OrderSettings | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [address, setAddress] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicOrderSettings().then((res) => {
      if (res.success && res.settings) setSettings(res.settings);
    });
    getCustomerProfile().then((res: any) => {
      if (res.success && res.customer) setPointsBalance(res.customer.pointsBalance);
    });
  }, []);

  useEffect(() => {
    if (lines.length === 0 && !isSubmitting) {
      router.replace('/order');
    }
  }, [lines.length, isSubmitting, router]);

  const taxAmount = settings ? Math.round((subtotal * settings.taxPercentage) / 100) : 0;
  const packagingCost = settings?.packagingCost ?? 0;
  const deliveryFee = settings?.defaultDeliveryFee ?? 0;
  const pointValue = settings?.loyaltyPointValueToman ?? 1000;
  const preDiscountTotal = subtotal + taxAmount + packagingCost + deliveryFee;

  const maxRedeemable = useMemo(() => {
    return Math.max(0, Math.min(pointsBalance, Math.floor(preDiscountTotal / Math.max(pointValue, 1))));
  }, [pointsBalance, preDiscountTotal, pointValue]);

  const discount = pointsToRedeem * pointValue;
  const total = Math.max(0, preDiscountTotal - discount);

  const handlePay = async () => {
    setError('');
    if (!address.trim()) {
      setError('لطفاً آدرس تحویل را وارد کنید');
      return;
    }
    setIsSubmitting(true);
    try {
      const orderRes = await createOnlineOrder(
        lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        address,
        pointsToRedeem
      );
      if (!orderRes.success || !orderRes.order) {
        setError(orderRes.error || 'خطا در ثبت سفارش');
        setIsSubmitting(false);
        return;
      }

      const payRes = await initiatePayment(orderRes.order.id);
      if (!payRes.success || !payRes.redirectUrl) {
        setError(payRes.error || 'خطا در اتصال به درگاه پرداخت');
        setIsSubmitting(false);
        return;
      }

      clear();
      window.location.href = payRes.redirectUrl;
    } catch (e) {
      setError('خطای غیرمنتظره در ثبت سفارش');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg text-gray-900">تسویه‌حساب</span>
          <button onClick={() => router.push('/order')} className="text-sm text-blue-600 font-bold">
            بازگشت به منو
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {paymentIssue && PAYMENT_ERROR_MESSAGES[paymentIssue] && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
            {PAYMENT_ERROR_MESSAGES[paymentIssue]}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">سبد سفارش</h2>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.menuItemId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {l.title} × {toPersianDigits(l.quantity)}
                </span>
                <span className="font-bold text-gray-900">{formatCurrency(l.price * l.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">آدرس تحویل</h2>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            rows={3}
            placeholder="آدرس کامل، پلاک، واحد..."
          />
        </div>

        {maxRedeemable > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-900">استفاده از امتیاز باشگاه مشتریان</h2>
              <span className="text-xs text-gray-500 font-medium">
                موجودی: {toPersianDigits(pointsBalance)} امتیاز
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxRedeemable}
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">{toPersianDigits(pointsToRedeem)} امتیاز</span>
              <span className="font-bold text-green-600">− {formatCurrency(discount)}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>جمع اقلام</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>مالیات</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>بسته‌بندی</span>
            <span>{formatCurrency(packagingCost)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>هزینه ارسال</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-bold">
              <span>تخفیف امتیاز</span>
              <span>− {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-gray-100">
            <span>مبلغ قابل پرداخت</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={isSubmitting || lines.length === 0}
          className={`w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-md transition-all ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'در حال انتقال به درگاه پرداخت...' : 'پرداخت آنلاین (زرین‌پال)'}
        </button>
      </div>
    </div>
  );
}
