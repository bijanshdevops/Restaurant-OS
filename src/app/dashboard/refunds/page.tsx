"use client";

import { useState, useEffect, useCallback } from 'react';
import { findOrderForRefund, createRefund, getRefunds } from '@/app/actions/refund';

interface OrderItemView {
  id: string;
  quantity: number;
  refundedQuantity: number;
  priceAtTime: number;
  menuItem: { id: string; title: string };
}

interface OrderView {
  id: string;
  orderNumber: string;
  totalAmount: number;
  taxAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  customerId: string | null;
  customer: { id: string; fullName: string; phone: string } | null;
  branch: { id: string; name: string } | null;
  items: OrderItemView[];
  refunds: { id: string; totalAmount: number; isFullRefund: boolean; reason: string; createdAt: string | Date }[];
}

interface RefundHistoryRow {
  id: string;
  reason: string;
  isFullRefund: boolean;
  totalAmount: number;
  taxAmount: number;
  createdAt: string | Date;
  order: { orderNumber: string; branch: { name: string } | null };
  createdBy: { name: string };
  items: { quantity: number; orderItem: { menuItem: { title: string } } }[];
}

const toPersianDigits = (num: number | string) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

const formatCurrency = (amount: number) =>
  toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount))));

const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(date)
  );

export default function RefundsPage() {
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [order, setOrder] = useState<OrderView | null>(null);

  const [mode, setMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialQuantities, setPartialQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [history, setHistory] = useState<RefundHistoryRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    const res = await getRefunds(50);
    if (res.success && res.refunds) setHistory(res.refunds as any);
    setIsHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const resetOrderState = () => {
    setOrder(null);
    setPartialQuantities({});
    setMode('FULL');
    setReason('');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleSearch = async () => {
    setSearchError('');
    setSubmitSuccess('');
    if (!orderNumberInput.trim()) {
      setSearchError('شماره‌ی سفارش را وارد کنید');
      return;
    }
    setIsSearching(true);
    const res = await findOrderForRefund(orderNumberInput.trim());
    setIsSearching(false);
    if (!res.success || !res.order) {
      setOrder(null);
      setSearchError(res.error || 'خطا در جست‌وجوی سفارش');
      return;
    }
    setOrder(res.order as any);
    setPartialQuantities({});
    setMode('FULL');
    setReason('');
  };

  const remainingQty = (item: OrderItemView) => item.quantity - item.refundedQuantity;

  const handleSubmit = async () => {
    if (!order) return;
    setSubmitError('');
    setSubmitSuccess('');
    if (!reason.trim()) {
      setSubmitError('دلیل مرجوعی را وارد کنید');
      return;
    }

    let items: { orderItemId: string; quantity: number }[] | undefined;
    if (mode === 'PARTIAL') {
      items = Object.entries(partialQuantities)
        .map(([orderItemId, val]) => ({ orderItemId, quantity: parseInt(val, 10) }))
        .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0);
      if (items.length === 0) {
        setSubmitError('حداقل تعداد یک قلم را برای مرجوعی جزئی مشخص کنید');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await createRefund({
      orderId: order.id,
      isFullRefund: mode === 'FULL',
      items,
      reason: reason.trim(),
    });
    setIsSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error || 'خطا در ثبت مرجوعی');
      return;
    }
    setSubmitSuccess('مرجوعی با موفقیت ثبت شد.');
    setOrderNumberInput('');
    resetOrderState();
    loadHistory();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مرجوعی و استرداد سفارش</h1>
          <p className="text-gray-500 mt-1">جست‌وجوی سفارش تکمیل‌شده و ثبت مرجوعی جزئی یا کامل</p>
        </div>
      </div>

      {/* Search box */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-xs font-bold text-gray-500 mb-1">شماره‌ی سفارش</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="مثال: ORD-8A3B"
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm flex-1 max-w-xs"
            dir="ltr"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm text-sm"
          >
            {isSearching ? 'درحال جست‌وجو...' : 'جست‌وجو'}
          </button>
        </div>
        {searchError && (
          <p className="text-sm text-red-600 font-bold mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{searchError}</p>
        )}
        {submitSuccess && (
          <p className="text-sm text-green-700 font-bold mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{submitSuccess}</p>
        )}
      </div>

      {/* Order details + refund form */}
      {order && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-wrap justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">سفارش {order.orderNumber}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {order.customer ? `مشتری: ${order.customer.fullName} (${toPersianDigits(order.customer.phone)})` : 'بدون مشتری ثبت‌شده'}
                {order.branch ? ` — شعبه: ${order.branch.name}` : ' — سفارش آنلاین بدون شعبه'}
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-500">مبلغ کل سفارش</p>
              <p className="text-xl font-black text-gray-800">{formatCurrency(order.totalAmount)} <span className="text-xs text-gray-400 font-medium">تومان</span></p>
            </div>
          </div>

          {order.refunds.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              این سفارش پیش‌تر {toPersianDigits(order.refunds.length)} بار مرجوع شده — مجموع {formatCurrency(order.refunds.reduce((s, r) => s + r.totalAmount, 0))} تومان.
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setMode('FULL')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                mode === 'FULL' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              مرجوعی کامل
            </button>
            <button
              onClick={() => setMode('PARTIAL')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                mode === 'PARTIAL' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              مرجوعی جزئی
            </button>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-xs font-bold text-gray-500">قلم</th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-500 text-center">تعداد سفارش</th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-500 text-center">قبلاً مرجوع‌شده</th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-500 text-center">مانده</th>
                  {mode === 'PARTIAL' && <th className="px-3 py-2 text-xs font-bold text-gray-500 text-center">تعداد مرجوعی</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item) => {
                  const remaining = remainingQty(item);
                  return (
                    <tr key={item.id} className={remaining === 0 ? 'opacity-40' : ''}>
                      <td className="px-3 py-3 text-sm font-bold text-gray-800">{item.menuItem.title}</td>
                      <td className="px-3 py-3 text-sm text-center text-gray-600">{toPersianDigits(item.quantity)}</td>
                      <td className="px-3 py-3 text-sm text-center text-gray-600">{toPersianDigits(item.refundedQuantity)}</td>
                      <td className="px-3 py-3 text-sm text-center font-bold text-gray-800">{toPersianDigits(remaining)}</td>
                      {mode === 'PARTIAL' && (
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            disabled={remaining === 0}
                            value={partialQuantities[item.id] ?? ''}
                            onChange={(e) =>
                              setPartialQuantities({ ...partialQuantities, [item.id]: e.target.value })
                            }
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center disabled:bg-gray-100"
                            dir="ltr"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">دلیل مرجوعی <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm"
              placeholder="مثال: نارضایتی مشتری از کیفیت غذا"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={resetOrderState}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl"
            >
              انصراف
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl"
            >
              {isSubmitting ? 'درحال ثبت...' : mode === 'FULL' ? 'ثبت مرجوعی کامل' : 'ثبت مرجوعی جزئی'}
            </button>
          </div>
        </div>
      )}

      {/* Refund history */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">تاریخچه‌ی مرجوعی‌ها</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-right">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">سفارش</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">اقلام</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">نوع</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">دلیل</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-left">مبلغ</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-center">تاریخ</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">ثبت‌کننده</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {history.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4 text-sm font-bold text-gray-800">
                    {r.order.orderNumber}
                    {r.order.branch && <span className="text-xs text-gray-400 font-normal"> ({r.order.branch.name})</span>}
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600">
                    {r.items.map((i) => `${i.orderItem.menuItem.title} ×${toPersianDigits(i.quantity)}`).join('، ')}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <span className={`px-2 py-1 rounded-full font-bold ${r.isFullRefund ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {r.isFullRefund ? 'کامل' : 'جزئی'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="px-4 py-4 text-left text-sm font-bold text-red-500 whitespace-nowrap">{formatCurrency(r.totalAmount)}</td>
                  <td className="px-4 py-4 text-center text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-4 text-xs text-gray-600">{r.createdBy.name}</td>
                </tr>
              ))}
              {history.length === 0 && !isHistoryLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هنوز مرجوعی‌ای ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
