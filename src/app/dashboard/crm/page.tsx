"use client";

import { useState, useEffect, useCallback } from 'react';
import { getCustomers, createCustomer } from '@/app/actions/crm';
import { LoyaltyTier } from '@prisma/client';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  totalOrders: number;
  totalSpent: number; // in Tomans
  lastVisit: Date;
  loyaltyTier: LoyaltyTier;
}

export default function CrmPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const res = await getCustomers();
    if (res.success && res.customers) {
      setCustomers(res.customers.map((c: any) => ({
        ...c,
        lastVisit: new Date(c.lastVisit)
      })));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Computed metrics
  const totalCustomers = customers.length;
  const vipMembers = customers.filter(c => c.loyaltyTier === 'VIP').length;
  const averageSpent = Math.round(customers.reduce((acc, curr) => acc + curr.totalSpent, 0) / (totalCustomers || 1));

  const toPersianDigits = (num: number | string) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return toPersianDigits(formatted);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
    }).format(date);
  };

  const translateLoyaltyTier = (tier: LoyaltyTier) => {
    const map: Record<LoyaltyTier, string> = {
      VIP: 'VIP',
      GOLD: 'طلایی',
      SILVER: 'نقره‌ای',
      BRONZE: 'برنزی',
      NORMAL: 'عادی',
    };
    return map[tier];
  };

  const getLoyaltyBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'GOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SILVER': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'BRONZE': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleSendOffer = (name: string) => {
    alert(`کد تخفیف ویژه برای مشتری "${name}" با موفقیت پیامک شد.`);
  };

  const handleSaveCustomer = async () => {
    if (!formData.fullName || !formData.phone) {
      alert('لطفاً نام و شماره تماس را وارد کنید.');
      return;
    }

    const res = await createCustomer(formData);
    if (res.success && res.customer) {
      setCustomers([{ ...res.customer, lastVisit: new Date(res.customer.lastVisit) } as any, ...customers]);
      setIsModalOpen(false);
      setFormData({ fullName: '', phone: '' });
    } else {
      alert(res.error || 'خطا در ثبت مشتری');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.fullName.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مدیریت مشتریان (CRM)</h1>
          <p className="text-gray-500 mt-1">باشگاه مشتریان، تاریخچه خرید و ارسال کمپین‌ها</p>
        </div>
        <div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>➕</span> افزودن مشتری جدید
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-semibold mb-2 relative z-10">تعداد کل مشتریان</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-blue-600">{toPersianDigits(totalCustomers)}</span>
            <span className="text-gray-400 font-medium text-sm">نفر</span>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-blue-600 relative z-10">
            <span>👥 بر اساس دیتابیس</span>
          </div>
        </div>

        {/* VIP Members */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-semibold mb-2 relative z-10">مشتریان ویژه (VIP)</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-purple-600">{toPersianDigits(vipMembers)}</span>
            <span className="text-gray-400 font-medium text-sm">نفر</span>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-purple-500 relative z-10">
            <span>⭐ وفادارترین کاربران</span>
          </div>
        </div>

        {/* Average Spent */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-gray-500 text-sm font-semibold mb-2 relative z-10">میانگین ارزش خرید</span>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-emerald-600">{formatCurrency(averageSpent)}</span>
            <span className="text-gray-400 font-medium text-sm">تومان</span>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 relative z-10">
            <span>📈 سرانه هر مشتری</span>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">لیست مشتریان</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با شماره یا نام..." 
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-right font-sans transition-all w-64"
              dir="rtl"
            />
          </div>
        </div>
        
        {isLoading && customers.length === 0 ? (
          <div className="flex justify-center items-center h-[300px]">
            <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات مشتریان...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700">مشتری</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700">شماره تماس</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700 text-center">سطح وفاداری</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700 text-center">تعداد سفارش</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700 text-left">مجموع خرید</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700">آخرین مراجعه</th>
                  <th scope="col" className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold ml-3 text-lg shadow-sm border border-indigo-200">
                          {customer.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{customer.fullName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-1">{customer.id.substring(0,8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 font-mono tracking-widest font-bold bg-gray-100 px-2 py-1 rounded-md">{customer.phone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${getLoyaltyBadge(customer.loyaltyTier)}`}>
                        {translateLoyaltyTier(customer.loyaltyTier)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-base font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                        {toPersianDigits(customer.totalOrders)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <span className="text-base font-black text-gray-900">{formatCurrency(customer.totalSpent)}</span>
                      <span className="text-xs text-gray-500 mr-1">تومان</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {formatDate(customer.lastVisit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button 
                        onClick={() => handleSendOffer(customer.fullName)}
                        className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-lg transition-colors border border-indigo-200"
                      >
                        🎁 ارسال پیشنهاد
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">
                      هیچ مشتری‌ای یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------------------- ADD CUSTOMER MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <span>➕</span> تعریف مشتری جدید
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-sans"
                  placeholder="مثال: علی رضایی"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شماره تماس (موبایل) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-mono tracking-widest"
                  dir="ltr"
                  placeholder="09123456789"
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
                onClick={handleSaveCustomer}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                ثبت مشتری
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
