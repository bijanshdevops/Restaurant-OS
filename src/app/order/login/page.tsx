"use client";

import { useState } from 'react';
import { useCustomerAuth } from '@/shared/context/CustomerAuthContext';
import { requestOtp, verifyOtp } from '@/app/actions/customerAuth';

type Step = 'phone' | 'otp';

export default function CustomerLoginPage() {
  const { login } = useCustomerAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const res = await requestOtp(phone);
    setIsLoading(false);
    if (res.success) {
      setDevCode(res.devCode || null);
      setStep('otp');
    } else {
      setError(res.error || 'خطا در ارسال کد');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const res = await verifyOtp(phone, code, fullName);
    setIsLoading(false);
    if (res.success && res.customer) {
      login({ id: res.customer.id, phone: res.customer.phone, fullName: res.customer.fullName });
    } else {
      setError(res.error || 'کد نامعتبر است');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-12">
              <span className="text-2xl font-black text-blue-600 transform -rotate-12">OS</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">سفارش آنلاین</h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">Restaurant OS</p>
          </div>
        </div>

        <div className="px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {devCode && step === 'otp' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold text-center">
              (فقط محیط توسعه) کد ارسالی: {devCode}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">ورود / ثبت‌نام</h2>
                <p className="text-sm text-gray-500 mt-1">شماره موبایل خود را وارد کنید.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">شماره موبایل</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center font-sans tracking-widest"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'در حال ارسال...' : 'دریافت کد تایید'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">کد تایید</h2>
                <p className="text-sm text-gray-500 mt-1">کد ارسال‌شده به {phone} را وارد کنید.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کد ۶ رقمی</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center font-sans tracking-[0.5em] text-xl"
                  placeholder="------"
                  dir="ltr"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نام شما (برای مشتریان جدید)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="نام و نام خانوادگی"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'در حال بررسی...' : 'ورود'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                تغییر شماره موبایل
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
