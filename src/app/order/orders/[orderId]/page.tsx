"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMyOnlineOrder } from '@/app/actions/order';
import { submitOrderFeedback } from '@/app/actions/feedback';
import { formatCurrency, formatDate, toPersianDigits } from '@/shared/utils/formatters';

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: 'در انتظار پرداخت',
  PENDING: 'ثبت شد — در انتظار آماده‌سازی',
  PREPARING: 'در حال آماده‌سازی',
  READY: 'آماده تحویل',
  COMPLETED: 'تکمیل شد',
  CANCELLED: 'لغو شد',
};

const DELIVERY_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'در انتظار تخصیص پیک',
  ASSIGNED: 'پیک تخصیص یافت',
  PICKED_UP: 'تحویل پیک شد',
  ON_THE_WAY: 'در راه است',
  DELIVERED: 'تحویل داده شد',
  FAILED: 'ارسال ناموفق',
};

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const res = await getMyOnlineOrder(orderId);
      if (res.success) setOrder(res.order);
      else setError(res.error || 'سفارش یافت نشد');
      setIsLoading(false);
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleSubmitFeedback = async () => {
    setIsSubmittingFeedback(true);
    const res = await submitOrderFeedback(orderId, feedbackRating, feedbackComment);
    setIsSubmittingFeedback(false);
    if (res.success && res.feedback) {
      setOrder({ ...order, feedback: res.feedback });
    } else {
      alert(res.error || 'خطا در ثبت بازخورد');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-sans">درحال بارگذاری...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans gap-4" dir="rtl">
        <p className="text-red-600 font-bold">{error}</p>
        <button onClick={() => router.push('/order')} className="text-blue-600 font-bold">بازگشت به منو</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-black text-gray-900">سفارش {order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-blue-700 font-black text-lg">{STATUS_LABELS[order.status] || order.status}</p>
          {order.deliveryStatus && (
            <p className="text-blue-600 text-sm font-bold mt-1">{DELIVERY_LABELS[order.deliveryStatus] || order.deliveryStatus}</p>
          )}
          {order.courier && (
            <p className="text-xs text-gray-500 mt-2">پیک: {order.courier.name} — {order.courier.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.menuItem?.title} × {toPersianDigits(item.quantity)}</span>
              <span className="font-bold text-gray-900">{formatCurrency(item.priceAtTime * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-lg font-black text-gray-900 pt-3 border-t border-gray-100">
          <span>مبلغ پرداخت‌شده</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>

        {order.status === 'COMPLETED' && (
          <div className="border-t border-gray-100 pt-4">
            {order.feedback ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-amber-600 font-bold text-lg">{'★'.repeat(order.feedback.rating)}{'☆'.repeat(5 - order.feedback.rating)}</p>
                {order.feedback.comment && <p className="text-sm text-gray-600 mt-2">{order.feedback.comment}</p>}
                <p className="text-xs text-gray-400 mt-1">بابت بازخوردتان ممنونیم!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-bold text-gray-900 text-sm">نظر شما درباره‌ی این سفارش چیست؟</p>
                <div className="flex justify-center gap-1 text-2xl" dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setFeedbackRating(n)} className={n <= feedbackRating ? 'text-amber-500' : 'text-gray-300'}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={2}
                  placeholder="نظر شما (اختیاری)..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                >
                  {isSubmittingFeedback ? 'در حال ثبت...' : 'ثبت بازخورد'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => router.push('/order')}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
        >
          سفارش جدید
        </button>
      </div>
    </div>
  );
}
