"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicMenuItems } from '@/app/actions/menu';
import { useCart } from '@/shared/context/CartContext';
import { useCustomerAuth } from '@/shared/context/CustomerAuthContext';
import { formatCurrency, toPersianDigits } from '@/shared/utils/formatters';

interface PublicMenuItem {
  id: string;
  title: string;
  category: string;
  subCategory: string | null;
  price: number;
  imageUrl: string | null;
}

export default function OnlineMenuPage() {
  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('همه');
  const { lines, addItem, setQuantity, subtotal } = useCart();
  const { customer, logout } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    getPublicMenuItems().then((items) => {
      setMenu(items as PublicMenuItem[]);
      setIsLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return ['همه', ...Array.from(set)];
  }, [menu]);

  const visibleItems = activeCategory === 'همه' ? menu : menu.filter((m) => m.category === activeCategory);

  const quantityOf = (id: string) => lines.find((l) => l.menuItemId === id)?.quantity || 0;
  const totalItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">OS</div>
            <span className="font-semibold text-lg text-gray-900">منوی آنلاین</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/order/profile')} className="text-sm text-gray-600 hover:text-blue-600 font-medium">
              {customer?.fullName}
            </button>
            <button onClick={logout} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg transition-colors">
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-4 whitespace-nowrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">درحال بارگذاری منو...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-32">
            {visibleItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                  <p className="text-blue-600 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                </div>
                {quantityOf(item.id) === 0 ? (
                  <button
                    onClick={() => addItem({ id: item.id, title: item.title, price: item.price })}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
                  >
                    افزودن
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setQuantity(item.id, quantityOf(item.id) - 1)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{toPersianDigits(quantityOf(item.id))}</span>
                    <button
                      onClick={() => setQuantity(item.id, quantityOf(item.id) + 1)}
                      className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalItemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">{toPersianDigits(totalItemCount)} قلم</p>
              <p className="font-black text-lg text-gray-900">{formatCurrency(subtotal)}</p>
            </div>
            <button
              onClick={() => router.push('/order/checkout')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-md transition-colors"
            >
              ادامه به تسویه‌حساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
