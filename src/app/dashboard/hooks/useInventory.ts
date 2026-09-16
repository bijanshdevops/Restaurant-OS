"use client";

import { useState, useEffect } from 'react';
import { getInventoryItems } from '@/app/actions/inventory';

export interface InventoryRow {
  id: string;
  itemName: string;
  currentStock: number;
  threshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export function useInventory() {
  const [data, setData] = useState<InventoryRow[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await getInventoryItems();
        if (!res.success || !res.items) {
          setError(res.error || 'خطای نامشخص');
          return;
        }
        const rows: InventoryRow[] = res.items.map((item) => ({
          id: item.id,
          itemName: item.name,
          currentStock: item.currentStock,
          threshold: item.minStockLevel,
          status:
            item.currentStock <= 0
              ? 'OUT_OF_STOCK'
              : item.currentStock <= item.minStockLevel
              ? 'LOW_STOCK'
              : 'IN_STOCK',
        }));
        setData(rows);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInventory();
  }, []);

  return { data, isLoading, error };
}
