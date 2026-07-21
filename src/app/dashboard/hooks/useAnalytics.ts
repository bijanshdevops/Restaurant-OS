"use client";

import { useState, useEffect } from 'react';
import { baseApi } from '../../../shared/infrastructure/api/baseApi';

export interface TenantStatsData {
  tenantId: string;
  totalOrders: number;
  totalRevenue: number;
  ordersBySegment: Record<string, number>;
  revenueBySegment: Record<string, number>;
  lastUpdated: string;
}

export function useAnalytics() {
  const [data, setData] = useState<TenantStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const stats = await baseApi<TenantStatsData>('/analytics/stats');
        setData(stats);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { data, isLoading, error };
}
