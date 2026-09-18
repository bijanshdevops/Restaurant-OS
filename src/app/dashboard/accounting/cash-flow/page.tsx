"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getAccountBalances,
  createAccount,
  updateAccount,
  createAccountTransfer,
  getAccountTransfers,
  createAccountReconciliation,
  getAccountReconciliations,
} from '@/app/actions/accounting';

interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'GATEWAY' | 'OTHER';
  isSystem: boolean;
  isActive: boolean;
}

interface AccountBalanceRow {
  account: Account;
  totalIncome: number;
  totalExpense: number;
  transfersIn: number;
  transfersOut: number;
  balance: number;
}

interface Transfer {
  id: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  fromAccount: Account;
  toAccount: Account;
}

interface Reconciliation {
  id: string;
  computedBalance: number;
  countedBalance: number;
  difference: number;
  note: string | null;
  createdAt: Date;
  account: Account;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: 'نقد',
  BANK: 'بانک',
  GATEWAY: 'درگاه پرداخت',
  OTHER: 'سایر',
};

const toPersianDigits = (num: number | string) => {
  const d = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/-/g, '−').replace(/\d/g, (x) => d[parseInt(x)]);
};

const formatCurrency = (amount: number) =>
  toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(amount)));

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);

const parseAmountInput = (value: string) => {
  const normalized = value.replace(/[۰-۹]/g, (w) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w)));
  const num = parseInt(normalized, 10);
  return Number.isFinite(num) ? num : NaN;
};

