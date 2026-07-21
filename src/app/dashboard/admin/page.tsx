"use client";

import { useState, useEffect, useCallback } from 'react';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '@/app/actions/menu';
import { getUsers, createUser, deleteUser } from '@/app/actions/user';
import { getPrinters, createPrinter, updatePrinter, deletePrinter } from '@/app/actions/printer';
import { Role, PrinterType, PrinterConnectionType } from '@prisma/client';

interface MenuItem {
  id: string;
  title: string;
  price: number;
  category: string;
  subCategory: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  ingredients?: string | null;
}

interface UserData {
  id: string;
  name: string;
  username: string;
  roles: Role[];
  createdAt: Date;
}

interface PrinterData {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  ipAddress?: string;
  port?: number;
  path?: string;
  type: PrinterType;
  isActive: boolean;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'users' | 'printers'>('menu');
  
  // --- Menu Management State ---
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [menuFormData, setMenuFormData] = useState<Partial<MenuItem>>({
    title: '', price: 0, category: 'غذا', subCategory: '', imageUrl: '', isAvailable: true, ingredients: ''
  });

  // --- Users Management State ---
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<{name: string, username: string, password: string, roles: Role[]}>({
    name: '', username: '', password: '', roles: ['CASHIER']
  });
  const [userError, setUserError] = useState('');

