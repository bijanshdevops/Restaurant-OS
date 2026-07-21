"use client";

import { useState, useEffect } from 'react';
import { baseApi } from '../../../shared/infrastructure/api/baseApi';

export interface OrderFeedItem {
  id: string;
  customerId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  correlationId: string; // Used for distributed tracing to the Outbox
}

export function useOrders() {
  const [data, setData] = useState<OrderFeedItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        // Assume an endpoint /api/orders/recent exists
        // Mocking the backend response if the GET endpoint doesn't exist yet
        const orders = await baseApi<OrderFeedItem[]>('/orders/recent').catch(() => [
          { id: 'ord_1', customerId: 'cust_A', totalAmount: 45.50, status: 'PAID', createdAt: new Date().toISOString(), correlationId: 'corr_123' },
          { id: 'ord_2', customerId: 'cust_B', totalAmount: 12.00, status: 'PENDING', createdAt: new Date(Date.now() - 3600000).toISOString(), correlationId: 'corr_124' },
          { id: 'ord_3', customerId: 'cust_C', totalAmount: 120.00, status: 'PREPARING', createdAt: new Date(Date.now() - 7200000).toISOString(), correlationId: 'corr_125' },
        ]);
        setData(orders as OrderFeedItem[]);
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
