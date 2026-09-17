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
