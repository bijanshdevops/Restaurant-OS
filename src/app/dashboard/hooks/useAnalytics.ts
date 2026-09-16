"use client";

import { useState, useEffect } from 'react';
import { getDashboardAnalytics } from '@/app/actions/dashboard';

export interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  revenueBySegment: Record<string, number>;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await getDashboardAnalytics();
        if (!res.success || !res.data) {
          setError(res.error || 'خطای نامشخص');
          return;
        }
        setData(res.data);
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
