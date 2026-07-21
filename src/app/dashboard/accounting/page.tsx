"use client";

import { useState, useEffect, useCallback } from 'react';
import { getTransactions, createExpense } from '@/app/actions/accounting';
import { TransactionType } from '@prisma/client';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number; // in Tomans
  createdAt: Date;
}

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State for New Expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: ''
  });

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const res = await getTransactions();
    if (res.success && res.transactions) {
      setTransactions(res.transactions.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt)
      })));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate metrics
  const totalRevenue = transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const toPersianDigits = (num: number | string) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US').format(Math.abs(amount));
    return toPersianDigits(formatted);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  const handleSaveExpense = async () => {
    if (!formData.description || !formData.amount) {
      alert('لطفاً شرح و مبلغ را وارد کنید.');
      return;
    }
    
    const amountNum = parseInt(formData.amount.replace(/[۰-۹]/g, w => ['0','1','2','3','4','5','6','7','8','9']['۰۱۲۳۴۵۶۷۸۹'.indexOf(w)]));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('مبلغ وارد شده معتبر نیست.');
      return;
    }

    const res = await createExpense(formData.description, amountNum);
    if (res.success && res.transaction) {
      setTransactions([{ ...res.transaction, createdAt: new Date(res.transaction.createdAt) } as any, ...transactions]);
      setIsModalOpen(false);
      setFormData({ description: '', amount: '' });
    } else {
      alert('خطا در ثبت هزینه');
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">حسابداری و مالی</h1>
          <p className="text-gray-500 mt-1">نمای کلی درآمدها، هزینه‌ها و سودآوری رستوران</p>
        </div>
        <div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span>➖</span> ثبت هزینه دستی
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">درآمد کل (سیستمی)</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-green-600">{formatCurrency(totalRevenue)}</span>
            <span className="text-gray-400 font-medium text-sm">تومان</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-bold mb-2 relative z-10">هزینه‌ها (ثبت شده)</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-red-500">{formatCurrency(totalExpenses)}</span>
            <span className="text-gray-400 font-medium text-sm">تومان</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-md border border-blue-700 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/30 rounded-full blur-2xl"></div>
          <span className="text-blue-200 text-sm font-bold mb-2 relative z-10">سود خالص محاسبه شده</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-white">{formatCurrency(netProfit)}</span>
            <span className="text-blue-200 font-medium text-sm">تومان</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">تراکنش‌های اخیر</h2>
          {isLoading && <span className="text-xs text-blue-600 font-bold animate-pulse">درحال همگام‌سازی...</span>}
        </div>
        
        {isLoading && transactions.length === 0 ? (
          <div className="flex justify-center items-center h-[200px]">
            <span className="text-gray-500 font-bold animate-pulse">درحال بارگذاری داده‌های مالی...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">شناسه تراکنش</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">شرح</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">تاریخ و زمان</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">مبلغ (تومان)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-500">{trx.id.substring(0,8)}...</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {trx.type === 'INCOME' ? (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm font-bold">
                            +
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 shadow-sm font-bold">
                            -
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-800">{trx.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-500 font-medium">{formatDate(trx.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <div className={`text-base font-bold flex items-center justify-end gap-1 ${trx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                        <span>{trx.type === 'INCOME' ? '+' : '-'}</span>
                        <span>{formatCurrency(trx.amount)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">
                      هنوز هیچ تراکنشی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------------------- ADD EXPENSE MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <span>➖</span> ثبت هزینه دستی
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-red-400 hover:text-red-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شرح هزینه <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all font-sans"
                  placeholder="مثال: خرید مواد شوینده"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ (تومان) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-left font-sans"
                  dir="ltr"
                  min="0"
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleSaveExpense}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                ثبت سند
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
