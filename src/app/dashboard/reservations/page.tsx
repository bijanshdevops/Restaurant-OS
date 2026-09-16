"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getTables,
  createTable,
  getReservations,
  createReservation,
  updateReservationStatus,
} from '@/app/actions/reservation';
import { TableStatus, ReservationStatus } from '@prisma/client';

interface TableRow {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
}

interface ReservationRow {
  id: string;
  tableId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationTime: Date;
  status: ReservationStatus;
  notes: string;
  table: { number: number };
}

const toPersianDigits = (num: number | string) => {
  const d = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, x => d[parseInt(x)]);
};

const tableStatusLabel: Record<TableStatus, string> = {
  AVAILABLE: 'آزاد',
  OCCUPIED: 'در حال استفاده',
  RESERVED: 'رزرو شده',
  CLEANING: 'در حال نظافت',
};

const tableStatusClass: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  OCCUPIED: 'bg-red-50 border-red-300 text-red-800',
  RESERVED: 'bg-amber-50 border-amber-300 text-amber-800',
  CLEANING: 'bg-gray-100 border-gray-300 text-gray-600',
};

const reservationStatusLabel: Record<ReservationStatus, string> = {
  PENDING: 'در انتظار تایید',
  CONFIRMED: 'تایید شده',
  SEATED: 'نشسته',
  COMPLETED: 'پایان‌یافته',
  CANCELLED: 'لغو شده',
  NO_SHOW: 'عدم حضور',
};

const reservationStatusClass: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  SEATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  NO_SHOW: 'bg-red-100 text-red-700 border-red-200',
};