  // --- Printers Management State ---
  const [printers, setPrinters] = useState<PrinterData[]>([]);
  const [localPrinters, setLocalPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterData | null>(null);
  const [printerFormData, setPrinterFormData] = useState<Partial<PrinterData>>({
    name: '', connectionType: 'NETWORK', ipAddress: '', port: 9100, path: '', type: 'CASHIER', isActive: true
  });

  // --- General Settings State ---
  const [settings, setSettings] = useState({
    taxPercentage: 10,
    packagingCost: 5000,
    restaurantName: 'رستوران نمونه سیستم‌عامل',
    contactNumber: '۰۲۱-۸۸۸۸۸۸۸۸',
    footerMessage: 'از خرید شما متشکریم! به امید دیدار مجدد.'
  });
  const [showSaveAlert, setShowSaveAlert] = useState(false);

  // Load menu items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoadingMenu(true);
    const data = await getMenuItems();
    setItems(data as MenuItem[]);
    setIsLoadingMenu(false);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    const res = await getUsers();
    if (res.success && res.users) {
      setUsers(res.users.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) })));
    }
    setIsLoadingUsers(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, fetchUsers, users.length]);

  const fetchPrinters = useCallback(async () => {
    setIsLoadingPrinters(true);
    const res = await getPrinters();
    if (res.success && res.printers) {
      setPrinters(res.printers as PrinterData[]);
    }
    
    // Also fetch local windows printers for the dropdown
    try {
      const localRes = await fetch('/api/printers/local');
      const localData = await localRes.json();
      if (localData.success && localData.printers) {
        setLocalPrinters(localData.printers);
      }
    } catch (e) {
      console.error('Failed to fetch local printers:', e);
    }
    
    setIsLoadingPrinters(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'printers' && printers.length === 0) {
      fetchPrinters();
    }
  }, [activeTab, fetchPrinters, printers.length]);

  // --- Formatters ---
  const toPersianDigits = (num: number | string) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return toPersianDigits(formatted);
  };

  // --- Menu Handlers ---
  const handleDeleteMenu = async (id: string) => {
    if (window.confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      const res = await deleteMenuItem(id);
      if (res.success) {
        setItems(items.filter(item => item.id !== id));
      } else {
        alert('خطا در حذف محصول!');
      }
    }
  };

  const handleEditMenu = (item: MenuItem) => {
    setEditingItem(item);
    setMenuFormData(item);
    setIsMenuModalOpen(true);
  };

  const handleAddNewItem = () => {
    setEditingItem(null);
    setMenuFormData({ title: '', price: 0, category: 'غذا', subCategory: '', imageUrl: '', isAvailable: true, ingredients: '' });
    setIsMenuModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });
      const result = await res.json();
      if (result.success) {
        setMenuFormData(prev => ({ ...prev, imageUrl: result.url }));
      } else {
        alert(result.error || 'خطا در آپلود تصویر');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در برقراری ارتباط برای آپلود تصویر');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!menuFormData.title || !menuFormData.price || !menuFormData.subCategory) {
      alert('لطفاً تمامی فیلدهای ضروری را پر کنید.');
      return;
    }

    if (editingItem) {
      const res = await updateMenuItem(editingItem.id, {
        title: menuFormData.title,
        price: menuFormData.price,
        category: menuFormData.category || 'غذا',
        subCategory: menuFormData.subCategory || '',
        imageUrl: menuFormData.imageUrl || '',
        isAvailable: menuFormData.isAvailable ?? true,
        ingredients: menuFormData.ingredients || ''
      });
      if (res.success && res.item) {
        setItems(items.map(item => item.id === editingItem.id ? res.item as MenuItem : item));
      }
    } else {
      const res = await createMenuItem({
        title: menuFormData.title,
        price: menuFormData.price,
        category: menuFormData.category || 'غذا',
        subCategory: menuFormData.subCategory || '',
        imageUrl: menuFormData.imageUrl || '',
        isAvailable: menuFormData.isAvailable ?? true,
        ingredients: menuFormData.ingredients || ''
      });
      if (res.success && res.item) {
        setItems([res.item as MenuItem, ...items]);
      }
    }
    setIsMenuModalOpen(false);
  };

  // --- User Handlers ---
  const translateRole = (role: Role) => {
    switch (role) {
      case 'ADMIN': return 'مدیر سیستم';
      case 'CASHIER': return 'صندوقدار';
      case 'CHEF': return 'سرآشپز';
      case 'ACCOUNTANT': return 'حسابدار';
      case 'INVENTORY_MANAGER': return 'انباردار';
      default: return role;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CASHIER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHEF': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ACCOUNTANT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'INVENTORY_MANAGER': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
      const res = await deleteUser(id);
      if (res.success) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert(res.error || 'خطا در حذف کاربر!');
      }
    }
  };

  const handleSaveUser = async () => {
    setUserError('');
    if (!userFormData.name || !userFormData.username || !userFormData.password) {
      setUserError('پر کردن نام، نام کاربری و رمز عبور الزامی است.');
      return;
    }

    const res = await createUser(userFormData);
    if (res.success && res.user) {
      setUsers([...users, res.user as any]);
      setIsUserModalOpen(false);
      setUserFormData({ name: '', username: '', password: '', roles: ['CASHIER'] });
    } else {
      setUserError(res.error || 'خطا در ساخت کاربر');
    }
  };

  // --- Printer Handlers ---
  const handleAddNewPrinter = () => {
    setEditingPrinter(null);
    setPrinterFormData({ 
      name: '', connectionType: 'NETWORK', ipAddress: '', port: 9100, 
      path: '', 
      type: 'CASHIER', isActive: true 
    });
    setIsPrinterModalOpen(true);
  };

  const handleEditPrinter = (printer: PrinterData) => {
    setEditingPrinter(printer);
    setPrinterFormData(printer);
    setIsPrinterModalOpen(true);
  };

  const handleDeletePrinter = async (id: string) => {
    if (window.confirm('آیا از حذف این پرینتر اطمینان دارید؟')) {
      const res = await deletePrinter(id);
      if (res.success) {
        setPrinters(printers.filter(p => p.id !== id));
      } else {
        alert(res.error || 'خطا در حذف پرینتر');
      }
    }
  };

  const handleSavePrinter = async () => {
    if (!printerFormData.name || !printerFormData.type || !printerFormData.connectionType) {
      alert('لطفا مقادیر ضروری پرینتر را وارد کنید');
      return;
    }
    if (printerFormData.connectionType === 'NETWORK' && (!printerFormData.ipAddress || !printerFormData.port)) {
      alert('لطفاً آدرس IP و پورت پرینتر شبکه را وارد کنید');
      return;
    }
    if (printerFormData.connectionType === 'USB' && !printerFormData.path) {
      alert('لطفاً نام یا مسیر پرینتر USB را وارد کنید');
      return;
    }
    
    const dataToSend = printerFormData as any;
    
    if (editingPrinter) {
      const res = await updatePrinter(editingPrinter.id, dataToSend);
      if (res.success && res.printer) {
        setPrinters(printers.map(p => p.id === editingPrinter.id ? (res.printer as PrinterData) : p));
        setIsPrinterModalOpen(false);
      }
    } else {
      const res = await createPrinter(dataToSend);
      if (res.success && res.printer) {
        setPrinters([res.printer as PrinterData, ...printers]);
        setIsPrinterModalOpen(false);
      }
    }
  };

  const togglePrinterStatus = async (printer: PrinterData) => {
    const res = await updatePrinter(printer.id, { isActive: !printer.isActive });
    if (res.success && res.printer) {
      setPrinters(printers.map(p => p.id === printer.id ? (res.printer as PrinterData) : p));
    }
  };

  // --- Settings Handlers ---
  const handleSaveSettings = () => {
    setShowSaveAlert(true);
    setTimeout(() => setShowSaveAlert(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">پنل مدیریت سیستم</h1>
          <p className="text-gray-500 mt-1 mb-6 text-sm">پیکربندی کلی سیستم، منو و پرسنل</p>
          
          <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'menu' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🍔 مدیریت منو
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'users' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 مدیریت پرسنل
            </button>
            <button
              onClick={() => setActiveTab('printers')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'printers' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🖨️ تنظیمات چاپگرها
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'settings' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ تنظیمات عمومی
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- MENU MANAGEMENT TAB -------------------- */}
      {activeTab === 'menu' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">لیست محصولات</h2>
            <button 
              onClick={handleAddNewItem}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
            >
              <span>➕</span> افزودن آیتم جدید
            </button>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
            {isLoadingMenu ? (
               <div className="flex justify-center items-center h-[300px]">
                 <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات از سرور...</span>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">تصویر</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام محصول</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">دسته‌بندی اصلی</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">زیردسته</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-left">قیمت (تومان)</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.title} className="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-200" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{item.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${item.category === 'ایرانی' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{item.subCategory || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <span className="text-base font-bold text-gray-900">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditMenu(item)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-blue-100">
                              ویرایش
                            </button>
                            <button onClick={() => handleDeleteMenu(item.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-red-100">
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- USERS MANAGEMENT TAB -------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">مدیریت پرسنل و دسترسی‌ها</h2>
              <p className="text-xs text-gray-500 mt-1">تعریف اکانت صندوقدار، سرآشپز و مدیر جدید</p>
            </div>
            <button 
              onClick={() => setIsUserModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
            >
              <span>➕</span> تعریف پرسنل جدید
            </button>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
            {isLoadingUsers ? (
               <div className="flex justify-center items-center h-[300px]">
                 <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات از سرور...</span>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام و نام خانوادگی</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام کاربری</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">نقش سیستمی</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                              {user.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono tracking-widest text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{user.username}</span>
                        </td>
                        <td className="px-6 py-4 text-center max-w-[200px]">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {user.roles.map(r => (
                              <span key={r} className={`px-2 py-1 inline-flex text-[10px] leading-4 font-bold rounded-md border ${getRoleBadge(r)}`}>
                                {translateRole(r)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => handleDeleteUser(user.id)} 
                            className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-red-100"
                          >
                            حذف دسترسی
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- PRINTERS MANAGEMENT TAB -------------------- */}
      {activeTab === 'printers' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">مدیریت فیش پرینترها</h2>
              <p className="text-xs text-gray-500 mt-1">پیکربندی پرینترهای صندوق و آشپزخانه در شبکه</p>
            </div>
            <button 
              onClick={handleAddNewPrinter}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
            >
              <span>➕</span> افزودن پرینتر جدید
            </button>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
            {isLoadingPrinters ? (
               <div className="flex justify-center items-center h-[300px]">
                 <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات از سرور...</span>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام پرینتر</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نوع کاربرد</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-left">اتصال</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">وضعیت</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {printers.map((printer) => (
                      <tr key={printer.id} className={`hover:bg-gray-50/50 transition-colors ${!printer.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900">{printer.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${printer.type === 'CASHIER' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                            {printer.type === 'CASHIER' ? 'صندوق' : 'آشپزخانه'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          {printer.connectionType === 'NETWORK' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">NETWORK</span>
                              <span className="text-sm font-mono text-gray-600">{printer.ipAddress}:{printer.port}</span>
                            </div>
                          ) : printer.connectionType === 'USB' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">USB</span>
                              <span className="text-sm font-mono text-gray-600">{printer.path}</span>
                            </div>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">{printer.connectionType}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => togglePrinterStatus(printer)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${printer.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                          >
                            {printer.isActive ? 'فعال' : 'غیرفعال'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditPrinter(printer)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-blue-100">ویرایش</button>
                            <button onClick={() => handleDeletePrinter(printer.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-red-100">حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {printers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">هیچ پرینتری ثبت نشده است.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- GENERAL SETTINGS TAB -------------------- */}
      {activeTab === 'settings' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {showSaveAlert && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="text-xl">✅</span>
              <div>
                <h4 className="font-bold text-sm">تغییرات با موفقیت ذخیره شد</h4>
                <p className="text-xs text-green-600 mt-0.5">تنظیمات جدید در سراسر سیستم اعمال شدند.</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-6 md:p-8 space-y-10">
              
              {/* Section 1: Financial Settings */}
              <section>
                <div className="mb-5 border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>💳</span> تنظیمات مالی
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">مدیریت مالیات بر ارزش افزوده و هزینه‌های جانبی سفارش</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">درصد مالیات (Tax %)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.taxPercentage}
                        onChange={e => setSettings({...settings, taxPercentage: parseInt(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans pl-10"
                        dir="ltr"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">هزینه بسته‌بندی (تومان)</label>
                    <input 
                      type="number" 
                      value={settings.packagingCost}
                      onChange={e => setSettings({...settings, packagingCost: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans"
                      dir="ltr"
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Invoice Settings */}
              <section>
                <div className="mb-5 border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>🧾</span> تنظیمات فاکتور و رسید
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">اطلاعاتی که در فیش‌های چاپی مشتریان نمایش داده می‌شود</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نام رستوران</label>
                    <input 
                      type="text" 
                      value={settings.restaurantName}
                      onChange={e => setSettings({...settings, restaurantName: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">شماره تماس (پشتیبانی)</label>
                    <input 
                      type="text" 
                      value={settings.contactNumber}
                      onChange={e => setSettings({...settings, contactNumber: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans"
                      dir="ltr"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">پیام پایانی فاکتور</label>
                    <textarea 
                      value={settings.footerMessage}
                      onChange={e => setSettings({...settings, footerMessage: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </section>

            </div>
            
            <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
              <button 
                onClick={handleSaveSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span>💾</span> ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL (For Menu Tab) -------------------- */}
      {isMenuModalOpen && activeTab === 'menu' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingItem ? 'ویرایش محصول' : 'افزودن محصول جدید'}
              </h2>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام محصول <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={menuFormData.title || ''} 
                  onChange={e => setMenuFormData({...menuFormData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-sans"
                  placeholder="مثال: پیتزا رست‌بیف"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">قیمت (تومان) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  value={menuFormData.price || ''} 
                  onChange={e => setMenuFormData({...menuFormData, price: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-left font-sans"
                  placeholder="250000"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">تصویر محصول <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-4">
                    {menuFormData.imageUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-200 shrink-0">
                        <img src={menuFormData.imageUrl} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setMenuFormData({...menuFormData, imageUrl: ''})}
                          className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-50 transition text-xs"
                          title="حذف تصویر"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                        <span className="text-gray-400 text-xl">🖼️</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <label className="flex items-center justify-center w-full px-4 py-3 bg-white border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm font-sans text-sm text-gray-600">
                        <span className="font-bold flex items-center gap-2">
                          {isUploadingImage ? (
                             <span className="animate-pulse">در حال آپلود...</span>
                          ) : (
                             <><span>📁</span> انتخاب تصویر از سیستم</>
                          )}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                        />
                      </label>
                      <p className="text-xs text-gray-400 mt-2">فرمت‌های مجاز: JPG, PNG, WEBP (حداکثر ۲ مگابایت)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">دسته‌بندی اصلی</label>
                  <select 
                    value={menuFormData.category || ''} 
                    onChange={e => setMenuFormData({...menuFormData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white font-sans"
                  >
                    <option value="ایرانی">ایرانی</option>
                    <option value="فرنگی">فرنگی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">زیردسته <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={menuFormData.subCategory || ''} 
                    onChange={e => setMenuFormData({...menuFormData, subCategory: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-sans"
                    placeholder="مثال: پیتزا و پاستا"
                  />
                </div>
                
                <div className="col-span-2 mt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">مواد تشکیل دهنده (اختیاری)</label>
                  <textarea 
                    value={menuFormData.ingredients || ''} 
                    onChange={e => setMenuFormData({...menuFormData, ingredients: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none font-sans"
                    rows={2}
                    placeholder="مثال: قارچ، گوشت چرخ‌کرده، پنیر پیتزا"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button 
                onClick={() => setIsMenuModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleSaveMenu}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                {editingItem ? 'ذخیره تغییرات' : 'افزودن محصول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL (For Users Tab) -------------------- */}
      {isUserModalOpen && activeTab === 'users' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900">
                تعریف پرسنل جدید
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              {userError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100">
                  ⚠️ {userError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={userFormData.name} 
                  onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-sans"
                  placeholder="مثال: علی محمدی"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام کاربری <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={userFormData.username} 
                  onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-sans"
                  placeholder="username"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">رمز عبور <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={userFormData.password} 
                  onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-sans tracking-widest"
                  placeholder="••••"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">سطوح دسترسی (Roles) <span className="text-red-500">*</span></label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white">
                  {(['ADMIN', 'CASHIER', 'CHEF', 'ACCOUNTANT', 'INVENTORY_MANAGER'] as Role[]).map((r) => (
                    <label key={r} className="flex items-center gap-3 p-2 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-indigo-100">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        checked={userFormData.roles.includes(r)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserFormData({ ...userFormData, roles: [...userFormData.roles, r] });
                          } else {
                            setUserFormData({ ...userFormData, roles: userFormData.roles.filter(role => role !== r) });
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{translateRole(r)}</span>
                        <span className="text-xs text-gray-500 font-mono">{r}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                ثبت کاربر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL (For Printers Tab) -------------------- */}
      {isPrinterModalOpen && activeTab === 'printers' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingPrinter ? 'ویرایش پرینتر' : 'تعریف پرینتر جدید'}
              </h2>
              <button onClick={() => setIsPrinterModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام پرینتر <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={printerFormData.name} 
                  onChange={e => setPrinterFormData({...printerFormData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-sans"
                  placeholder="مثال: پرینتر آشپزخانه گرم"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">نوع کاربرد <span className="text-red-500">*</span></label>
                  <select 
                    value={printerFormData.type} 
                    onChange={e => setPrinterFormData({...printerFormData, type: e.target.value as PrinterType})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white font-sans"
                  >
                    <option value="CASHIER">صندوق (فیش مشتری)</option>
                    <option value="KITCHEN">آشپزخانه (سفارش آماده‌سازی)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">نوع اتصال <span className="text-red-500">*</span></label>
                  <select 
                    value={printerFormData.connectionType} 
                    onChange={e => setPrinterFormData({...printerFormData, connectionType: e.target.value as PrinterConnectionType})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white font-sans"
                  >
                    <option value="NETWORK">شبکه (LAN / WiFi)</option>
                    <option value="USB">کابل USB / درگاه</option>
                  </select>
                </div>
              </div>
              
              {printerFormData.connectionType === 'NETWORK' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">آدرس IP <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={printerFormData.ipAddress || ''} 
                      onChange={e => setPrinterFormData({...printerFormData, ipAddress: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-sans"
                      placeholder="192.168.1.100"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">پورت <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      value={printerFormData.port || 9100} 
                      onChange={e => setPrinterFormData({...printerFormData, port: parseInt(e.target.value) || 9100})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-sans"
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">نام پرینتر (در ویندوز) <span className="text-red-500">*</span></label>
                  {localPrinters.length > 0 ? (
                    <select 
                      value={printerFormData.path || ''} 
                      onChange={e => setPrinterFormData({...printerFormData, path: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white text-left font-sans"
                      dir="ltr"
                    >
                      <option value="" disabled>انتخاب کنید...</option>
                      {localPrinters.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={printerFormData.path || ''} 
                      onChange={e => setPrinterFormData({...printerFormData, path: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-left font-sans"
                      placeholder="e.g. POS-80 or COM3"
                      dir="ltr"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">پرینتر مورد نظر را از لیست پرینترهای نصب‌شده انتخاب کنید.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsPrinterModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleSavePrinter}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                ذخیره پرینتر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
