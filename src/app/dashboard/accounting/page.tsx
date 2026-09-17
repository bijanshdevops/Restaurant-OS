"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import {
  getTransactions,
  createExpense,
  createIncome,
  updateTransactionCategory,
  deleteTransaction,
  getCategories,
  createCategory,
  deleteCategory,
  getFinancialSummary,
  exportTransactionsToExcel,
} from '@/app/actions/accounting';
import { getBranches } from '@/app/actions/branch';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isSystem: boolean;
  taxRatePercent: number | null;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  taxAmount: number;
  createdAt: Date;
  referenceType: string | null;
  category: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  outputTax: number;
  inputTax: number;
  netVatPayable: number;
  incomeByCategory: { categoryId: string | null; name: string; total: number; taxTotal: number; count: number }[];
  expenseByCategory: { categoryId: string | null; name: string; total: number; taxTotal: number; count: number }[];
}

const toPersianDigits = (num: number | string) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

const formatCurrency = (amount: number) => toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount))));

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);

const parseAmountInput = (value: string) => {
  const normalized = value.replace(/[۰-۹]/g, (w) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w)));
  const num = parseInt(normalized, 10);
  return Number.isFinite(num) ? num : NaN;
};

export default function AccountingPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes('ADMIN');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '', categoryId: '', branchId: '' });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', categoryId: '' });
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', categoryId: '' });
  const [categoryForm, setCategoryForm] = useState<{ name: string; type: 'INCOME' | 'EXPENSE'; taxRatePercent: string }>({
    name: '',
    type: 'EXPENSE',
    taxRatePercent: '',
  });
  const [editForm, setEditForm] = useState({ description: '', categoryId: '', taxAmount: '' });

  const activeFilters = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    type: (filters.type || undefined) as 'INCOME' | 'EXPENSE' | undefined,
    categoryId: filters.categoryId || undefined,
    branchId: filters.branchId || undefined,
  };

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [txRes, catRes, summaryRes] = await Promise.all([
      getTransactions(activeFilters),
      getCategories(),
      getFinancialSummary({ dateFrom: activeFilters.dateFrom, dateTo: activeFilters.dateTo, branchId: activeFilters.branchId }),
    ]);
    if (txRes.success && txRes.transactions) {
      setTransactions(txRes.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
    }
    if (catRes.success && catRes.categories) setCategories(catRes.categories);
    if (summaryRes.success && summaryRes.summary) setSummary(summaryRes.summary as Summary);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.type, filters.categoryId, filters.branchId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (isAdmin) {
      getBranches().then((res: any) => {
        if (res.success && res.branches) setBranches(res.branches);
      });
    }
  }, [isAdmin]);

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      alert('لطفاً شرح و مبلغ را وارد کنید.');
      return;
    }
    const amountNum = parseAmountInput(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('مبلغ وارد شده معتبر نیست.');
      return;
    }
    const res = await createExpense(expenseForm.description, amountNum, {
      categoryId: expenseForm.categoryId || undefined,
    });
    if (res.success) {
      setIsExpenseModalOpen(false);
      setExpenseForm({ description: '', amount: '', categoryId: '' });
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت هزینه');
    }
  };

  const handleSaveIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount) {
      alert('لطفاً شرح و مبلغ را وارد کنید.');
      return;
    }
    const amountNum = parseAmountInput(incomeForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('مبلغ وارد شده معتبر نیست.');
      return;
    }
    const res = await createIncome(incomeForm.description, amountNum, {
      categoryId: incomeForm.categoryId || undefined,
    });
    if (res.success) {
      setIsIncomeModalOpen(false);
      setIncomeForm({ description: '', amount: '', categoryId: '' });
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت درآمد');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('نام دسته را وارد کنید.');
      return;
    }
    const rate = categoryForm.taxRatePercent.trim() ? parseFloat(categoryForm.taxRatePercent) : undefined;
    const res = await createCategory(categoryForm.name.trim(), categoryForm.type, rate);
    if (res.success) {
      setCategoryForm({ name: '', type: 'EXPENSE', taxRatePercent: '' });
      fetchAll();
    } else {
      alert(res.error || 'خطا در ایجاد دسته');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('این دسته حذف شود؟')) return;
    const res = await deleteCategory(id);
    if (res.success) {
      fetchAll();
    } else {
      alert(res.error || 'خطا در حذف دسته');
    }
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({
      description: tx.description,
      categoryId: tx.category?.id || '',
      taxAmount: String(Math.round(tx.taxAmount)),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const taxAmountNum = parseAmountInput(editForm.taxAmount || '0');
    const res = await updateTransactionCategory(editingTx.id, {
      description: editForm.description,
      categoryId: editForm.categoryId || null,
      taxAmount: isNaN(taxAmountNum) ? 0 : taxAmountNum,
    });
    if (res.success) {
      setEditingTx(null);
      fetchAll();
    } else {
      alert(res.error || 'خطا در بروزرسانی تراکنش');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('این تراکنش حذف شود؟ این عمل قابل بازگشت نیست.')) return;
    const res = await deleteTransaction(id);
    if (res.success) {
      fetchAll();
    } else {
      alert(res.error || 'خطا در حذف تراکنش');
    }
  };

  const handleExportExcel = async () => {
    const res = await exportTransactionsToExcel(activeFilters);
    if (!res.success || !res.base64) {
      alert(res.error || 'خطا در ساخت خروجی اکسل');
      return;
    }
    const byteChars = atob(res.base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename || 'accounting-report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">حسابداری و مالیات</h1>
          <p className="text-gray-500 mt-1">درآمد، هزینه، دسته‌بندی حساب‌ها و گزارش مالیات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm">
            📊 خروجی اکسل
          </button>
          <button onClick={handlePrint} className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm">
            🖨️ چاپ گزارش
          </button>
          <button onClick={() => setIsIncomeModalOpen(true)} className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm flex items-center gap-1">
            <span>➕</span> ثبت درآمد دستی
          </button>
          <button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm flex items-center gap-1">
            <span>➖</span> ثبت هزینه دستی
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="print:hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">از تاریخ</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">تا تاریخ</label>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">نوع</label>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">همه</option>
            <option value="INCOME">درآمد</option>
            <option value="EXPENSE">هزینه</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">دسته‌بندی</label>
          <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]">
            <option value="">همه دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type === 'INCOME' ? 'درآمد' : 'هزینه'})</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">شعبه</label>
            <select value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">همه شعبه‌ها</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => setFilters({ dateFrom: '', dateTo: '', type: '', categoryId: '', branchId: '' })}
          className="text-sm font-bold text-gray-500 hover:text-gray-800 px-3 py-2"
        >
          پاک‌کردن فیلترها
        </button>
      </div>

      {/* Printable report area: KPIs + VAT + P&L breakdown */}
      <div id="printable-report" className="space-y-8">
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-2xl font-bold">گزارش مالی و مالیاتی</h1>
          {(filters.dateFrom || filters.dateTo) && (
            <p className="text-sm text-gray-600 mt-1">
              بازه: {filters.dateFrom ? toPersianDigits(filters.dateFrom) : '—'} تا {filters.dateTo ? toPersianDigits(filters.dateTo) : '—'}
            </p>
          )}
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group print:border print:shadow-none">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 print:hidden"></div>
            <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">درآمد کل</span>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-green-600">{formatCurrency(summary?.totalIncome ?? 0)}</span>
              <span className="text-gray-400 font-medium text-sm">تومان</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group print:border print:shadow-none">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 print:hidden"></div>
            <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">هزینه‌ها</span>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-red-500">{formatCurrency(summary?.totalExpense ?? 0)}</span>
              <span className="text-gray-400 font-medium text-sm">تومان</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-md border border-blue-700 p-6 flex flex-col relative overflow-hidden group print:bg-white print:border-gray-300 print:text-black">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/30 rounded-full blur-2xl print:hidden"></div>
            <span className="text-blue-200 text-sm font-bold mb-2 relative z-10 print:text-gray-500">سود خالص</span>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-white print:text-black">{formatCurrency(summary?.netProfit ?? 0)}</span>
              <span className="text-blue-200 font-medium text-sm print:text-gray-500">تومان</span>
            </div>
          </div>
        </div>

        {/* VAT summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:border print:shadow-none">
          <h2 className="text-lg font-bold text-gray-800 mb-4">خلاصه مالیات بر ارزش افزوده (VAT)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">مالیات فروش (خروجی)</p>
              <p className="text-xl font-black text-green-600">{formatCurrency(summary?.outputTax ?? 0)} <span className="text-xs text-gray-400 font-medium">تومان</span></p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">مالیات خرید (ورودی)</p>
              <p className="text-xl font-black text-red-500">{formatCurrency(summary?.inputTax ?? 0)} <span className="text-xs text-gray-400 font-medium">تومان</span></p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">مانده مالیات قابل پرداخت</p>
              <p className="text-xl font-black text-blue-700">{formatCurrency(summary?.netVatPayable ?? 0)} <span className="text-xs text-gray-400 font-medium">تومان</span></p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-6">
            این خلاصه از جمع مالیاتِ ثبت‌شده روی تراکنش‌ها ساخته می‌شود (نه یک اظهارنامه‌ی رسمی). مالیات فروش سفارش‌های POS/آنلاین به‌صورت خودکار از نرخ تنظیمات محاسبه می‌شود؛ مالیات خرید فقط وقتی محاسبه می‌شود که برای دسته‌ی هزینه‌ی مربوطه نرخ مالیات تعریف شده باشد یا هنگام ثبت/ویرایش تراکنش صریحاً وارد شود.
          </p>
        </div>

        {/* P&L breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:border print:shadow-none">
            <h2 className="text-lg font-bold text-gray-800 mb-4">درآمد به تفکیک دسته</h2>
            <div className="space-y-2">
              {(summary?.incomeByCategory ?? []).map((c) => (
                <div key={c.categoryId ?? 'none'} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-700 font-medium">{c.name}</span>
                  <span className="font-bold text-green-600">{formatCurrency(c.total)} تومان</span>
                </div>
              ))}
              {(!summary || summary.incomeByCategory.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:border print:shadow-none">
            <h2 className="text-lg font-bold text-gray-800 mb-4">هزینه به تفکیک دسته</h2>
            <div className="space-y-2">
              {(summary?.expenseByCategory ?? []).map((c) => (
                <div key={c.categoryId ?? 'none'} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-700 font-medium">{c.name}</span>
                  <span className="font-bold text-red-500">{formatCurrency(c.total)} تومان</span>
                </div>
              ))}
              {(!summary || summary.expenseByCategory.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">داده‌ای برای این بازه یافت نشد</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category management */}
      <div className="print:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">دسته‌بندی حساب‌ها (Chart of Accounts)</h2>
          <button onClick={() => setIsCategoryModalOpen(true)} className="text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200">
            ➕ افزودن دسته
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-green-700 mb-2">دسته‌های درآمد</h3>
            <div className="space-y-1">
              {incomeCategories.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span>{c.name} {c.taxRatePercent != null && <span className="text-xs text-gray-400">(مالیات {toPersianDigits(c.taxRatePercent)}٪)</span>}</span>
                  {c.isSystem ? (
                    <span className="text-xs text-gray-400">سیستمی</span>
                  ) : (
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-700 mb-2">دسته‌های هزینه</h3>
            <div className="space-y-1">
              {expenseCategories.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span>{c.name} {c.taxRatePercent != null && <span className="text-xs text-gray-400">(مالیات {toPersianDigits(c.taxRatePercent)}٪)</span>}</span>
                  {c.isSystem ? (
                    <span className="text-xs text-gray-400">سیستمی</span>
                  ) : (
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="print:hidden bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">تراکنش‌ها</h2>
          {isLoading && <span className="text-xs text-blue-600 font-bold animate-pulse">درحال همگام‌سازی...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-right">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">شرح</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">دسته‌بندی</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-center">تاریخ</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-left">مبلغ</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-left">مالیات</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {transactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm font-bold ${trx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {trx.type === 'INCOME' ? '+' : '-'}
                      </div>
                      <span className="text-sm font-bold text-gray-800">{trx.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{trx.category?.name ?? 'بدون دسته‌بندی'}</td>
                  <td className="px-4 py-4 text-center text-sm text-gray-500 font-medium whitespace-nowrap">{formatDate(trx.createdAt)}</td>
                  <td className={`px-4 py-4 text-left text-sm font-bold whitespace-nowrap ${trx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(trx.amount)}</td>
                  <td className="px-4 py-4 text-left text-sm text-gray-500 whitespace-nowrap">{formatCurrency(trx.taxAmount)}</td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <button onClick={() => openEditModal(trx)} className="text-blue-600 hover:text-blue-800 text-xs font-bold ml-3">ویرایش</button>
                    {isAdmin && !trx.referenceType && (
                      <button onClick={() => handleDeleteTransaction(trx.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هیچ تراکنشی برای این فیلتر یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------- ADD EXPENSE MODAL -------------------- */}
      {isExpenseModalOpen && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2"><span>➖</span> ثبت هزینه دستی</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-red-400 hover:text-red-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شرح هزینه <span className="text-red-500">*</span></label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none" placeholder="مثال: خرید مواد شوینده" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ (تومان) <span className="text-red-500">*</span></label>
                <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-left" dir="ltr" min="0" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">دسته‌بندی</label>
                <select value={expenseForm.categoryId} onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
                  <option value="">سایر هزینه‌ها (پیش‌فرض)</option>
                  {expenseCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsExpenseModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl">انصراف</button>
              <button onClick={handleSaveExpense} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl">ثبت سند</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ADD INCOME MODAL -------------------- */}
      {isIncomeModalOpen && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50">
              <h2 className="text-lg font-bold text-green-800 flex items-center gap-2"><span>➕</span> ثبت درآمد دستی</h2>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-green-500 hover:text-green-800 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شرح درآمد <span className="text-red-500">*</span></label>
                <input type="text" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none" placeholder="مثال: فروش ضایعات" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ (تومان) <span className="text-red-500">*</span></label>
                <input type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-left" dir="ltr" min="0" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">دسته‌بندی</label>
                <select value={incomeForm.categoryId} onChange={(e) => setIncomeForm({ ...incomeForm, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
                  <option value="">سایر درآمدها (پیش‌فرض)</option>
                  {incomeCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsIncomeModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl">انصراف</button>
              <button onClick={handleSaveIncome} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl">ثبت سند</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ADD CATEGORY MODAL -------------------- */}
      {isCategoryModalOpen && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-blue-800">افزودن دسته‌ی حساب جدید</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-blue-400 hover:text-blue-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام دسته <span className="text-red-500">*</span></label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" placeholder="مثال: اجاره" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نوع</label>
                <select value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as 'INCOME' | 'EXPENSE' })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
                  <option value="EXPENSE">هزینه</option>
                  <option value="INCOME">درآمد</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نرخ مالیات پیش‌فرض (٪) — اختیاری</label>
                <input type="number" value={categoryForm.taxRatePercent} onChange={(e) => setCategoryForm({ ...categoryForm, taxRatePercent: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-left" dir="ltr" min="0" max="100" placeholder="مثلاً ۹" />
                <p className="text-xs text-gray-400 mt-1">اگر پر شود، مبلغ ثبت‌شده برای این دسته «شامل مالیات» فرض و بخش مالیات به‌طور خودکار از آن استخراج می‌شود.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsCategoryModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl">انصراف</button>
              <button onClick={async () => { await handleSaveCategory(); setIsCategoryModalOpen(false); }} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-xl">ثبت دسته</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- EDIT TRANSACTION MODAL -------------------- */}
      {editingTx && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">ویرایش تراکنش</h2>
              <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {editingTx.referenceType && (
                <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2">
                  این تراکنش خودکار (از سفارش/خرید/حقوق) ثبت شده؛ فقط دسته‌بندی، شرح و مالیات آن قابل اصلاح است — مبلغ اصلی تغییر نمی‌کند.
                </p>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شرح</label>
                <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">دسته‌بندی</label>
                <select value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
                  <option value="">بدون دسته‌بندی</option>
                  {(editingTx.type === 'INCOME' ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ مالیات (تومان)</label>
                <input type="number" value={editForm.taxAmount} onChange={(e) => setEditForm({ ...editForm, taxAmount: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-left" dir="ltr" min="0" max={editingTx.amount} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setEditingTx(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl">انصراف</button>
              <button onClick={handleSaveEdit} className="px-5 py-2.5 text-sm font-bold text-white bg-gray-800 rounded-xl">ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
