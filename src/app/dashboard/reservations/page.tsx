"use client";

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  getTables,
  createTable,
  getReservations,
  createReservation,
  updateReservationStatus,
  refundReservationDeposit,
} from '@/app/actions/reservation';
import {
  getWaitlist,
  joinWaitlist,
  seatFromWaitlist,
  cancelWaitlistEntry,
} from '@/app/actions/waitlist';
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
  depositAmount: number;
  depositRefundedAt: Date | null;
}

interface WaitlistRow {
  id: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  notes: string;
  createdAt: Date;
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
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [seatingEntryId, setSeatingEntryId] = useState<string | null>(null);
  const [seatTableId, setSeatTableId] = useState('');
  const [formError, setFormError] = useState('');

  // فاز ۱۶: کدِ QR سفارشِ خودکارِ روی میز — تولیدِ سمتِ کلاینت با کتابخانه‌ی
  // qrcode، بدونِ نیاز به فیلدِ جدید در schema (خودِ UUID میز در URL می‌رود).
  const [qrModalTable, setQrModalTable] = useState<TableRow | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrOrderUrl, setQrOrderUrl] = useState('');

  const openQrModal = async (t: TableRow) => {
    setQrModalTable(t);
    const url = `${window.location.origin}/order/table/${t.id}`;
    setQrOrderUrl(url);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error('Error generating QR code:', e);
      setQrDataUrl('');
    }
  };

  const closeQrModal = () => {
    setQrModalTable(null);
    setQrDataUrl('');
    setQrOrderUrl('');
  };

  const [formData, setFormData] = useState({
    tableId: '',
    guestName: '',
    guestPhone: '',
    partySize: 2,
    reservationDate: '',
    reservationHour: '',
    notes: '',
    depositAmount: '',
  });

  const [tableForm, setTableForm] = useState({ number: '', capacity: '4' });

  const [waitlistForm, setWaitlistForm] = useState({ guestName: '', guestPhone: '', partySize: 2, notes: '' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [tablesRes, reservationsRes, waitlistRes] = await Promise.all([getTables(), getReservations(), getWaitlist()]);
    if (tablesRes.success && tablesRes.tables) {
      setTables(tablesRes.tables as any);
    }
    if (reservationsRes.success && reservationsRes.reservations) {
      setReservations(
        (reservationsRes.reservations as any[]).map(r => ({ ...r, reservationTime: new Date(r.reservationTime) }))
      );
    }
    if (waitlistRes.success && waitlistRes.entries) {
      setWaitlist(
        (waitlistRes.entries as any[]).map(w => ({ ...w, createdAt: new Date(w.createdAt) }))
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
    const depositAmount = formData.depositAmount ? Number(formData.depositAmount) : 0;
    const res = await createReservation({
      tableId: formData.tableId,
      guestName: formData.guestName,
      guestPhone: formData.guestPhone,
      partySize: Number(formData.partySize),
      reservationTime,
      notes: formData.notes,
      depositAmount,
    });
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ tableId: '', guestName: '', guestPhone: '', partySize: 2, reservationDate: '', reservationHour: '', notes: '', depositAmount: '' });
      loadData();
    } else {
      setFormError(res.error || 'خطا در ثبت رزرو');
    }
  };

  const handleRefundDeposit = async (id: string) => {
    if (!confirm('آیا از بازگرداندن کامل پیش‌پرداخت این رزرو مطمئن هستید؟')) return;
    const res = await refundReservationDeposit(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'خطا در بازگرداندن پیش‌پرداخت');
    }
  };

  const handleJoinWaitlist = async () => {
    setFormError('');
    if (!waitlistForm.guestName || !waitlistForm.guestPhone) {
      setFormError('نام و شماره تماس الزامی است.');
      return;
    }
    const res = await joinWaitlist(waitlistForm);
    if (res.success) {
      setIsWaitlistModalOpen(false);
      setWaitlistForm({ guestName: '', guestPhone: '', partySize: 2, notes: '' });
      loadData();
    } else {
      setFormError(res.error || 'خطا در ثبت در لیست انتظار');
    }
  };

  const handleSeatFromWaitlist = async () => {
    if (!seatingEntryId || !seatTableId) return;
    const res = await seatFromWaitlist(seatingEntryId, seatTableId);
    if (res.success) {
      setSeatingEntryId(null);
      setSeatTableId('');
      loadData();
    } else {
      alert(res.error || 'خطا در نشاندن مشتری');
    }
  };

  const handleCancelWaitlist = async (id: string) => {
    const res = await cancelWaitlistEntry(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'خطا در لغو مورد');
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
            onClick={() => setIsWaitlistModalOpen(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-3 px-5 rounded-xl transition-all border border-amber-200"
          >
            ⏳ افزودن به لیست انتظار
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
                <button
                  onClick={() => openQrModal(t)}
                  className="mt-2 w-full text-[11px] font-bold bg-white/70 hover:bg-white border border-current/30 rounded-lg py-1 transition-colors"
                  title="کد QR سفارش خودکار روی میز"
                >
                  📱 QR سفارش
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-amber-50/50">
          <h2 className="text-lg font-bold text-gray-800">لیست انتظار (حضوری)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-right">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">مشتری</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">نفرات</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">توضیحات</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">زمان ثبت</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {waitlist.map(w => (
                <tr key={w.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{w.guestName}</div>
                    <div className="text-xs text-gray-500 font-mono" dir="ltr">{w.guestPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold">{toPersianDigits(w.partySize)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{w.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatTime(w.createdAt)}</td>
                  <td className="px-6 py-4 text-center text-xs font-bold space-x-1 space-x-reverse whitespace-nowrap">
                    <button onClick={() => { setSeatingEntryId(w.id); setSeatTableId(''); }} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg border border-emerald-200">نشستن روی میز</button>
                    <button onClick={() => handleCancelWaitlist(w.id)} className="text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-lg border border-red-200">لغو</button>
                  </td>
                </tr>
              ))}
              {waitlist.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm font-medium">لیست انتظار خالی است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">پیش‌پرداخت</th>
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
                  <td className="px-6 py-4 text-center text-xs">
                    {r.depositAmount > 0 ? (
                      <div className="space-y-1">
                        <div className="font-bold text-gray-700">{toPersianDigits(r.depositAmount)} تومان</div>
                        {r.depositRefundedAt ? (
                          <span className="px-2 py-0.5 inline-flex text-[11px] font-bold rounded-full border bg-gray-100 text-gray-600 border-gray-200">بازگردانده‌شده</span>
                        ) : (
                          <button onClick={() => handleRefundDeposit(r.id)} className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 font-bold">بازگرداندن پیش‌پرداخت</button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">هیچ رزروی ثبت نشده است.</td>
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">پیش‌پرداخت (تومان) <span className="text-gray-400 font-normal">— اختیاری</span></label>
                <input type="number" min={0} value={formData.depositAmount} onChange={e => setFormData({ ...formData, depositAmount: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="۰" />
                <p className="text-xs text-gray-400 mt-1">در صورت وارد کردن مبلغ، به‌صورت خودکار به‌عنوان درآمد ثبت می‌شود.</p>
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

      {isWaitlistModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <h2 className="text-lg font-bold text-amber-900">⏳ افزودن به لیست انتظار</h2>
              <button onClick={() => setIsWaitlistModalOpen(false)} className="text-amber-400 hover:text-amber-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-lg border border-red-200">{formError}</div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نام مشتری <span className="text-red-500">*</span></label>
                <input type="text" value={waitlistForm.guestName} onChange={e => setWaitlistForm({ ...waitlistForm, guestName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500" placeholder="مثال: علی رضایی" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">شماره تماس <span className="text-red-500">*</span></label>
                <input type="text" value={waitlistForm.guestPhone} onChange={e => setWaitlistForm({ ...waitlistForm, guestPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 text-left font-mono" dir="ltr" placeholder="09123456789" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تعداد نفرات</label>
                <input type="number" min={1} value={waitlistForm.partySize} onChange={e => setWaitlistForm({ ...waitlistForm, partySize: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات</label>
                <textarea value={waitlistForm.notes} onChange={e => setWaitlistForm({ ...waitlistForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500" rows={2} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsWaitlistModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleJoinWaitlist} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-sm">افزودن</button>
            </div>
          </div>
        </div>
      )}

      {seatingEntryId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
              <h2 className="text-lg font-bold text-emerald-900">نشاندن روی میز</h2>
              <button onClick={() => setSeatingEntryId(null)} className="text-emerald-400 hover:text-emerald-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">میز</label>
                <select
                  value={seatTableId}
                  onChange={e => setSeatTableId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">انتخاب میز...</option>
                  {tables.filter(t => t.status === 'AVAILABLE').map(t => (
                    <option key={t.id} value={t.id}>میز {t.number} (ظرفیت {t.capacity} نفر)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setSeatingEntryId(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={handleSeatFromWaitlist} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm">نشاندن</button>
            </div>
          </div>
        </div>
      )}

      {/* فاز ۱۶: کدِ QR سفارشِ خودکارِ روی میز — چاپ/اسکن این کد مشتری را
          مستقیماً به /order/table/[tableId] می‌برد (پس از ورود با OTP). */}
      {qrModalTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900">کد QR میز {toPersianDigits(qrModalTable.number)}</h2>
              <button onClick={closeQrModal} className="text-indigo-400 hover:text-indigo-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`کد QR میز ${qrModalTable.number}`} className="w-64 h-64 rounded-xl border border-gray-200" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400 text-sm">در حال تولید کد QR...</div>
              )}
              <p className="text-xs text-gray-500 break-all text-center" dir="ltr">{qrOrderUrl}</p>
              <p className="text-xs text-gray-400 text-center">
                مشتری با اسکن این کد، پس از ورود با کد یک‌بارمصرف (OTP)، می‌تواند مستقیماً از همین میز سفارش دهد و آنلاین پرداخت کند.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={closeQrModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">بستن</button>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`table-${qrModalTable.number}-qr.png`}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm"
                >
                  دانلود / چاپ
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
