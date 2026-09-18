"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CustomerAuthProvider, useCustomerAuth } from '@/shared/context/CustomerAuthContext';
import { CartProvider } from '@/shared/context/CartContext';

function OrderGate({ children }: { children: ReactNode }) {
  const { customer, isLoading } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/order/login';

  useEffect(() => {
    if (!isLoading && !customer && !isLoginPage) {
      // فاز ۱۶: اگر مسیرِ جاری صفحه‌ی سفارشِ QR روی میز است، شناسه‌ی میز را
      // پیش از هدایت به صفحه‌ی ورود ذخیره می‌کنیم تا بعد از ورودِ موفقِ OTP،
      // مشتری مستقیماً به همان جریانِ سفارشِ حضوری بازگردد، نه منوی آنلاینِ
      // عمومی — نک. CustomerAuthContext.login().
      const tableMatch = pathname.match(/^\/order\/table\/([^/]+)/);
      if (tableMatch) {
        localStorage.setItem('restaurant_pending_table_id', tableMatch[1]);
      }
      router.push('/order/login');
    }
  }, [customer, isLoading, isLoginPage, pathname, router]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        درحال بارگذاری...
      </div>
    );
  }

  return <>{children}</>;
}

export default function OrderLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <OrderGate>{children}</OrderGate>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
