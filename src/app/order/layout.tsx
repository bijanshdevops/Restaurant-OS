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
      router.push('/order/login');
    }
  }, [customer, isLoading, isLoginPage, router]);

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
