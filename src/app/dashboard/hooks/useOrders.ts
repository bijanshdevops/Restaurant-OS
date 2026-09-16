"use client";

import { useState, useEffect } from 'react';
import { getRecentOrders } from '@/app/actions/dashboard';

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export function useOrders() {
  const [data, setData] = useState<RecentOrderRow[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await getRecentOrders(8);
        if (!res.success || !res.orders) {
          setError(res.error || 'خطای نامشخص');
          return;
        }
        const rows: RecentOrderRow[] = res.orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer?.fullName ?? null,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
        }));
        setData(rows);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, []);

  return { data, isLoading, error };
}
