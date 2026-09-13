"use client";

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, toPersianDigits } from '../../../shared/utils/formatters';
import { getMenuItems } from '@/app/actions/menu';
import { createOrder } from '@/app/actions/order';
import { getPrinters, printReceipt } from '@/app/actions/printer';
import { getSettings } from '@/app/actions/settings';
import { getCustomers } from '@/app/actions/crm';

interface MenuItem {
  id: string;
  title: string;
  price: number;
  category: string;
  subCategory: string | null;
  imageUrl: string | null;
}

const MAIN_CATEGORIES = ['همه', 'ایرانی', 'فرنگی'];

interface CartItem {
  menuItemId: string;
  title: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderMessage, setLastOrderMessage] = useState<string | null>(null);
  
  const [printers, setPrinters] = useState<any[]>([]);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [activeMainCategory, setActiveMainCategory] = useState('همه');
  const [activeSubCategory, setActiveSubCategory] = useState('همه');

  const [taxPercentage, setTaxPercentage] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  useEffect(() => {
    fetchMenu();
    fetchPrinters();
    fetchSettings();
    fetchCustomers();
  }, []);

  const fetchSettings = async () => {
    const res = await getSettings();
    if (res.success && res.settings) {
      setTaxPercentage(res.settings.taxPercentage);
      setPackagingCost(res.settings.packagingCost);
    }
  };

  const fetchCustomers = async () => {
    const res = await getCustomers();
    if (res.success && res.customers) {
      setCustomers(res.customers);
    }
  };

  const fetchPrinters = async () => {
    const res = await getPrinters();
    if (res.success && res.printers) {
      const activePrinters = res.printers.filter((p: any) => p.isActive);
      setPrinters(activePrinters);
      if (activePrinters.length > 0) {
        setSelectedPrinterId(activePrinters[0].id);
      }
    }
  };

  const fetchMenu = async () => {
    setIsLoading(true);
    const data = await getMenuItems();
    setMenu(data as MenuItem[]);
    setIsLoading(false);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => 
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, title: item.title, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  // These figures are only for on-screen display before checkout. The amount
  // actually charged/recorded is always recomputed on the server from the
  // real menu prices, so a tampered client can't place an order at a fake price.
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = Math.round((subtotal * taxPercentage) / 100);
  const total = cart.length > 0 ? subtotal + taxAmount + packagingCost : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setLastOrderMessage(null);

    try {
      const payload = cart.map(c => ({
        menuItemId: c.menuItemId,
        quantity: c.quantity,
      }));

      const res = await createOrder(payload, selectedCustomerId || undefined);
      
      if (res.success && res.order) {
        setCart([]);
        setSelectedCustomerId('');
        fetchCustomers();
        setLastOrderMessage(`سفارش ${res.order.orderNumber} با موفقیت ثبت شد! مبلغ کل: ${formatCurrency(res.order.totalAmount)}`);
        
        // Open printer modal
        setCompletedOrderId(res.order.id);
        setIsPrinterModalOpen(true);
      } else {
        setLastOrderMessage(`خطا در ثبت سفارش: ${res.error}`);
      }
      
      setTimeout(() => setLastOrderMessage(null), 5000);
    } catch (error: any) {
      setLastOrderMessage(`خطا سیستم: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute available subcategories based on active main category
  const availableSubCategories = useMemo(() => {
    const subs = menu
      .filter(item => activeMainCategory === 'همه' || item.category === activeMainCategory)
      .map(item => item.subCategory)
      .filter(Boolean) as string[];
      
    return ['همه', ...Array.from(new Set(subs))];
  }, [menu, activeMainCategory]);

  const handleMainCategoryChange = (cat: string) => {
    setActiveMainCategory(cat);
    setActiveSubCategory('همه'); // Reset subcategory when main category changes
  };

  const filteredMenu = menu.filter(item => {
    const matchMain = activeMainCategory === 'همه' || item.category === activeMainCategory;
    const matchSub = activeSubCategory === 'همه' || item.subCategory === activeSubCategory;
    return matchMain && matchSub;
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Menu Grid */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col min-h-0">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 shrink-0">منوی رستوران</h2>
        
        <div className="flex flex-col gap-3 mb-6 shrink-0">
          {/* Main Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {MAIN_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => handleMainCategoryChange(category)}
                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  activeMainCategory === category 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sub Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {availableSubCategories.map(subCategory => (
              <button
                key={subCategory}
                onClick={() => setActiveSubCategory(subCategory)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSubCategory === subCategory 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {subCategory}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {isLoading ? (
             <div className="h-full flex items-center justify-center">
               <span className="text-gray-500 font-bold animate-pulse text-lg">درحال بارگذاری منو...</span>
             </div>
          ) : filteredMenu.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
               <span className="text-4xl">🍽️</span>
               <span>محصولی در این دسته‌بندی یافت نشد.</span>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
              {filteredMenu.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all group flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                    <img 
                      src={item.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{item.title}</h3>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-sm whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                        {item.category} {item.subCategory ? `/ ${item.subCategory}` : ''}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-6 w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      افزودن به سفارش
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart */}
      <div className="w-96 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">سفارش جاری</h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              برای افزودن به سفارش، اقلام را انتخاب کنید
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <div>
                    <div className="font-bold text-sm text-gray-800 line-clamp-1">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {toPersianDigits(item.quantity)} عدد × {formatCurrency(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-sm">
                      {formatCurrency(item.quantity * item.price)}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">مشتری (اختیاری)</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            >
              <option value="">بدون مشتری</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-sm border-t border-gray-200 pt-3">
            <div className="flex justify-between text-gray-600">
              <span>جمع اقلام:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxPercentage > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>مالیات ({toPersianDigits(taxPercentage)}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {packagingCost > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>هزینه بسته‌بندی:</span>
                <span>{formatCurrency(packagingCost)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-lg font-black text-gray-900 border-t border-gray-200 pt-3">
            <span>مبلغ کل:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-sm ${
              cart.length === 0 || isSubmitting 
                ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none' 
                : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
            }`}
          >
            {isSubmitting ? 'در حال پردازش...' : 'ثبت سفارش'}
          </button>

          {lastOrderMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${lastOrderMessage.includes('خطا') ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-100 text-green-700'}`}>
              {lastOrderMessage}
            </div>
          )}
        </div>
      </div>

      {/* -------------------- Printer Selection Modal -------------------- */}
      {isPrinterModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">چاپ فیش سفارش</h2>
              <button 
                onClick={() => setIsPrinterModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-2">سفارش ثبت شد. آیا می‌خواهید فیش را چاپ کنید؟</p>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">انتخاب پرینتر</label>
                {printers.length > 0 ? (
                  <select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-sans"
                  >
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-red-500 text-sm py-2">هیچ پرینتر فعالی یافت نشد.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsPrinterModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isPrinting}
              >
                لغو
              </button>
              <button 
                onClick={async () => {
                  if (!completedOrderId || !selectedPrinterId) return;
                  setIsPrinting(true);
                  const res = await printReceipt(completedOrderId, selectedPrinterId);
                  setIsPrinting(false);
                  if (res.success) {
                    setIsPrinterModalOpen(false);
                  } else {
                    alert(res.error || 'خطا در چاپ');
                  }
                }}
                disabled={isPrinting || printers.length === 0}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPrinting ? 'در حال چاپ...' : 'چاپ فیش'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
