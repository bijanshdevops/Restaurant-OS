"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getSuppliers,
  createSupplier,
  setSupplierActive,
  recordSupplierPayment,
  getSupplierLedger,
} from '@/app/actions/supplier';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;
  isActive: boolean;
  balanceOwed: number;
}

const toFa = (num: number) => {
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return Math.round(num).toLocaleString('en-US').replace(/\d/g, (x) => digits[parseInt(x)]);
};

const formatDate = (v: string | Date) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date(v));

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', address: '' });

  const [payTarget, setPayTarget] = useState<Supplier | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'نقدی', note: '' });

  const [ledgerFor, setLedgerFor] = useState<string | null>(null);
  const [ledger, setLedger] = useState<any | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    const res = await getSuppliers();
    if (res.success && res.suppliers) setSuppliers(res.suppliers as unknown as Supplier[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      alert('نام تأمین‌کننده را وارد کنید.');
      return;
    }
    const res = await createSupplier(form);
    if (res.success) {
      setIsAddOpen(false);
      setForm({ name: '', contactName: '', phone: '', address: '' });
      fetchSuppliers();
    } else {
      alert(res.error || 'خطا در ثبت تأمین‌کننده');
    }
  };

  const handleToggleActive = async (s: Supplier) => {
    const res = await setSupplierActive(s.id, !s.isActive);
    if (res.success) fetchSuppliers();
  };

  const openPay = (s: Supplier) => {
    setPayTarget(s);
    setPayForm({ amount: '', method: 'نقدی', note: '' });
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) {
      alert('مبلغ پرداخت را درست وارد کنید.');
      return;
    }
    const res = await recordSupplierPayment({
      supplierId: payTarget.id,
      amount,
      method: payForm.method,
      note: payForm.note,
    });
    if (res.success) {
      setPayTarget(null);
      fetchSuppliers();
      if (ledgerFor === payTarget.id) openLedger(payTarget.id);
    } else {
      alert(res.error || 'خطا در ثبت پرداخت');
    }
  };

  const openLedger = async (supplierId: string) => {
    if (ledgerFor === supplierId) {
      setLedgerFor(null);
      setLedger(null);
      return;
    }
    setLedgerFor(supplierId);
    const res = await getSupplierLedger(supplierId);
    if (res.success) setLedger(res.supplier);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">تأمین‌کنندگان</h1>
          <p className="text-gray-500 mt-1">مدیریت تأمین‌کنندگان و مانده حساب (بدهی/پرداخت)</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span>➕</span> افزودن تأمین‌کننده
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[200px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">نام</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">تماس</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">مانده بدهی (تومان)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">وضعیت</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <SupplierRow
                    key={s.id}
                    supplier={s}
                    isLedgerOpen={ledgerFor === s.id}
                    ledger={ledgerFor === s.id ? ledger : null}
                    onToggleActive={() => handleToggleActive(s)}
                    onPay={() => openPay(s)}
                    onToggleLedger={() => openLedger(s.id)}
                  />
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                      هنوز تأمین‌کننده‌ای ثبت نشده. دکمه «افزودن تأمین‌کننده» را بزنید.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">تأمین‌کننده جدید</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام تأمین‌کننده <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام رابط</label>
                <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تلفن</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">آدرس</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsAddOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleAdd} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">ثبت</button>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">ثبت پرداخت به «{payTarget.name}»</h2>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">مانده بدهی فعلی: <span className="font-bold text-gray-900">{toFa(payTarget.balanceOwed)} تومان</span></p>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ پرداخت (تومان)</label>
                <input type="number" dir="ltr" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">روش پرداخت</label>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500">
                  <option value="نقدی">نقدی</option>
                  <option value="کارت به کارت">کارت به کارت</option>
                  <option value="حواله بانکی">حواله بانکی</option>
                  <option value="چک">چک</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">یادداشت</label>
                <input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setPayTarget(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handlePay} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700">ثبت پرداخت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierRow({
  supplier,
  isLedgerOpen,
  ledger,
  onToggleActive,
  onPay,
  onToggleLedger,
}: {
  supplier: Supplier;
  isLedgerOpen: boolean;
  ledger: any | null;
  onToggleActive: () => void;
  onPay: () => void;
  onToggleLedger: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-bold text-gray-900">{supplier.name}</div>
          <div className="text-xs text-gray-400">{supplier.address}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {supplier.contactName} <span className="text-gray-400 font-mono">{supplier.phone}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className={`font-black text-lg ${supplier.balanceOwed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {toFa(supplier.balanceOwed)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <button
            onClick={onToggleActive}
            className={`px-2 py-1 text-xs font-bold rounded-md border ${
              supplier.isActive
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            {supplier.isActive ? 'فعال' : 'غیرفعال'}
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <button onClick={onPay} className="text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-100 font-bold text-xs">
              ثبت پرداخت
            </button>
            <button onClick={onToggleLedger} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 font-bold text-xs">
              {isLedgerOpen ? 'بستن گردش حساب' : 'گردش حساب'}
            </button>
          </div>
        </td>
      </tr>
      {isLedgerOpen && (
        <tr>
          <td colSpan={5} className="px-6 py-4 bg-gray-50/70">
            {!ledger ? (
              <span className="text-xs text-gray-500">درحال بارگذاری...</span>
            ) : (
              <LedgerDetail ledger={ledger} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function LedgerDetail({ ledger }: { ledger: any }) {
  const pos = ledger.purchaseOrders || [];
  const payments = ledger.payments || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="text-xs font-bold text-gray-500 mb-2">سفارش‌های خرید</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pos.length === 0 && <p className="text-xs text-gray-400">سفارشی ثبت نشده.</p>}
          {pos.map((po: any) => (
            <div key={po.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-800">{po.poNumber}</span>
                <span className="text-gray-400 mr-2">{formatDate(po.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{toFa(po.totalAmount)} تومان</span>
                <span className="text-gray-500 font-medium">{po.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-500 mb-2">پرداخت‌ها</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {payments.length === 0 && <p className="text-xs text-gray-400">پرداختی ثبت نشده.</p>}
          {payments.map((p: any) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-green-700">{toFa(p.amount)} تومان</span>
                <span className="text-gray-400 mr-2">{formatDate(p.createdAt)}</span>
              </div>
              <span className="text-gray-500">{p.method}{p.note ? ` — ${p.note}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
