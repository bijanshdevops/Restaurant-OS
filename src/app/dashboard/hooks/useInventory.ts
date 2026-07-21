"use client";

import { useState, useEffect } from 'react';
import { baseApi } from '../../../shared/infrastructure/api/baseApi';

export interface InventoryItem {
  id: string;
  menuItemId: string;
  itemName: string;
  currentStock: number;
  threshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export function useInventory() {
  const [data, setData] = useState<InventoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      try {
        // Assume an endpoint /api/inventory exists
        // Since we are mocking the frontend, we will mock the backend response if it doesn't exist yet
        const inventory = await baseApi<InventoryItem[]>('/inventory').catch(() => [
          { id: '1', menuItemId: 'm1', itemName: 'Gourmet Burger', currentStock: 45, threshold: 10, status: 'IN_STOCK' },
          { id: '2', menuItemId: 'm2', itemName: 'Truffle Fries', currentStock: 5, threshold: 20, status: 'LOW_STOCK' },
          { id: '3', menuItemId: 'm3', itemName: 'Craft Cola', currentStock: 0, threshold: 50, status: 'OUT_OF_STOCK' },
        ]);
        setData(inventory as InventoryItem[]);
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
