"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getBranches,
  createBranch,
  updateBranch,
  setBranchActive,
  setDefaultBranch,
} from '@/app/actions/branch';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  isDefault: boolean;
}

const emptyForm = { name: '', address: '', phone: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    const res = await getBranches();
    if (res.success && res.branches) setBranches(res.branches as unknown as Branch[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address, phone: b.phone });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('نام شعبه را وارد کنید.');
      return;
    }
    const res = editingId ? await updateBranch(editingId, form) : await createBranch(form);
    if (res.success) {
      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchBranches();
    } else {
      alert(res.error || 'خطا در ثبت شعبه');
    }
  };

  const handleToggleActive = async (b: Branch) => {
    if (b.isDefault && b.isActive) {
      alert('شعبه‌ی پیش‌فرض را نمی‌توان غیرفعال کرد. ابتدا یک شعبه‌ی دیگر را پیش‌فرض کنید.');
      return;
    }
    const res = await setBranchActive(b.id, !b.isActive);
    if (!res.success) alert(res.error || 'خطا در تغییر وضعیت شعبه');
    fetchBranches();
  };

  const handleSetDefault = async (b: Branch) => {
    const res = await setDefaultBranch(b.id);
    if (!res.success) alert(res.error || 'خطا در تعیین شعبه‌ی پیش‌فرض');
    fetchBranches();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">شعبه‌ها</h1>
          <p className="text-gray-500 mt-1">مدیریت شعبه‌های رستوران و تعیین شعبه‌ی پیش‌فرض</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span>➕</span> افزودن شعبه
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[200px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">نام شعبه</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">تماس</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">پیش‌فرض</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">وضعیت</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {branches.map((b) => (
                  <BranchRow
                    key={b.id}
                    branch={b}
                    onEdit={() => openEdit(b)}
                    onToggleActive={() => handleToggleActive(b)}
                    onSetDefault={() => handleSetDefault(b)}
                  />
                ))}
                {branches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                      هنوز شعبه‌ای ثبت نشده. دکمه «افزودن شعبه» را بزنید.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? 'ویرایش شعبه' : 'شعبه جدید'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام شعبه <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تلفن</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">آدرس</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">ثبت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchRow({
  branch,
  onEdit,
  onToggleActive,
  onSetDefault,
}: {
  branch: Branch;
  onEdit: () => void;
  onToggleActive: () => void;
  onSetDefault: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-gray-900">{branch.name}</div>
        <div className="text-xs text-gray-400">{branch.address}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{branch.phone}</td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {branch.isDefault ? (
          <span className="px-2 py-1 text-xs font-bold rounded-md border bg-blue-100 text-blue-800 border-blue-200">
            پیش‌فرض
          </span>
        ) : (
          <button
            onClick={onSetDefault}
            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 font-bold text-xs"
          >
            تعیین به‌عنوان پیش‌فرض
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          onClick={onToggleActive}
          className={`px-2 py-1 text-xs font-bold rounded-md border ${
            branch.isActive
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          {branch.isActive ? 'فعال' : 'غیرفعال'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
        <button onClick={onEdit} className="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 font-bold text-xs">
          ویرایش
        </button>
      </td>
    </tr>
  );
}
