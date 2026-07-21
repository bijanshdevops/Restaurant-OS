"use client";

import { useState, useEffect, useCallback } from 'react';
import { getInventoryItems, createInventoryItem, restockInventoryItem, deleteInventoryItem } from '@/app/actions/inventory';

type Unit = 'کیلوگرم' | 'لیتر' | 'عدد' | 'بسته';
type Category = 'مواد خام' | 'بسته‌بندی' | 'نوشیدنی';

interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: Unit;
  currentStock: number;
  minStockLevel: number;
  lastRestocked: Date;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'مواد خام' as Category,
    unit: 'کیلوگرم' as Unit,
    currentStock: 0,
    minStockLevel: 0
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const res = await getInventoryItems();
    if (res.success && res.items) {
      setItems(res.items as unknown as InventoryItem[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const getStatus = (current: number, min: number) => {
    if (current === 0) return { label: 'ناموجود', color: 'bg-red-100 text-red-800 border-red-200 ring-red-500' };
    if (current <= min) return { label: 'رو به اتمام', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 ring-yellow-500' };
    return { label: 'موجود', color: 'bg-green-100 text-green-800 border-green-200 ring-green-500' };
  };

  const toPersianDigits = (num: number) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
  };

  const formatDate = (dateValue: Date | string) => {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(date);
  };

  const handleRestock = async (id: string, name: string) => {
    const amountStr = window.prompt(`مقدار شارژ برای "${name}" را به عدد وارد کنید:`);
    if (amountStr) {
      const amount = parseInt(amountStr.replace(/[۰-۹]/g, w => ['0','1','2','3','4','5','6','7','8','9']['۰۱۲۳۴۵۶۷۸۹'.indexOf(w)]));
      if (!isNaN(amount) && amount > 0) {
        
        // Optimistic UI update
        setItems(prev => prev.map(item => 
          item.id === id ? { 
            ...item, 
            currentStock: item.currentStock + amount, 
            lastRestocked: new Date() 
          } : item
        ));
        
        // Server Update
        const res = await restockInventoryItem(id, amount);
        if (!res.success) {
          alert('خطا در شارژ موجودی!');
          fetchItems(); // revert
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این کالا اطمینان دارید؟')) {
      const res = await deleteInventoryItem(id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        alert('خطا در حذف کالا!');
      }
    }
  };

  const handleAddNew = () => {
    setFormData({ name: '', category: 'مواد خام', unit: 'کیلوگرم', currentStock: 0, minStockLevel: 0 });
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name) {
      alert('لطفاً نام کالا را وارد کنید.');
      return;
    }

    const res = await createInventoryItem(formData);
    if (res.success && res.item) {
      setItems([{ ...res.item, lastRestocked: new Date(res.item.lastRestocked) } as unknown as InventoryItem, ...items]);
      setIsModalOpen(false);
    } else {
      alert('خطا در ثبت کالای جدید!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مدیریت انبار</h1>
          <p className="text-gray-500 mt-1">کنترل موجودی مواد اولیه و اقلام مصرفی</p>
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex-col items-center justify-center">
            <span className="text-xs text-gray-500">اقلام هشدار</span>
            <span className="text-xl font-bold text-yellow-600">
              {toPersianDigits(items.filter(i => i.currentStock > 0 && i.currentStock <= i.minStockLevel).length)}
            </span>
          </div>
          <div className="hidden md:flex bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex-col items-center justify-center">
            <span className="text-xs text-gray-500">اقلام ناموجود</span>
            <span className="text-xl font-bold text-red-600">
              {toPersianDigits(items.filter(i => i.currentStock === 0).length)}
            </span>
          </div>
          <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>➕</span> افزودن کالا
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات از سرور...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-50/80">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام کالا</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">دسته‌بندی</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">موجودی فعلی</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">حداقل مجاز</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">وضعیت</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">آخرین شارژ</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((item) => {
                  const status = getStatus(item.currentStock, item.minStockLevel);
                  const isCritical = item.currentStock <= item.minStockLevel;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-bold text-gray-900">{item.name}</div>
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-1" title={item.id}>{item.id.substring(0,8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className={`text-lg font-black ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
                          {toPersianDigits(item.currentStock)} <span className="text-xs text-gray-500 font-normal">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600 font-medium">
                          {toPersianDigits(item.minStockLevel)} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {formatDate(item.lastRestocked)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleRestock(item.id, item.name)}
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 font-bold text-xs"
                          >
                            شارژ
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 rounded-lg text-xs"
                            title="حذف کالا"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                      انبار خالی است. دکمه «افزودن کالا» را بزنید.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------------------- ADD ITEM MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">تعریف کالای جدید در انبار</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام کالا <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-sans"
                  placeholder="مثال: زعفران مثقالی"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">دسته‌بندی</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value as Category})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white font-sans"
                  >
                    <option value="مواد خام">مواد خام</option>
                    <option value="بسته‌بندی">بسته‌بندی</option>
                    <option value="نوشیدنی">نوشیدنی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">واحد اندازه‌گیری</label>
                  <select 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value as Unit})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white font-sans"
                  >
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="لیتر">لیتر</option>
                    <option value="عدد">عدد</option>
                    <option value="بسته">بسته</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">موجودی اولیه</label>
                  <input 
                    type="number" 
                    value={formData.currentStock || ''} 
                    onChange={e => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans"
                    dir="ltr"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">حداقل مجاز (نقطه سفارش)</label>
                  <input 
                    type="number" 
                    value={formData.minStockLevel || ''} 
                    onChange={e => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans"
                    dir="ltr"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleSaveItem}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                ثبت کالا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
