"use client";

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, createMenuItemsBulk } from '@/app/actions/menu';
import { getUsers, createUser, deleteUser } from '@/app/actions/user';
import { getBranches } from '@/app/actions/branch';
import { getPrinters, createPrinter, updatePrinter, deletePrinter } from '@/app/actions/printer';
import { getMenuCostAnalysis, getMenuItemRecipe, saveMenuItemRecipe, updateInventoryItemCost } from '@/app/actions/costing';
import { getSubRecipes, getSubRecipeDetail, saveSubRecipe, deleteSubRecipe } from '@/app/actions/subRecipe';
import {
  getModifierGroups,
  saveModifierGroup,
  deleteModifierGroup,
  getMenuItemModifierGroups,
  setMenuItemModifierGroups,
} from '@/app/actions/modifiers';
import { getSettings, updateSettings } from '@/app/actions/settings';
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
  kitchenStation?: string | null;
}

interface UserData {
  id: string;
  name: string;
  username: string;
  roles: Role[];
  createdAt: Date;
  branchId?: string;
  branch?: { id: string; name: string } | null;
}

interface BranchOption {
  id: string;
  name: string;
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

interface CostAnalysisItem {
  id: string;
  title: string;
  category: string;
  price: number;
  cost: number;
  profit: number;
  marginPercent: number;
  ingredientCount: number;
}

interface InventoryItemOption {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface BulkRow {
  title: string;
  price: number;
  category: string;
  subCategory: string;
  imageUrl: string;
  ingredients: string;
  error: string;
}

interface RecipeLine {
  /** دقیقاً یکی از inventoryItemId/subRecipeId باید پر باشد (فاز ۱۳). */
  inventoryItemId: string;
  subRecipeId: string;
  quantity: number;
  /** درصد بازده/عکسِ ضایعات — پیش‌فرض ۱۰۰ یعنی بدون ضایعات (فاز ۱۳). */
  yieldPercent: number;
}

interface SubRecipeOption {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface SubRecipeListRow {
  id: string;
  name: string;
  unit: string;
  notes: string;
  _count: { items: number };
}

interface SubRecipeLine {
  inventoryItemId: string;
  childSubRecipeId: string;
  quantity: number;
  yieldPercent: number;
}

interface ModifierRow {
  id?: string;
  name: string;
  priceDelta: number;
  recipeLines: { inventoryItemId: string; quantity: number }[];
}

interface ModifierGroupRow {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: {
    id: string;
    name: string;
    priceDelta: number;
    recipeItems: { inventoryItemId: string; quantity: number; inventoryItem: { name: string; unit: string } }[];
  }[];
  _count: { menuItems: number };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'users' | 'printers' | 'costing' | 'subrecipes' | 'modifiers'>('menu');
  
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
  const [userFormData, setUserFormData] = useState<{name: string, username: string, password: string, roles: Role[], branchId: string}>({
    name: '', username: '', password: '', roles: ['CASHIER'], branchId: ''
  });
  const [userError, setUserError] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);

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
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // --- Cost Analysis State ---
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisItem[]>([]);
  const [isLoadingCosting, setIsLoadingCosting] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeMenuItem, setRecipeMenuItem] = useState<CostAnalysisItem | null>(null);
  const [recipeInventoryItems, setRecipeInventoryItems] = useState<InventoryItemOption[]>([]);
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  // فاز ۱۳: فهرست زیرفرمول‌های قابل‌انتخاب (به‌عنوان ماده‌ی اولیه) + گروه‌های
  // مدیفایرِ اختصاص‌داده‌شده به همین آیتم منو — هر دو داخل همان مودالِ فرمول.
  const [recipeSubRecipeOptions, setRecipeSubRecipeOptions] = useState<SubRecipeOption[]>([]);
  const [recipeAllModifierGroups, setRecipeAllModifierGroups] = useState<ModifierGroupRow[]>([]);
  const [recipeSelectedModifierGroupIds, setRecipeSelectedModifierGroupIds] = useState<string[]>([]);
  const [isSavingRecipeModifierGroups, setIsSavingRecipeModifierGroups] = useState(false);

  // --- Sub-Recipes (فاز ۱۳) State ---
  const [subRecipeList, setSubRecipeList] = useState<SubRecipeListRow[]>([]);
  const [isLoadingSubRecipes, setIsLoadingSubRecipes] = useState(false);
  const [isSubRecipeModalOpen, setIsSubRecipeModalOpen] = useState(false);
  const [editingSubRecipeId, setEditingSubRecipeId] = useState<string | null>(null);
  const [subRecipeName, setSubRecipeName] = useState('');
  const [subRecipeUnit, setSubRecipeUnit] = useState('');
  const [subRecipeNotes, setSubRecipeNotes] = useState('');
  const [subRecipeLines, setSubRecipeLines] = useState<SubRecipeLine[]>([]);
  const [subRecipeInventoryOptions, setSubRecipeInventoryOptions] = useState<InventoryItemOption[]>([]);
  const [subRecipeOtherOptions, setSubRecipeOtherOptions] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingSubRecipeDetail, setIsLoadingSubRecipeDetail] = useState(false);
  const [isSavingSubRecipe, setIsSavingSubRecipe] = useState(false);
  const [subRecipeError, setSubRecipeError] = useState('');

  // --- Modifier Groups (فاز ۱۳) State ---
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupRow[]>([]);
  const [isLoadingModifierGroups, setIsLoadingModifierGroups] = useState(false);
  const [isModifierGroupModalOpen, setIsModifierGroupModalOpen] = useState(false);
  const [editingModifierGroupId, setEditingModifierGroupId] = useState<string | null>(null);
  const [modifierGroupName, setModifierGroupName] = useState('');
  const [modifierGroupMinSelect, setModifierGroupMinSelect] = useState(0);
  const [modifierGroupMaxSelect, setModifierGroupMaxSelect] = useState(1);
  const [modifierGroupModifiers, setModifierGroupModifiers] = useState<ModifierRow[]>([]);
  const [isSavingModifierGroup, setIsSavingModifierGroup] = useState(false);
  const [modifierGroupError, setModifierGroupError] = useState('');