export default function ReservationsPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    tableId: '',
    guestName: '',
    guestPhone: '',
    partySize: 2,
    reservationDate: '',
    reservationHour: '',
    notes: '',
  });

  const [tableForm, setTableForm] = useState({ number: '', capacity: '4' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [tablesRes, reservationsRes] = await Promise.all([getTables(), getReservations()]);
    if (tablesRes.success && tablesRes.tables) {
      setTables(tablesRes.tables as any);
    }
    if (reservationsRes.success && reservationsRes.reservations) {
      setReservations(
        (reservationsRes.reservations as any[]).map(r => ({ ...r, reservationTime: new Date(r.reservationTime) }))
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreateReservation = async () => {
    setFormError('');
    if (!formData.tableId || !formData.guestName || !formData.guestPhone || !formData.reservationDate || !formData.reservationHour) {
      setFormError('لطفاً همه فیلدهای الزامی را پر کنید.');
      return;
    }
    const reservationTime = new Date(`${formData.reservationDate}T${formData.reservationHour}:00`);
    const res = await createReservation({
      tableId: formData.tableId,
      guestName: formData.guestName,
      guestPhone: formData.guestPhone,
      partySize: Number(formData.partySize),
      reservationTime,
      notes: formData.notes,
    });
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ tableId: '', guestName: '', guestPhone: '', partySize: 2, reservationDate: '', reservationHour: '', notes: '' });
      loadData();
    } else {
      setFormError(res.error || 'خطا در ثبت رزرو');
    }
  };

  const handleCreateTable = async () => {
    setFormError('');
    const number = parseInt(tableForm.number, 10);
    const capacity = parseInt(tableForm.capacity, 10);
    if (!number || !capacity) {
      setFormError('شماره و ظرفیت میز را درست وارد کنید.');
      return;
    }
    const res = await createTable(number, capacity);
    if (res.success) {
      setIsTableModalOpen(false);
      setTableForm({ number: '', capacity: '4' });
      loadData();
    } else {
      setFormError(res.error || 'خطا در ایجاد میز');
    }
  };

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    const res = await updateReservationStatus(id, status);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'خطا در تغییر وضعیت');
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }).format(date);
  };

  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length;
  const reservedCount = tables.filter(t => t.status === 'RESERVED').length;
  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;
  const upcomingReservations = reservations.filter(r => ['PENDING', 'CONFIRMED'].includes(r.status));

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مدیریت میز و رزرواسیون</h1>
          <p className="text-gray-500 mt-1">نمای میزها و رزروهای رستوران</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsTableModalOpen(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-5 rounded-xl transition-all border border-gray-200"
          >
            ➕ میز جدید
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            ➕ رزرو جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <span className="text-gray-500 text-sm font-semibold">میزهای آزاد</span>
          <div className="text-3xl font-black text-emerald-600 mt-2">{toPersianDigits(availableCount)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <span className="text-gray-500 text-sm font-semibold">میزهای رزرو شده</span>
          <div className="text-3xl font-black text-amber-600 mt-2">{toPersianDigits(reservedCount)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <span className="text-gray-500 text-sm font-semibold">میزهای در حال استفاده</span>
          <div className="text-3xl font-black text-red-600 mt-2">{toPersianDigits(occupiedCount)}</div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">نمای میزها</h2>
        {isLoading && tables.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-bold animate-pulse">درحال بارگذاری...</div>
        ) : tables.length === 0 ? (
          <div className="text-center py-10 text-gray-500">هنوز میزی تعریف نشده است.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {tables.map(t => (
              <div key={t.id} className={`rounded-xl border-2 p-4 text-center ${tableStatusClass[t.status]}`}>
                <div className="text-2xl font-black">{toPersianDigits(t.number)}</div>
                <div className="text-xs font-bold mt-1">{tableStatusLabel[t.status]}</div>
                <div className="text-xs mt-1 opacity-70">ظرفیت {toPersianDigits(t.capacity)} نفر</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[300px]">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">لیست رزروها</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-right">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">مشتری</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">میز</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">نفرات</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">زمان</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">وضعیت</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {reservations.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{r.guestName}</div>
                    <div className="text-xs text-gray-500 font-mono" dir="ltr">{r.guestPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">میز {toPersianDigits(r.table?.number ?? '-')}</td>
                  <td className="px-6 py-4 text-center text-sm font-bold">{toPersianDigits(r.partySize)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatTime(r.reservationTime)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${reservationStatusClass[r.status]}`}>
                      {reservationStatusLabel[r.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold space-x-1 space-x-reverse whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <button onClick={() => handleStatusChange(r.id, 'CONFIRMED')} className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg border border-blue-200">تایید</button>
                    )}
                    {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                      <button onClick={() => handleStatusChange(r.id, 'SEATED')} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg border border-emerald-200">نشستن</button>
                    )}
                    {r.status === 'SEATED' && (
                      <button onClick={() => handleStatusChange(r.id, 'COMPLETED')} className="text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg border border-gray-300">پایان</button>
                    )}
                    {['PENDING', 'CONFIRMED'].includes(r.status) && (
                      <button onClick={() => handleStatusChange(r.id, 'CANCELLED')} className="text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-lg border border-red-200">لغو</button>
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هیچ رزروی ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900">➕ ثبت رزرو جدید</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {formError && <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-lg border border-red-200">{formError}</div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">میز <span className="text-red-500">*</span></label>
                <select
                  value={formData.tableId}
                  onChange={e => setFormData({ ...formData, tableId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">انتخاب میز...</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>میز {t.number} (ظرفیت {t.capacity} نفر)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام مشتری <span className="text-red-500">*</span></label>
                <input type="text" value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="مثال: علی رضایی" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شماره تماس <span className="text-red-500">*</span></label>
                <input type="text" value={formData.guestPhone} onChange={e => setFormData({ ...formData, guestPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 text-left font-mono" dir="ltr" placeholder="09123456789" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">تعداد نفرات</label>
                  <input type="number" min={1} value={formData.partySize} onChange={e => setFormData({ ...formData, partySize: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">تاریخ</label>
                  <input type="date" value={formData.reservationDate} onChange={e => setFormData({ ...formData, reservationDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ساعت</label>
                <input type="time" value={formData.reservationHour} onChange={e => setFormData({ ...formData, reservationHour: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" rows={2} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleCreateReservation} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm">ثبت رزرو</button>
            </div>
          </div>
        </div>
      )}

      {isTableModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">➕ افزودن میز جدید</h2>
              <button onClick={() => setIsTableModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-lg border border-red-200">{formError}</div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شماره میز</label>
                <input type="number" value={tableForm.number} onChange={e => setTableForm({ ...tableForm, number: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ظرفیت (نفر)</label>
                <input type="number" value={tableForm.capacity} onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsTableModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleCreateTable} className="px-5 py-2.5 text-sm font-bold text-white bg-gray-800 rounded-xl hover:bg-gray-900 shadow-sm">افزودن میز</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
