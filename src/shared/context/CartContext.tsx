"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartLine {
  menuItemId: string;
  title: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  lines: CartLine[];
  addItem: (item: { id: string; title: string; price: number }) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = 'restaurant_online_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLines(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const persist = (next: CartLine[]) => {
    setLines(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addItem: CartContextType['addItem'] = (item) => {
    const existing = lines.find((l) => l.menuItemId === item.id);
    if (existing) {
      persist(lines.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      persist([...lines, { menuItemId: item.id, title: item.title, price: item.price, quantity: 1 }]);
    }
  };

  const removeItem = (menuItemId: string) => {
    persist(lines.filter((l) => l.menuItemId !== menuItemId));
  };

  const setQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(menuItemId);
    persist(lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l)));
  };

  const clear = () => persist([]);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, addItem, removeItem, setQuantity, clear, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
