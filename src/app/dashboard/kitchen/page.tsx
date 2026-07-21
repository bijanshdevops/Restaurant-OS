"use client";

import { useState, useEffect, useCallback } from 'react';
import { getActiveOrders, updateOrderStatus } from '@/app/actions/order';
import { OrderStatus } from '@prisma/client';

// Map Prisma types to component state types
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  timestamp: Date;
  items: OrderItem[];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setTick] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch orders from the server
  const fetchOrders = useCallback(async () => {
    const res = await getActiveOrders();
    if (res.success && res.orders) {
      const mappedOrders: Order[] = res.orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status as OrderStatus,
        timestamp: new Date(o.createdAt),
        items: o.items.map((item: any) => ({
          id: item.id,
          name: item.menuItem.title,
          quantity: item.quantity,
        })),
      }));
      setOrders(mappedOrders);
    }
    setIsLoading(false);
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchOrders();
    
    // Poll every 10 seconds for new orders
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 10000);

    // Tick every minute to update the "elapsed time" text
    const tickInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [fetchOrders]);

  const moveOrder = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic UI update
    if (newStatus === 'COMPLETED') {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    
    // Server update
    await updateOrderStatus(orderId, newStatus);
  };

  const getElapsedTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff <= 0) return 'همین الان';
    return `${toPersianDigits(diff)} دقیقه پیش`;
  };

  const toPersianDigits = (num: number) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
  };

  const renderColumn = (status: OrderStatus, title: string, colorClass: string, bgHeaderClass: string) => {
    const columnOrders = orders.filter(o => o.status === status).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return (
      <div className="flex flex-col bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
        <div className={`${bgHeaderClass} px-6 py-4 flex justify-between items-center`}>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
            {toPersianDigits(columnOrders.length)} سفارش
          </span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-[60vh] max-h-[calc(100vh-12rem)] custom-scrollbar relative">
          {isLoading && orders.length === 0 ? (
            <div className="text-gray-500 text-center py-10 animate-pulse">درحال بارگذاری...</div>
          ) : columnOrders.length === 0 ? (
            <div className="text-gray-600 text-center py-10 font-medium">سفارشی در این بخش نیست</div>
          ) : (
            columnOrders.map(order => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-4 border-l-4 shadow-md transition-all hover:bg-gray-750 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ borderLeftColor: colorClass }}>
                
                {/* Ticket Header */}
                <div className="flex justify-between items-start border-b border-gray-700 pb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">{order.orderNumber}</h3>
                    <p className="text-gray-400 text-sm mt-1 font-mono">{order.id.substring(0, 8)}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1
                    ${Math.floor((Date.now() - order.timestamp.getTime()) / 60000) > 15 && status !== 'READY' ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-gray-700 text-gray-300'}`}>
                    ⏱️ {getElapsedTime(order.timestamp)}
                  </div>
                </div>

                {/* Ticket Items */}
                <div className="space-y-2 flex-1">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-start py-1">
                      <div className="flex gap-3 items-center">
                        <span className="font-bold text-xl text-blue-400 w-8 text-left">{toPersianDigits(item.quantity)}x</span>
                        <span className="text-gray-100 text-lg font-medium">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-700 grid grid-cols-1 gap-2 mt-auto">
                  {status === 'PENDING' && (
                    <button onClick={() => moveOrder(order.id, 'PREPARING')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-lg transition-colors">
                      👨‍🍳 شروع پخت
                    </button>
                  )}
                  {status === 'PREPARING' && (
                    <button onClick={() => moveOrder(order.id, 'READY')} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg text-lg transition-colors">
                      ✅ آماده تحویل
                    </button>
                  )}
                  {status === 'READY' && (
                    <button onClick={() => moveOrder(order.id, 'COMPLETED')} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg text-lg transition-colors border border-gray-500">
                      🚚 تحویل داده شد
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 top-16 bg-gray-950 p-6 z-10 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <span>سیستم مدیریت آشپزخانه (KDS)</span>
          {isLoading && orders.length > 0 && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md animate-pulse border border-gray-700">درحال همگام‌سازی...</span>
          )}
        </h1>
        <div className="flex gap-4">
          <div className="bg-gray-900 text-gray-300 px-4 py-2 rounded-lg font-mono border border-gray-800 flex items-center gap-2 shadow-inner">
            <span className="text-green-400 animate-pulse">●</span>
            <span>آنلاین</span>
          </div>
          <div className="bg-gray-900 text-gray-300 px-4 py-2 rounded-lg font-mono border border-gray-800">
            {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 h-full">
        {renderColumn('PENDING', 'در انتظار پخت', '#ef4444', 'bg-red-600')}
        {renderColumn('PREPARING', 'در حال آماده‌سازی', '#eab308', 'bg-yellow-600')}
        {renderColumn('READY', 'آماده تحویل', '#22c55e', 'bg-green-600')}
      </div>
      
      {/* Quick custom scrollbar style injection for dark theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #111827;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}} />
    </div>
  );
}
