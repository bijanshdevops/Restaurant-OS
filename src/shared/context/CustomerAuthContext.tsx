"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logoutCustomer } from '@/app/actions/customerAuth';

export interface CustomerSessionInfo {
  id: string;
  phone: string;
  fullName: string;
}

interface CustomerAuthContextType {
  customer: CustomerSessionInfo | null;
  login: (customer: CustomerSessionInfo) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('restaurant_customer');
    if (stored) {
      try {
        setCustomer(JSON.parse(stored));
      } catch {
        localStorage.removeItem('restaurant_customer');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newCustomer: CustomerSessionInfo) => {
    setCustomer(newCustomer);
    localStorage.setItem('restaurant_customer', JSON.stringify(newCustomer));

    // فاز ۱۶: اگر مشتری از طریقِ اسکنِ QR روی میز به صفحه‌ی ورود هدایت شده
    // بود (نک. OrderGate در layout.tsx)، بعد از ورودِ موفق باید مستقیماً به
    // همان جریانِ سفارشِ حضوری برگردد، نه منوی آنلاینِ عمومی.
    const pendingTableId = localStorage.getItem('restaurant_pending_table_id');
    if (pendingTableId) {
      localStorage.removeItem('restaurant_pending_table_id');
      router.push(`/order/table/${pendingTableId}`);
      return;
    }

    router.push('/order');
  };

  const logout = async () => {
    setCustomer(null);
    localStorage.removeItem('restaurant_customer');
    await logoutCustomer();
    router.push('/order/login');
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, login, logout, isLoading }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
