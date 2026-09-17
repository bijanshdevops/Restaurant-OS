"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center font-sans">درحال بارگذاری داشبورد...</div>;
  }

  const hasRole = (role: string) => user.roles?.includes(role);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* Global Dashboard Navigation / Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
                OS
              </div>
              <span className="font-semibold text-xl text-gray-900 tracking-tight">
                Restaurant<span className="text-blue-600">OS</span>
              </span>
            </div>
            
            {/* Navigation Links - Role Based */}
            <nav className="flex gap-2 overflow-x-auto whitespace-nowrap">
              {hasRole('ADMIN') && (
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">داشبورد</Link>
              )}
              
              {(hasRole('ADMIN') || hasRole('CASHIER')) && (
                <Link href="/dashboard/pos" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors">صندوق (POS)</Link>
              )}

              {(hasRole('ADMIN') || hasRole('CHEF')) && (
                <Link href="/dashboard/kitchen" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">آشپزخانه</Link>
              )}
              
              {(hasRole('ADMIN') || hasRole('ACCOUNTANT')) && (
                <Link href="/dashboard/accounting" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">حسابداری</Link>
              )}

              {(hasRole('ADMIN') || hasRole('ACCOUNTANT')) && (
                <Link href="/dashboard/modian" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">سامانه مودیان</Link>
              )}

              {(hasRole('ADMIN') || hasRole('ACCOUNTANT')) && (
                <Link href="/dashboard/analytics" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">گزارش‌گیری و تحلیل</Link>
              )}

              {hasRole('ADMIN') && (
                <Link href="/dashboard/refunds" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">مرجوعی و استرداد</Link>
              )}

              {hasRole('ADMIN') && (
                <Link href="/dashboard/audit-log" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">لاگ عملیات و ممیزی</Link>
              )}
              
              {(hasRole('ADMIN') || hasRole('INVENTORY_MANAGER')) && (
                <Link href="/dashboard/inventory" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">انبار</Link>
              )}

              {(hasRole('ADMIN') || hasRole('CASHIER')) && (
                <Link href="/dashboard/crm" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">مشتریان</Link>
              )}

              {(hasRole('ADMIN') || hasRole('CASHIER')) && (
                <Link href="/dashboard/reservations" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">میز و رزرو</Link>
              )}

              {(hasRole('ADMIN') || hasRole('CASHIER')) && (
                <Link href="/dashboard/delivery" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">پیک و تحویل</Link>
              )}

              {(hasRole('ADMIN') || hasRole('INVENTORY_MANAGER') || hasRole('ACCOUNTANT')) && (
                <Link href="/dashboard/purchase-orders" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">سفارش خرید</Link>
              )}

              {(hasRole('ADMIN') || hasRole('INVENTORY_MANAGER') || hasRole('ACCOUNTANT')) && (
                <Link href="/dashboard/suppliers" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">تأمین‌کنندگان</Link>
              )}

              {/* هر پرسنل واردشده، صرف‌نظر از نقش، برای مشاهده شیفت خودش و ثبت حضور و غیاب به این صفحه دسترسی دارد. */}
              <Link href="/dashboard/staff" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">پرسنل و شیفت‌ها</Link>
              
              {hasRole('ADMIN') && (
                <Link href="/dashboard/branches" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">شعبه‌ها</Link>
              )}

              {hasRole('ADMIN') && (
                <Link href="/dashboard/admin" className="text-amber-600 hover:text-amber-700 px-3 py-2 rounded-md text-sm font-bold transition-colors bg-amber-50 border border-amber-100">پنل مدیریت</Link>
              )}
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex flex-col text-left items-end">
                <span className="text-sm font-bold text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {user.roles?.join(', ')}
                  {user.branchName ? ` · ${user.branchName}` : ''}
                </span>
              </div>
              <button 
                onClick={logout}
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