export default function CashFlowPage() {
  const [rows, setRows] = useState<AccountBalanceRow[]>([]);
  const [unclassified, setUnclassified] = useState<{ totalIncome: number; totalExpense: number; balance: number } | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<{ name: string; type: Account['type'] }>({ name: '', type: 'OTHER' });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', note: '' });

  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null);
  const [countedBalanceInput, setCountedBalanceInput] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [lastReconcileResult, setLastReconcileResult] = useState<Reconciliation | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [balRes, transferRes, reconcileRes] = await Promise.all([
      getAccountBalances(),
      getAccountTransfers(),
      getAccountReconciliations(),
    ]);
    if (balRes.success && balRes.accounts) {
      setRows(balRes.accounts as AccountBalanceRow[]);
      setUnclassified(balRes.unclassified ?? null);
    }
    if (transferRes.success && transferRes.transfers) {
      setTransfers(transferRes.transfers.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
    }
    if (reconcileRes.success && reconcileRes.reconciliations) {
      setReconciliations(reconcileRes.reconciliations.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) })));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSaveAccount = async () => {
    if (!accountForm.name.trim()) {
      alert('نام حساب را وارد کنید.');
      return;
    }
    const res = await createAccount(accountForm.name.trim(), accountForm.type);
    if (res.success) {
      setIsAccountModalOpen(false);
      setAccountForm({ name: '', type: 'OTHER' });
      fetchAll();
    } else {
      alert(res.error || 'خطا در ایجاد حساب');
    }
  };

  const handleToggleActive = async (account: Account) => {
    const res = await updateAccount(account.id, { isActive: !account.isActive });
    if (res.success) fetchAll();
    else alert(res.error || 'خطا در تغییر وضعیت حساب');
  };

  const handleSaveTransfer = async () => {
    const amountNum = parseAmountInput(transferForm.amount);
    if (!transferForm.fromAccountId || !transferForm.toAccountId) {
      alert('حساب مبدا و مقصد را انتخاب کنید.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('مبلغ وارد شده معتبر نیست.');
      return;
    }
    const res = await createAccountTransfer(
      transferForm.fromAccountId,
      transferForm.toAccountId,
      amountNum,
      transferForm.note.trim() || undefined
    );
    if (res.success) {
      setIsTransferModalOpen(false);
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '', note: '' });
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت انتقال');
    }
  };

  const openReconcileModal = (account: Account) => {
    setReconcilingAccount(account);
    setCountedBalanceInput('');
    setReconcileNote('');
    setLastReconcileResult(null);
  };

  const handleSaveReconciliation = async () => {
    if (!reconcilingAccount) return;
    const countedNum = parseAmountInput(countedBalanceInput);
    if (isNaN(countedNum)) {
      alert('موجودی شمرده‌شده را وارد کنید.');
      return;
    }
    const res = await createAccountReconciliation(reconcilingAccount.id, countedNum, reconcileNote.trim() || undefined);
    if (res.success && res.reconciliation) {
      setLastReconcileResult(res.reconciliation as Reconciliation);
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت مغایرت‌گیری');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">در حال بارگذاری...</div>;
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">جریان نقدی و مغایرت‌گیری صندوق/بانک</h1>
          <p className="text-sm text-gray-500 mt-1">موجودیِ هر حساب زنده از روی تراکنش‌ها و انتقال‌ها محاسبه می‌شود.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
          >
            انتقال بین حساب‌ها
          </button>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
          >
            + حساب جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((row) => (
          <div key={row.account.id} className={`bg-white rounded-xl border p-4 space-y-2 ${!row.account.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">{row.account.name}</div>
                <div className="text-xs text-gray-400">{ACCOUNT_TYPE_LABELS[row.account.type]}</div>
              </div>
              <button
                onClick={() => handleToggleActive(row.account)}
                className={`text-xs px-2 py-1 rounded-full ${row.account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {row.account.isActive ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
            <div className={`text-xl font-extrabold ${row.balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {formatCurrency(row.balance)} تومان
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>درآمد: {formatCurrency(row.totalIncome)}</div>
              <div>هزینه: {formatCurrency(row.totalExpense)}</div>
              {(row.transfersIn > 0 || row.transfersOut > 0) && (
                <div>انتقال: +{formatCurrency(row.transfersIn)} / -{formatCurrency(row.transfersOut)}</div>
              )}
            </div>
            <button
              onClick={() => openReconcileModal(row.account)}
              className="w-full mt-2 bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100"
            >
              مغایرت‌گیری
            </button>
          </div>
        ))}
      </div>

      {unclassified && (unclassified.totalIncome > 0 || unclassified.totalExpense > 0) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          <span className="font-bold">تراکنش‌های بدون حساب: </span>
          درآمد {formatCurrency(unclassified.totalIncome)} و هزینه {formatCurrency(unclassified.totalExpense)} تومان
          — عمدتاً خریدهای تأمین‌کننده و حقوق (فاز ۳/۴) یا تراکنش‌های دستیِ پیش از این فاز که هنوز حسابی
          ندارند؛ از بخش «حسابداری» و ویرایشِ هر تراکنش قابل تخصیص‌اند.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold text-gray-800 mb-3">آخرین انتقال‌های بین‌حسابی</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {transfers.length === 0 && <div className="text-sm text-gray-400">موردی ثبت نشده است.</div>}
            {transfers.map((t) => (
              <div key={t.id} className="text-sm border-b border-gray-100 pb-2">
                <div className="flex justify-between">
                  <span>{t.fromAccount.name} ← {t.toAccount.name}</span>
                  <span className="font-bold">{formatCurrency(t.amount)}</span>
                </div>
                <div className="text-xs text-gray-400">{formatDate(t.createdAt)} {t.note ? `— ${t.note}` : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold text-gray-800 mb-3">آخرین مغایرت‌گیری‌ها</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {reconciliations.length === 0 && <div className="text-sm text-gray-400">موردی ثبت نشده است.</div>}
            {reconciliations.map((r) => (
              <div key={r.id} className="text-sm border-b border-gray-100 pb-2">
                <div className="flex justify-between">
                  <span>{r.account.name}</span>
                  <span className={`font-bold ${r.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {r.difference === 0 ? 'بدون مغایرت' : `مغایرت: ${formatCurrency(r.difference)}`}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  دفتر: {formatCurrency(r.computedBalance)} — شمرده‌شده: {formatCurrency(r.countedBalance)} — {formatDate(r.createdAt)}
                </div>
                {r.note && <div className="text-xs text-gray-400">{r.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-gray-800">حساب جدید</h3>
            <input
              type="text"
              placeholder="نام حساب (مثلاً صندوق شعبه دوم)"
              value={accountForm.name}
              onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={accountForm.type}
              onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value as Account['type'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">انصراف</button>
              <button onClick={handleSaveAccount} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">ذخیره</button>
            </div>
          </div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-gray-800">انتقال بین حساب‌ها</h3>
            <select
              value={transferForm.fromAccountId}
              onChange={(e) => setTransferForm((f) => ({ ...f, fromAccountId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">از حساب...</option>
              {rows.map((r) => (
                <option key={r.account.id} value={r.account.id}>{r.account.name}</option>
              ))}
            </select>
            <select
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm((f) => ({ ...f, toAccountId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">به حساب...</option>
              {rows.map((r) => (
                <option key={r.account.id} value={r.account.id}>{r.account.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="مبلغ (تومان)"
              value={transferForm.amount}
              onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
            <input
              type="text"
              placeholder="توضیح (اختیاری)"
              value={transferForm.note}
              onChange={(e) => setTransferForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">انصراف</button>
              <button onClick={handleSaveTransfer} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">ثبت انتقال</button>
            </div>
          </div>
        </div>
      )}

      {reconcilingAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-gray-800">مغایرت‌گیری — {reconcilingAccount.name}</h3>
            <input
              type="text"
              placeholder="موجودی واقعیِ شمرده‌شده (تومان)"
              value={countedBalanceInput}
              onChange={(e) => setCountedBalanceInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
            <input
              type="text"
              placeholder="توضیح (اختیاری)"
              value={reconcileNote}
              onChange={(e) => setReconcileNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />

            {lastReconcileResult && (
              <div className={`rounded-lg p-3 text-sm ${lastReconcileResult.difference === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                موجودی دفتر: {formatCurrency(lastReconcileResult.computedBalance)} — مغایرت: {formatCurrency(lastReconcileResult.difference)} تومان.
                هیچ تراکنشِ اصلاحیِ خودکاری ثبت نشد؛ در صورت نیاز آن را دستی از بخش حسابداری ثبت کنید.
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReconcilingAccount(null)} className="px-4 py-2 text-sm text-gray-600">بستن</button>
              <button onClick={handleSaveReconciliation} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">ثبت مغایرت‌گیری</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