  // --- Bulk Import State ---
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [isImportingBulk, setIsImportingBulk] = useState(false);

  // Load menu items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Load general settings on mount (this used to be pure client-side state
  // with no persistence at all: the "save" button just showed a success
  // message without ever writing anything to the server).
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      const res = await getSettings();
      if (res.success && res.settings) {
        setSettings({
          taxPercentage: res.settings.taxPercentage,
          packagingCost: res.settings.packagingCost,
          restaurantName: res.settings.restaurantName,
          contactNumber: res.settings.contactNumber,
          footerMessage: res.settings.footerMessage,
        });
      }
      setIsLoadingSettings(false);
    };
    loadSettings();
  }, []);

  const fetchItems = async () => {
    setIsLoadingMenu(true);
    const data = await getMenuItems();
    setItems(data as MenuItem[]);
    setIsLoadingMenu(false);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    const [usersRes, branchesRes] = await Promise.all([getUsers(), getBranches()]);
    if (usersRes.success && usersRes.users) {
      setUsers(usersRes.users.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) })));
    }
    if (branchesRes.success && branchesRes.branches) {
      setBranches(branchesRes.branches as unknown as BranchOption[]);
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

  const fetchCostAnalysis = useCallback(async () => {
    setIsLoadingCosting(true);
    const res = await getMenuCostAnalysis();
    if (res.success && res.items) {
      setCostAnalysis(res.items as CostAnalysisItem[]);
    }
    setIsLoadingCosting(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'costing' && costAnalysis.length === 0) {
      fetchCostAnalysis();
    }
  }, [activeTab, fetchCostAnalysis, costAnalysis.length]);

  useEffect(() => {
    if (activeTab === 'subrecipes' && subRecipeList.length === 0) {
      fetchSubRecipes();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'modifiers' && modifierGroups.length === 0) {
      fetchModifierGroups();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // --- Bulk Import Handlers ---
  const openBulkModal = () => {
    setBulkRows([]);
    setBulkFileName('');
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
    setBulkRows([]);
    setBulkFileName('');
  };

  const handleDownloadTemplate = () => {
    const wsData = [
      ['نام غذا', 'قیمت', 'دسته‌بندی', 'زیردسته', 'مواد اولیه', 'آدرس تصویر'],
      ['چلو کباب کوبیده', 250000, 'غذا', 'کباب', 'برنج، گوشت چرخ‌کرده، پیاز، زعفران', ''],
      ['نوشابه قوطی', 30000, 'نوشیدنی', 'سرد', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 36 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'منو');
    XLSX.writeFile(wb, 'نمونه-ورود-گروهی-منو.xlsx');
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const parsed: BulkRow[] = rows.map((row) => {
          const title = String(row['نام غذا'] ?? row['نام'] ?? row['نام محصول'] ?? '').trim();
          const priceRaw = row['قیمت'] ?? row['قیمت (تومان)'] ?? 0;
          const price = Number(String(priceRaw).replace(/[^0-9.]/g, '')) || 0;
          const category = String(row['دسته‌بندی'] ?? row['دسته بندی'] ?? '').trim() || 'غذا';
          const subCategory = String(row['زیردسته'] ?? '').trim();
          const ingredients = String(row['مواد اولیه'] ?? row['توضیحات'] ?? '').trim();
          const imageUrl = String(row['آدرس تصویر'] ?? row['تصویر'] ?? '').trim();

          let error = '';
          if (!title) error = 'نام غذا الزامی است';
          else if (!price || price <= 0) error = 'قیمت نامعتبر است';

          return { title, price, category, subCategory, imageUrl, ingredients, error };
        });

        setBulkRows(parsed);
      } catch (err) {
        console.error(err);
        alert('خطا در خواندن فایل. لطفاً از فرمت صحیح اکسل (xlsx) استفاده کنید.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkImport = async () => {
    const validRows = bulkRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      alert('هیچ ردیف معتبری برای وارد کردن وجود ندارد.');
      return;
    }

    setIsImportingBulk(true);
    const res = await createMenuItemsBulk(validRows.map((r) => ({
      title: r.title,
      price: r.price,
      category: r.category,
      subCategory: r.subCategory,
      imageUrl: r.imageUrl,
      ingredients: r.ingredients,
    })));
    setIsImportingBulk(false);

    if (res.success) {
      alert(`${toPersianDigits(res.count ?? 0)} آیتم با موفقیت به منو اضافه شد.`);
      closeBulkModal();
      fetchItems();
    } else {
      alert(res.error || 'خطا در وارد کردن گروهی آیتم‌ها');
    }
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
        ingredients: menuFormData.ingredients || '',
        kitchenStation: menuFormData.kitchenStation || ''
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
        ingredients: menuFormData.ingredients || '',
        kitchenStation: menuFormData.kitchenStation || ''
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

    const res = await createUser({ ...userFormData, branchId: userFormData.branchId || undefined });
    if (res.success && res.user) {
      setUsers([...users, res.user as any]);
      setIsUserModalOpen(false);
      setUserFormData({ name: '', username: '', password: '', roles: ['CASHIER'], branchId: '' });
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
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsError(null);
    const res = await updateSettings(settings);
    setIsSavingSettings(false);

    if (res.success) {
      setShowSaveAlert(true);
      setTimeout(() => setShowSaveAlert(false), 3000);
    } else {
      setSettingsError(res.error || 'خطا در ذخیره تنظیمات');
    }
  };

  // --- Cost Analysis / Recipe Handlers ---
  const openRecipeModal = async (item: CostAnalysisItem) => {
    setRecipeMenuItem(item);
    setIsRecipeModalOpen(true);
    setIsLoadingRecipe(true);
    const [res, modifierGroupsRes, assignedRes] = await Promise.all([
      getMenuItemRecipe(item.id),
      getModifierGroups(),
      getMenuItemModifierGroups(item.id),
    ]);
    if (res.success) {
      setRecipeInventoryItems((res.inventoryItems || []) as InventoryItemOption[]);
      setRecipeSubRecipeOptions((res.subRecipes || []) as SubRecipeOption[]);
      setRecipeLines(
        (res.recipeItems || []).map((ri: any) => ({
          inventoryItemId: ri.inventoryItemId || '',
          subRecipeId: ri.subRecipeId || '',
          quantity: ri.quantity,
          yieldPercent: ri.yieldPercent ?? 100,
        }))
      );
    }
    if (modifierGroupsRes.success) {
      setRecipeAllModifierGroups((modifierGroupsRes.groups || []) as ModifierGroupRow[]);
    }
    if (assignedRes.success) {
      setRecipeSelectedModifierGroupIds(assignedRes.modifierGroupIds || []);
    }
    setIsLoadingRecipe(false);
  };

  const closeRecipeModal = () => {
    setIsRecipeModalOpen(false);
    setRecipeMenuItem(null);
    setRecipeLines([]);
    setRecipeSubRecipeOptions([]);
    setRecipeAllModifierGroups([]);
    setRecipeSelectedModifierGroupIds([]);
  };

  const addRecipeLine = () => {
    setRecipeLines([...recipeLines, { inventoryItemId: '', subRecipeId: '', quantity: 0, yieldPercent: 100 }]);
  };

  const removeRecipeLine = (index: number) => {
    setRecipeLines(recipeLines.filter((_, i) => i !== index));
  };

  const updateRecipeLine = (
    index: number,
    field: 'inventoryItemId' | 'subRecipeId' | 'quantity' | 'yieldPercent',
    value: string | number
  ) => {
    setRecipeLines(recipeLines.map((line, i) => {
      if (i !== index) return line;
      const updated = { ...line, [field]: value } as RecipeLine;
      // انتخابِ یکی از «ماده‌ی اولیه» یا «زیرفرمول» باید دیگری را خالی کند —
      // هر ردیف دقیقاً یکی از این دو را دارد (فاز ۱۳).
      if (field === 'inventoryItemId' && value) updated.subRecipeId = '';
      if (field === 'subRecipeId' && value) updated.inventoryItemId = '';
      return updated;
    }));
  };

  const updateIngredientCostLocal = async (inventoryItemId: string, cost: number) => {
    setRecipeInventoryItems(recipeInventoryItems.map(inv => inv.id === inventoryItemId ? { ...inv, costPerUnit: cost } : inv));
    await updateInventoryItemCost(inventoryItemId, cost);
  };

  const computeRecipeCost = () => {
    return recipeLines.reduce((sum, line) => {
      const yieldFactor = (line.yieldPercent || 100) / 100;
      if (line.subRecipeId) {
        const sub = recipeSubRecipeOptions.find(s => s.id === line.subRecipeId);
        return sum + (sub ? (sub.costPerUnit * line.quantity) / yieldFactor : 0);
      }
      const inv = recipeInventoryItems.find(i => i.id === line.inventoryItemId);
      return sum + (inv ? (inv.costPerUnit * line.quantity) / yieldFactor : 0);
    }, 0);
  };

  const handleSaveRecipe = async () => {
    if (!recipeMenuItem) return;
    setIsSavingRecipe(true);
    const res = await saveMenuItemRecipe(
      recipeMenuItem.id,
      recipeLines.map(l => ({
        inventoryItemId: l.inventoryItemId || undefined,
        subRecipeId: l.subRecipeId || undefined,
        quantity: l.quantity,
        yieldPercent: l.yieldPercent || 100,
      }))
    );
    setIsSavingRecipe(false);
    if (res.success) {
      closeRecipeModal();
      fetchCostAnalysis();
    } else {
      alert(res.error || 'خطا در ذخیره فرمول غذا');
    }
  };

  const handleToggleRecipeModifierGroup = (groupId: string) => {
    setRecipeSelectedModifierGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveRecipeModifierGroups = async () => {
    if (!recipeMenuItem) return;
    setIsSavingRecipeModifierGroups(true);
    const res = await setMenuItemModifierGroups(recipeMenuItem.id, recipeSelectedModifierGroupIds);
    setIsSavingRecipeModifierGroups(false);
    if (!res.success) {
      alert(res.error || 'خطا در ذخیره‌ی گروه‌های مدیفایر این آیتم');
    }
  };

  // --- Sub-Recipes (فاز ۱۳) Handlers ---
  const fetchSubRecipes = async () => {
    setIsLoadingSubRecipes(true);
    const res = await getSubRecipes();
    if (res.success) setSubRecipeList((res.subRecipes || []) as SubRecipeListRow[]);
    setIsLoadingSubRecipes(false);
  };

  const openNewSubRecipeModal = () => {
    setEditingSubRecipeId(null);
    setSubRecipeName('');
    setSubRecipeUnit('');
    setSubRecipeNotes('');
    setSubRecipeLines([]);
    setSubRecipeInventoryOptions([]);
    setSubRecipeOtherOptions([]);
    setSubRecipeError('');
    setIsSubRecipeModalOpen(true);
  };

  const openEditSubRecipeModal = async (subRecipeId: string) => {
    setEditingSubRecipeId(subRecipeId);
    setSubRecipeError('');
    setIsSubRecipeModalOpen(true);
    setIsLoadingSubRecipeDetail(true);
    const res = await getSubRecipeDetail(subRecipeId);
    if (res.success) {
      const sr: any = res.subRecipe;
      setSubRecipeName(sr.name);
      setSubRecipeUnit(sr.unit || '');
      setSubRecipeNotes(sr.notes || '');
      setSubRecipeLines(
        (res.items || []).map((it: any) => ({
          inventoryItemId: it.inventoryItemId || '',
          childSubRecipeId: it.childSubRecipeId || '',
          quantity: it.quantity,
          yieldPercent: it.yieldPercent ?? 100,
        }))
      );
      setSubRecipeInventoryOptions((res.inventoryItems || []).map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, costPerUnit: 0 })));
      setSubRecipeOtherOptions((res.otherSubRecipes || []).map((s: any) => ({ id: s.id, name: s.name })));
    } else {
      setSubRecipeError(res.error || 'خطا در دریافت جزئیات زیرفرمول');
    }
    setIsLoadingSubRecipeDetail(false);
  };

  const closeSubRecipeModal = () => {
    setIsSubRecipeModalOpen(false);
    setEditingSubRecipeId(null);
  };

  const addSubRecipeLine = () => {
    setSubRecipeLines([...subRecipeLines, { inventoryItemId: '', childSubRecipeId: '', quantity: 0, yieldPercent: 100 }]);
  };

  const removeSubRecipeLine = (index: number) => {
    setSubRecipeLines(subRecipeLines.filter((_, i) => i !== index));
  };

  const updateSubRecipeLine = (
    index: number,
    field: 'inventoryItemId' | 'childSubRecipeId' | 'quantity' | 'yieldPercent',
    value: string | number
  ) => {
    setSubRecipeLines(subRecipeLines.map((line, i) => {
      if (i !== index) return line;
      const updated = { ...line, [field]: value } as SubRecipeLine;
      if (field === 'inventoryItemId' && value) updated.childSubRecipeId = '';
      if (field === 'childSubRecipeId' && value) updated.inventoryItemId = '';
      return updated;
    }));
  };

  const handleSaveSubRecipe = async () => {
    setIsSavingSubRecipe(true);
    setSubRecipeError('');
    const res = await saveSubRecipe(
      editingSubRecipeId,
      subRecipeName,
      subRecipeUnit,
      subRecipeNotes,
      subRecipeLines.map(l => ({
        inventoryItemId: l.inventoryItemId || undefined,
        childSubRecipeId: l.childSubRecipeId || undefined,
        quantity: l.quantity,
        yieldPercent: l.yieldPercent || 100,
      }))
    );
    setIsSavingSubRecipe(false);
    if (res.success) {
      closeSubRecipeModal();
      fetchSubRecipes();
    } else {
      setSubRecipeError(res.error || 'خطا در ذخیره‌ی زیرفرمول');
    }
  };

  const handleDeleteSubRecipe = async (subRecipeId: string) => {
    if (!confirm('آیا از حذف این زیرفرمول مطمئن هستید؟')) return;
    const res = await deleteSubRecipe(subRecipeId);
    if (res.success) {
      fetchSubRecipes();
    } else {
      alert(res.error || 'خطا در حذف زیرفرمول');
    }
  };

  // --- Modifier Groups (فاز ۱۳) Handlers ---
  const fetchModifierGroups = async () => {
    setIsLoadingModifierGroups(true);
    const res = await getModifierGroups();
    if (res.success) setModifierGroups((res.groups || []) as ModifierGroupRow[]);
    setIsLoadingModifierGroups(false);
  };

  const openNewModifierGroupModal = () => {
    setEditingModifierGroupId(null);
    setModifierGroupName('');
    setModifierGroupMinSelect(0);
    setModifierGroupMaxSelect(1);
    setModifierGroupModifiers([]);
    setModifierGroupError('');
    setIsModifierGroupModalOpen(true);
  };

  const openEditModifierGroupModal = (group: ModifierGroupRow) => {
    setEditingModifierGroupId(group.id);
    setModifierGroupName(group.name);
    setModifierGroupMinSelect(group.minSelect);
    setModifierGroupMaxSelect(group.maxSelect);
    setModifierGroupModifiers(
      group.modifiers.map(m => ({
        id: m.id,
        name: m.name,
        priceDelta: m.priceDelta,
        recipeLines: m.recipeItems.map(ri => ({ inventoryItemId: ri.inventoryItemId, quantity: ri.quantity })),
      }))
    );
    setModifierGroupError('');
    setIsModifierGroupModalOpen(true);
  };

  const closeModifierGroupModal = () => {
    setIsModifierGroupModalOpen(false);
    setEditingModifierGroupId(null);
  };

  const addModifierRow = () => {
    setModifierGroupModifiers([...modifierGroupModifiers, { name: '', priceDelta: 0, recipeLines: [] }]);
  };

  const removeModifierRow = (index: number) => {
    setModifierGroupModifiers(modifierGroupModifiers.filter((_, i) => i !== index));
  };

  const updateModifierRow = (index: number, field: 'name' | 'priceDelta', value: string | number) => {
    setModifierGroupModifiers(modifierGroupModifiers.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addModifierRecipeLine = (modifierIndex: number) => {
    setModifierGroupModifiers(modifierGroupModifiers.map((m, i) =>
      i === modifierIndex ? { ...m, recipeLines: [...m.recipeLines, { inventoryItemId: '', quantity: 0 }] } : m
    ));
  };

  const removeModifierRecipeLine = (modifierIndex: number, lineIndex: number) => {
    setModifierGroupModifiers(modifierGroupModifiers.map((m, i) =>
      i === modifierIndex ? { ...m, recipeLines: m.recipeLines.filter((_, li) => li !== lineIndex) } : m
    ));
  };

  const updateModifierRecipeLine = (
    modifierIndex: number,
    lineIndex: number,
    field: 'inventoryItemId' | 'quantity',
    value: string | number
  ) => {
    setModifierGroupModifiers(modifierGroupModifiers.map((m, i) => {
      if (i !== modifierIndex) return m;
      return {
        ...m,
        recipeLines: m.recipeLines.map((l, li) => li === lineIndex ? { ...l, [field]: value } : l),
      };
    }));
  };

  const handleSaveModifierGroup = async () => {
    setIsSavingModifierGroup(true);
    setModifierGroupError('');
    const res = await saveModifierGroup(
      editingModifierGroupId,
      modifierGroupName,
      modifierGroupMinSelect,
      modifierGroupMaxSelect,
      modifierGroupModifiers
    );
    setIsSavingModifierGroup(false);
    if (res.success) {
      closeModifierGroupModal();
      fetchModifierGroups();
    } else {
      setModifierGroupError(res.error || 'خطا در ذخیره‌ی گروه مدیفایر');
    }
  };

  const handleDeleteModifierGroup = async (groupId: string) => {
    if (!confirm('آیا از حذف این گروه مدیفایر مطمئن هستید؟')) return;
    const res = await deleteModifierGroup(groupId);
    if (res.success) {
      fetchModifierGroups();
    } else {
      alert(res.error || 'خطا در حذف گروه مدیفایر');
    }
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
              onClick={() => setActiveTab('costing')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'costing' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 قیمت تمام‌شده
            </button>
            <button
              onClick={() => setActiveTab('subrecipes')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'subrecipes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🥣 زیرفرمول‌ها
            </button>
            <button
              onClick={() => setActiveTab('modifiers')}
              className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'modifiers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ➕ مدیفایرها
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
            <div className="flex items-center gap-2">
              <button 
                onClick={openBulkModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
              >
                <span>📥</span> ورود گروهی از اکسل
              </button>
              <button 
                onClick={handleAddNewItem}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
              >
                <span>➕</span> افزودن آیتم جدید
              </button>
            </div>
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
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">شعبه</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{user.branch?.name || '—'}</span>
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

      {/* -------------------- COST ANALYSIS TAB -------------------- */}
      {activeTab === 'costing' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">آنالیز قیمت تمام‌شده غذاها</h2>
              <p className="text-xs text-gray-500 mt-1">محاسبه هزینه مواد اولیه، سود و حاشیه سود هر غذا بر اساس فرمول تعریف‌شده</p>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
            {isLoadingCosting ? (
              <div className="flex justify-center items-center h-[300px]">
                <span className="text-gray-500 font-bold animate-pulse">درحال محاسبه...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">نام غذا</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600">دسته‌بندی</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-left">قیمت فروش</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-left">هزینه مواد</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-left">سود ناخالص</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">حاشیه سود</th>
                      <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {costAnalysis.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{item.title}</div>
                          {item.ingredientCount === 0 && (
                            <div className="text-[11px] text-amber-600 mt-0.5">فرمول تعریف نشده</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${item.category === 'ایرانی' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <span className="text-sm font-bold text-gray-600">{formatCurrency(Math.round(item.cost))}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <span className={`text-sm font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.round(item.profit))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${
                            item.ingredientCount === 0
                              ? 'bg-gray-50 text-gray-500 border-gray-200'
                              : item.marginPercent >= 50
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.marginPercent >= 20
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {item.ingredientCount === 0 ? '—' : `${toPersianDigits(Math.round(item.marginPercent))}٪`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openRecipeModal(item)}
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-semibold text-xs border border-blue-100"
                          >
                            تعریف فرمول
                          </button>
                        </td>
                      </tr>
                    ))}
                    {costAnalysis.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">هیچ غذایی ثبت نشده است.</td>
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

          {settingsError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-bold text-sm">ذخیره تنظیمات ناموفق بود</h4>
                <p className="text-xs text-red-600 mt-0.5">{settingsError}</p>
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
                disabled={isSavingSettings || isLoadingSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-60"
              >
                <span>💾</span> {isSavingSettings ? 'درحال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUB-RECIPES TAB (فاز ۱۳) -------------------- */}
      {activeTab === 'subrecipes' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">زیرفرمول‌ها (Sub-recipes)</h2>
              <p className="text-xs text-gray-500 mt-0.5">آماده‌سازی‌های میانی (مثل سس یا خمیر پایه) که می‌توانند در فرمول چند آیتم منو استفاده شوند</p>
            </div>
            <button
              onClick={openNewSubRecipeModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
            >
              ➕ زیرفرمول جدید
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoadingSubRecipes ? (
              <div className="text-center text-gray-500 text-sm py-10 animate-pulse">درحال بارگذاری...</div>
            ) : subRecipeList.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-10">هنوز زیرفرمولی ثبت نشده است.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="px-6 py-3 text-right font-bold">نام</th>
                    <th className="px-6 py-3 text-right font-bold">واحد</th>
                    <th className="px-6 py-3 text-right font-bold">تعداد ردیف فرمول</th>
                    <th className="px-6 py-3 text-center font-bold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subRecipeList.map(sr => (
                    <tr key={sr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-800">{sr.name}</td>
                      <td className="px-6 py-3 text-gray-500">{sr.unit || '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{toPersianDigits(sr._count.items)}</td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => openEditSubRecipeModal(sr.id)}
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold ml-2"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDeleteSubRecipe(sr.id)}
                          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODIFIER GROUPS TAB (فاز ۱۳) -------------------- */}
      {activeTab === 'modifiers' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">گروه‌های مدیفایر/افزودنی</h2>
              <p className="text-xs text-gray-500 mt-0.5">مثل «افزودنی‌های پیتزا» یا «سطح تندی» — قابل اتصال به یک یا چند آیتم منو از داخل مودال فرمول غذای همان آیتم</p>
            </div>
            <button
              onClick={openNewModifierGroupModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 text-sm"
            >
              ➕ گروه مدیفایر جدید
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoadingModifierGroups ? (
              <div className="text-center text-gray-500 text-sm py-10 animate-pulse">درحال بارگذاری...</div>
            ) : modifierGroups.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-10">هنوز گروه مدیفایری ثبت نشده است.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="px-6 py-3 text-right font-bold">نام گروه</th>
                    <th className="px-6 py-3 text-right font-bold">حداقل/حداکثر انتخاب</th>
                    <th className="px-6 py-3 text-right font-bold">تعداد مدیفایر</th>
                    <th className="px-6 py-3 text-right font-bold">تعداد آیتم منوی متصل</th>
                    <th className="px-6 py-3 text-center font-bold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modifierGroups.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-800">{g.name}</td>
                      <td className="px-6 py-3 text-gray-500" dir="ltr">{toPersianDigits(g.minSelect)} .. {toPersianDigits(g.maxSelect)}</td>
                      <td className="px-6 py-3 text-gray-500">{toPersianDigits(g.modifiers.length)}</td>
                      <td className="px-6 py-3 text-gray-500">{toPersianDigits(g._count.menuItems)}</td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => openEditModifierGroupModal(g)}
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold ml-2"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDeleteModifierGroup(g.id)}
                          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------- RECIPE MODAL (For Cost Analysis Tab) -------------------- */}
      {isRecipeModalOpen && activeTab === 'costing' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">فرمول غذا: {recipeMenuItem?.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">اقلام انبار و مقدار مصرفی برای هر پرس را مشخص کنید</p>
              </div>
              <button onClick={closeRecipeModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingRecipe ? (
                <div className="text-center text-gray-500 text-sm py-8 animate-pulse">درحال بارگذاری...</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {recipeLines.map((line, index) => {
                      const inv = recipeInventoryItems.find(i => i.id === line.inventoryItemId);
                      const isSubRecipeLine = !!line.subRecipeId;
                      return (
                        <div key={index} className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={isSubRecipeLine ? 'sub' : 'ingredient'}
                              onChange={e => {
                                if (e.target.value === 'sub') {
                                  updateRecipeLine(index, 'subRecipeId', line.subRecipeId || recipeSubRecipeOptions[0]?.id || '');
                                } else {
                                  updateRecipeLine(index, 'inventoryItemId', line.inventoryItemId || recipeInventoryItems[0]?.id || '');
                                }
                              }}
                              className="w-32 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white outline-none focus:border-blue-500"
                            >
                              <option value="ingredient">ماده اولیه</option>
                              <option value="sub">زیرفرمول</option>
                            </select>

                            {isSubRecipeLine ? (
                              <select
                                value={line.subRecipeId}
                                onChange={e => updateRecipeLine(index, 'subRecipeId', e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                              >
                                <option value="">— انتخاب زیرفرمول —</option>
                                {recipeSubRecipeOptions.map(sr => (
                                  <option key={sr.id} value={sr.id}>{sr.name} {sr.unit ? `(${sr.unit})` : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={line.inventoryItemId}
                                onChange={e => updateRecipeLine(index, 'inventoryItemId', e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                              >
                                <option value="">— انتخاب کالای انبار —</option>
                                {recipeInventoryItems.map(inv => (
                                  <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                                ))}
                              </select>
                            )}
                            <input
                              type="number"
                              step="any"
                              placeholder="مقدار"
                              value={line.quantity || ''}
                              onChange={e => updateRecipeLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                              dir="ltr"
                            />
                            <button
                              onClick={() => removeRecipeLine(index)}
                              className="text-red-500 hover:text-red-700 px-2 text-sm"
                            >
                              حذف
                            </button>
                          </div>
                          <div className="flex items-center gap-2 pr-1">
                            <label className="text-xs text-gray-500 flex items-center gap-1">
                              <span>درصد بازده (yield%):</span>
                              <input
                                type="number"
                                step="any"
                                min={1}
                                max={100}
                                value={line.yieldPercent || 100}
                                onChange={e => updateRecipeLine(index, 'yieldPercent', parseFloat(e.target.value) || 100)}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs text-left outline-none focus:border-blue-500"
                                dir="ltr"
                              />
                            </label>
                            {!isSubRecipeLine && inv && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>قیمت واحد:</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={inv.costPerUnit || ''}
                                  onChange={e => updateIngredientCostLocal(inv.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-left outline-none focus:border-blue-500"
                                  dir="ltr"
                                />
                              </div>
                            )}
                            {isSubRecipeLine && line.subRecipeId && (
                              <span className="text-xs text-gray-400">
                                هزینه‌ی هر واحد زیرفرمول: {formatCurrency(Math.round(recipeSubRecipeOptions.find(s => s.id === line.subRecipeId)?.costPerUnit || 0))} تومان
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recipeLines.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">هنوز موردی اضافه نشده است.</p>
                    )}
                  </div>

                  <button
                    onClick={addRecipeLine}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-500 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                  >
                    ➕ افزودن ردیف فرمول
                  </button>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-900">هزینه تمام‌شده محاسبه‌شده:</span>
                    <span className="text-lg font-black text-blue-900">{formatCurrency(Math.round(computeRecipeCost()))} تومان</span>
                  </div>

                  {/* فاز ۱۳: اختصاصِ گروه‌های مدیفایر/افزودنی به همین آیتم منو */}
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-800">گروه‌های مدیفایر/افزودنیِ این آیتم</span>
                      <button
                        onClick={handleSaveRecipeModifierGroups}
                        disabled={isSavingRecipeModifierGroups}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-60"
                      >
                        {isSavingRecipeModifierGroups ? 'درحال ذخیره...' : '💾 ذخیره گروه‌های مدیفایر'}
                      </button>
                    </div>
                    {recipeAllModifierGroups.length === 0 ? (
                      <p className="text-xs text-gray-400">هنوز گروه مدیفایری تعریف نشده (از تب «مدیفایرها» بسازید).</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {recipeAllModifierGroups.map(g => (
                          <label
                            key={g.id}
                            className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                              recipeSelectedModifierGroupIds.includes(g.id)
                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={recipeSelectedModifierGroupIds.includes(g.id)}
                              onChange={() => handleToggleRecipeModifierGroup(g.id)}
                              className="hidden"
                            />
                            {g.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeRecipeModal} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                انصراف
              </button>
              <button
                onClick={handleSaveRecipe}
                disabled={isSavingRecipe}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSavingRecipe ? 'درحال ذخیره...' : 'ذخیره فرمول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUB-RECIPE MODAL (فاز ۱۳) -------------------- */}
      {isSubRecipeModalOpen && activeTab === 'subrecipes' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingSubRecipeId ? 'ویرایش زیرفرمول' : 'زیرفرمول جدید'}</h3>
              <button onClick={closeSubRecipeModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingSubRecipeDetail ? (
                <div className="text-center text-gray-500 text-sm py-8 animate-pulse">درحال بارگذاری...</div>
              ) : (
                <>
                  {subRecipeError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{subRecipeError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">نام زیرفرمول</label>
                      <input
                        type="text"
                        value={subRecipeName}
                        onChange={e => setSubRecipeName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">واحد (نمایشی)</label>
                      <input
                        type="text"
                        value={subRecipeUnit}
                        onChange={e => setSubRecipeUnit(e.target.value)}
                        placeholder="مثلاً کیلوگرم"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">یادداشت</label>
                    <input
                      type="text"
                      value={subRecipeNotes}
                      onChange={e => setSubRecipeNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-600">این زیرفرمول از چه چیزی ساخته می‌شود؟</p>
                    {subRecipeLines.map((line, index) => {
                      const isChild = !!line.childSubRecipeId;
                      return (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <select
                            value={isChild ? 'sub' : 'ingredient'}
                            onChange={e => {
                              if (e.target.value === 'sub') {
                                updateSubRecipeLine(index, 'childSubRecipeId', line.childSubRecipeId || subRecipeOtherOptions[0]?.id || '');
                              } else {
                                updateSubRecipeLine(index, 'inventoryItemId', line.inventoryItemId || subRecipeInventoryOptions[0]?.id || '');
                              }
                            }}
                            className="w-32 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white outline-none focus:border-blue-500"
                          >
                            <option value="ingredient">ماده اولیه</option>
                            <option value="sub">زیرفرمول دیگر</option>
                          </select>
                          {isChild ? (
                            <select
                              value={line.childSubRecipeId}
                              onChange={e => updateSubRecipeLine(index, 'childSubRecipeId', e.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                            >
                              <option value="">— انتخاب زیرفرمول —</option>
                              {subRecipeOtherOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={line.inventoryItemId}
                              onChange={e => updateSubRecipeLine(index, 'inventoryItemId', e.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                            >
                              <option value="">— انتخاب کالای انبار —</option>
                              {subRecipeInventoryOptions.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                              ))}
                            </select>
                          )}
                          <input
                            type="number"
                            step="any"
                            placeholder="مقدار"
                            value={line.quantity || ''}
                            onChange={e => updateSubRecipeLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                            dir="ltr"
                          />
                          <input
                            type="number"
                            step="any"
                            min={1}
                            max={100}
                            title="درصد بازده"
                            placeholder="بازده%"
                            value={line.yieldPercent || 100}
                            onChange={e => updateSubRecipeLine(index, 'yieldPercent', parseFloat(e.target.value) || 100)}
                            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                            dir="ltr"
                          />
                          <button
                            onClick={() => removeSubRecipeLine(index)}
                            className="text-red-500 hover:text-red-700 px-2 text-sm"
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                    {subRecipeLines.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">هنوز موردی اضافه نشده است.</p>
                    )}
                  </div>

                  <button
                    onClick={addSubRecipeLine}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-500 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                  >
                    ➕ افزودن ردیف
                  </button>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeSubRecipeModal} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                انصراف
              </button>
              <button
                onClick={handleSaveSubRecipe}
                disabled={isSavingSubRecipe}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSavingSubRecipe ? 'درحال ذخیره...' : 'ذخیره زیرفرمول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODIFIER GROUP MODAL (فاز ۱۳) -------------------- */}
      {isModifierGroupModalOpen && activeTab === 'modifiers' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingModifierGroupId ? 'ویرایش گروه مدیفایر' : 'گروه مدیفایر جدید'}</h3>
              <button onClick={closeModifierGroupModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {modifierGroupError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{modifierGroupError}</div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">نام گروه</label>
                  <input
                    type="text"
                    value={modifierGroupName}
                    onChange={e => setModifierGroupName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">حداقل انتخاب</label>
                  <input
                    type="number"
                    min={0}
                    value={modifierGroupMinSelect}
                    onChange={e => setModifierGroupMinSelect(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">حداکثر انتخاب</label>
                  <input
                    type="number"
                    min={1}
                    value={modifierGroupMaxSelect}
                    onChange={e => setModifierGroupMaxSelect(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-600">مدیفایرهای این گروه</p>
                {modifierGroupModifiers.map((m, mIndex) => (
                  <div key={m.id || `new-${mIndex}`} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="نام مدیفایر (مثلاً «پنیر اضافه»)"
                        value={m.name}
                        onChange={e => updateModifierRow(mIndex, 'name', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="افزایش قیمت"
                        value={m.priceDelta || ''}
                        onChange={e => updateModifierRow(mIndex, 'priceDelta', parseFloat(e.target.value) || 0)}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-blue-500"
                        dir="ltr"
                      />
                      <button onClick={() => removeModifierRow(mIndex)} className="text-red-500 hover:text-red-700 px-2 text-sm">حذف</button>
                    </div>
                    <div className="pr-4 space-y-1.5">
                      <p className="text-[11px] text-gray-400">اثر روی موجودی (مثبت = مصرف اضافه، منفی = کسر از فرمول پایه):</p>
                      {m.recipeLines.map((rl, rlIndex) => (
                        <div key={rlIndex} className="flex items-center gap-2">
                          <select
                            value={rl.inventoryItemId}
                            onChange={e => updateModifierRecipeLine(mIndex, rlIndex, 'inventoryItemId', e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                          >
                            <option value="">— انتخاب کالای انبار —</option>
                            {recipeInventoryItems.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="any"
                            placeholder="مقدار (± )"
                            value={rl.quantity || ''}
                            onChange={e => updateModifierRecipeLine(mIndex, rlIndex, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-left outline-none focus:border-blue-500"
                            dir="ltr"
                          />
                          <button onClick={() => removeModifierRecipeLine(mIndex, rlIndex)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => addModifierRecipeLine(mIndex)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        ➕ افزودن اثر روی موجودی
                      </button>
                    </div>
                  </div>
                ))}
                {modifierGroupModifiers.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">هنوز مدیفایری اضافه نشده است.</p>
                )}
                <button
                  onClick={addModifierRow}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-500 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  ➕ افزودن مدیفایر
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModifierGroupModal} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                انصراف
              </button>
              <button
                onClick={handleSaveModifierGroup}
                disabled={isSavingModifierGroup}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSavingModifierGroup ? 'درحال ذخیره...' : 'ذخیره گروه مدیفایر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- BULK IMPORT MODAL (For Menu Tab) -------------------- */}
      {isBulkModalOpen && activeTab === 'menu' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">ورود گروهی آیتم‌های منو از اکسل</h2>
              <button onClick={closeBulkModal} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p>یک فایل اکسل (xlsx) با ستون‌های «نام غذا»، «قیمت»، «دسته‌بندی»، «زیردسته» و «مواد اولیه» آپلود کنید تا همه ردیف‌ها یکجا به منو اضافه شوند. برای شروع سریع‌تر، نمونه فایل را دانلود و تکمیل کنید.</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-blue-700 font-bold underline hover:text-blue-900"
                >
                  ⬇️ دانلود نمونه فایل
                </button>
              </div>

              <div>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                  <span className="text-2xl">📄</span>
                  <span className="text-sm font-bold text-gray-600">
                    {bulkFileName ? `فایل انتخاب‌شده: ${bulkFileName}` : 'برای انتخاب فایل اکسل کلیک کنید'}
                  </span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFileChange} className="hidden" />
                </label>
              </div>

              {bulkRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-700">
                      پیش‌نمایش {toPersianDigits(bulkRows.length)} ردیف
                    </span>
                    <span className={`font-bold ${bulkRows.some(r => r.error) ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {toPersianDigits(bulkRows.filter(r => !r.error).length)} ردیف معتبر
                      {bulkRows.some(r => r.error) && ` / ${toPersianDigits(bulkRows.filter(r => r.error).length)} دارای خطا`}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-right text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-bold text-gray-600">نام غذا</th>
                          <th className="px-3 py-2 font-bold text-gray-600">قیمت</th>
                          <th className="px-3 py-2 font-bold text-gray-600">دسته‌بندی</th>
                          <th className="px-3 py-2 font-bold text-gray-600">زیردسته</th>
                          <th className="px-3 py-2 font-bold text-gray-600">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bulkRows.map((row, idx) => (
                          <tr key={idx} className={row.error ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2">{row.title || '—'}</td>
                            <td className="px-3 py-2">{formatCurrency(row.price)}</td>
                            <td className="px-3 py-2">{row.category}</td>
                            <td className="px-3 py-2">{row.subCategory || '—'}</td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <span className="text-red-600 font-bold">{row.error}</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">✓ معتبر</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={closeBulkModal}
                className="px-5 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmBulkImport}
                disabled={isImportingBulk || bulkRows.filter(r => !r.error).length === 0}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isImportingBulk ? 'درحال وارد کردن...' : `تایید و وارد کردن (${toPersianDigits(bulkRows.filter(r => !r.error).length)})`}
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
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">ایستگاه آشپزخانه (KDS)</label>
                  <input
                    type="text"
                    value={menuFormData.kitchenStation || ''}
                    onChange={e => setMenuFormData({...menuFormData, kitchenStation: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-sans"
                    placeholder="مثال: گریل، سرد، دسر (اختیاری — خالی بماند یعنی «عمومی»)"
                  />
                  <p className="text-xs text-gray-400 mt-1">تعیین می‌کند این آیتم روی تابلوی آشپزخانه (KDS) زیر کدام ایستگاه نمایش داده شود.</p>
                </div>

                <div className="col-span-2 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-2">
                  <input
                    type="checkbox"
                    id="menu-item-available"
                    checked={menuFormData.isAvailable ?? true}
                    onChange={e => setMenuFormData({...menuFormData, isAvailable: e.target.checked})}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="menu-item-available" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                    این محصول در حال حاضر موجود است
                  </label>
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
                <label className="block text-sm font-bold text-gray-700 mb-1">شعبه</label>
                <select
                  value={userFormData.branchId}
                  onChange={e => setUserFormData({...userFormData, branchId: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white font-sans"
                >
                  <option value="">— شعبه‌ی خودم (پیش‌فرض) —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
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
