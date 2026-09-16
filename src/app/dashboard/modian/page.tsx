"use client";

import { useState, useEffect, useCallback } from 'react';
import { getSettings } from '@/app/actions/settings';
import { updateModianSettings } from '@/app/actions/settings';
import { getTaxInvoices, submitInvoiceToTsp } from '@/app/actions/modian';
import { TaxInvoiceStatus } from '@prisma/client';

const toPersianDigits = (num: number | string) => {
  const d = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, x => d[parseInt(x)]);
};

const statusLabel: Record<TaxInvoiceStatus, string> = {
  PENDING: 'در حال ارسال',
  SENT: 'ارسال شده',
  CONFIRMED: 'تایید شده',
  FAILED: 'ناموفق',
};

const statusClass: Record<TaxInvoiceStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  SENT: 'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

export default function ModianPage() {
  const [settingsForm, setSettingsForm] = useState({
    modianEnabled: false,
    economicCode: '',
    nationalId: '',
    tspProviderName: '',
    tspApiBaseUrl: '',
    tspApiKey: '',
    hasApiKey: false,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [settingsRes, ordersRes] = await Promise.all([getSettings(), getTaxInvoices()]);
    if (settingsRes.success && settingsRes.settings) {
      const s: any = settingsRes.settings;
      setSettingsForm({
        modianEnabled: s.modianEnabled,
        economicCode: s.economicCode,
        nationalId: s.nationalId,
        tspProviderName: s.tspProviderName,
        tspApiBaseUrl: s.tspApiBaseUrl,
        tspApiKey: '',
        hasApiKey: !!s.hasApiKey,
      });
    }
    if (ordersRes.success && ordersRes.orders) {
      setOrders(ordersRes.orders);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage('');
    const res = await updateModianSettings({
      modianEnabled: settingsForm.modianEnabled,
      economicCode: settingsForm.economicCode,
      nationalId: settingsForm.nationalId,
      tspProviderName: settingsForm.tspProviderName,
      tspApiBaseUrl: settingsForm.tspApiBaseUrl,
      tspApiKey: settingsForm.tspApiKey || undefined,
    });
    setIsSaving(false);
    if (res.success) {
      setMessage('تنظیمات با موفقیت ذخیره شد.');
      loadData();
    } else {
      setMessage(res.error || 'خطا در ذخیره تنظیمات');
    }
  };

  const handleSend = async (orderId: string) => {
    setSendingId(orderId);
    const res = await submitInvoiceToTsp(orderId);
    setSendingId(null);
    if (!res.success) {
      alert(res.error || 'ارسال صورتحساب ناموفق بود');
    }
    loadData();
  };

  const formatCurrency = (amount: number) => toPersianDigits(new Intl.NumberFormat('en-US').format(amount));

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">سامانه مودیان</h1>
        <p className="text-gray-500 mt-1">اتصال به سامانه مودیان از طریق معتمد مالیاتی (TSP) و ارسال صورتحساب الکترونیکی</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">تنظیمات اتصال</h2>
        {message && <div className="bg-blue-50 text-blue-800 text-sm font-bold p-3 rounded-lg border border-blue-200">{message}</div>}

        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={settingsForm.modianEnabled}
            onChange={e => setSettingsForm({ ...settingsForm, modianEnabled: e.target.checked })}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-gray-800">فعال‌سازی ارسال به سامانه مودیان</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">کد اقتصادی</label>
            <input type="text" value={settingsForm.economicCode} onChange={e => setSettingsForm({ ...settingsForm, economicCode: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 font-mono" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">شناسه ملی</label>
            <input type="text" value={settingsForm.nationalId} onChange={e => setSettingsForm({ ...settingsForm, nationalId: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 font-mono" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">نام معتمد مالیاتی (TSP)</label>
            <input type="text" value={settingsForm.tspProviderName} onChange={e => setSettingsForm({ ...settingsForm, tspProviderName: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="مثال: ماهر، زیبال، مالیتور" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">آدرس پایه API</label>
            <input type="text" value={settingsForm.tspApiBaseUrl} onChange={e => setSettingsForm({ ...settingsForm, tspApiBaseUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 font-mono" dir="ltr" placeholder="https://api.example.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              کلید API {settingsForm.hasApiKey && <span className="text-emerald-600 font-normal">(کلیدی قبلاً ذخیره شده — برای تغییر، مقدار جدید وارد کنید)</span>}
            </label>
            <input type="password" value={settingsForm.tspApiKey} onChange={e => setSettingsForm({ ...settingsForm, tspApiKey: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 font-mono" dir="ltr" placeholder={settingsForm.hasApiKey ? '••••••••' : ''} />
          </div>
        </div>

        <button onClick={handleSaveSettings} disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
          {isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">صورتحساب‌های سفارش‌های تکمیل‌شده</h2>
        </div>
        {isLoading && orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-bold animate-pulse">درحال بارگذاری...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">شماره سفارش</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">مبلغ کل</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">وضعیت مودیان</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">شناسه یکتای مالیاتی</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 font-mono">{o.orderNumber}</td>
                    <td className="px-6 py-4 text-sm font-bold">{formatCurrency(o.totalAmount)} تومان</td>
                    <td className="px-6 py-4 text-center">
                      {o.taxInvoice ? (
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${statusClass[o.taxInvoice.status as TaxInvoiceStatus]}`}>
                          {statusLabel[o.taxInvoice.status as TaxInvoiceStatus]}
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border bg-gray-100 text-gray-600 border-gray-200">ارسال نشده</span>
                      )}
                      {o.taxInvoice?.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={o.taxInvoice.errorMessage}>{o.taxInvoice.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{o.taxInvoice?.taxUid || o.taxInvoice?.referenceNumber || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSend(o.id)}
                        disabled={sendingId === o.id || o.taxInvoice?.status === 'CONFIRMED'}
                        className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 px-3 py-2 rounded-lg border border-indigo-200 text-xs font-bold"
                      >
                        {sendingId === o.id ? 'در حال ارسال...' : o.taxInvoice?.status === 'FAILED' ? 'تلاش مجدد' : o.taxInvoice?.status === 'CONFIRMED' ? 'ارسال شده' : 'ارسال به مودیان'}
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هیچ سفارش تکمیل‌شده‌ای یافت نشد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
