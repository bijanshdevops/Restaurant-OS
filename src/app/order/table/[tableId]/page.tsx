"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getPublicMenuItems } from '@/app/actions/menu';
import { getTableForOrder } from '@/app/actions/reservation';
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

interface TableInfo {
  id: string;
  number: number;
  branchName: string;
}

/**
 * فاز ۱۶: صفحه‌ی سفارشِ خودکارِ مشتری بعد از اسکنِ کد QR روی میز — معادلِ
 * منوی آنلاینِ عمومی (/order)، با این تفاوت که به یک میزِ مشخص (و شعبه‌ی
 * آن) متصل است. ورودِ مشتری (OTP) از قبل توسطِ OrderGate در layout.tsx
 * تضمین شده — نک. توضیحاتِ آنجا و CustomerAuthContext.login().
 */
export default function DineInQrMenuPage() {
  const params = useParams();
  const tableId = params.tableId as string;
  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [tableError, setTableError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('همه');
  const { lines, addItem, setQuantity, subtotal } = useCart();
  const { customer, logout } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    Promise.all([getPublicMenuItems(), getTableForOrder(tableId)]).then(([items, tableRes]) => {
      setMenu(items as PublicMenuItem[]);
      if (tableRes.success && tableRes.table) {
        setTable({ id: tableRes.table.id, number: tableRes.table.number, branchName: tableRes.table.branchName });
      } else {
        setTableError(tableRes.error || 'میز یافت نشد');
      }
      setIsLoading(false);
    });
  }, [tableId]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return ['همه', ...Array.from(set)];
  }, [menu]);

  const visibleItems = activeCategory === 'همه' ? menu : menu.filter((m) => m.category === activeCategory);

  const quantityOf = (id: string) => lines.find((l) => l.menuItemId === id)?.quantity || 0;
  const totalItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (!isLoading && tableError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans gap-4 p-4 text-center" dir="rtl">
        <p className="text-red-600 font-bold">{tableError}</p>
        <button onClick={() => router.push('/order')} className="text-blue-600 font-bold">
          رفتن به منوی آنلاینِ عمومی
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">OS</div>
            <div>
              <span className="font-semibold text-lg text-gray-900 block leading-tight">سفارش روی میز</span>
              {table && (
                <span className="text-xs text-gray-500 font-medium">
                  میز {toPersianDigits(table.number)} — {table.branchName}
                </span>
              )}
            </div>
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
              onClick={() => router.push(`/order/table/${tableId}/checkout`)}
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
