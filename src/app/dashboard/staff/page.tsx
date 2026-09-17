"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import {
  getMyShifts,
  clockIn,
  clockOut,
  getStaffDirectory,
  createStaffRequest,
  getMyStaffRequests,
  cancelMyStaffRequest,
  getShifts,
  createShift,
  cancelShift,
  assignStaffToShift,
  unassignStaffFromShift,
  getStaffRequests,
  reviewStaffRequest,
  getPayrollPreview,
  runPayroll,
  getPayrollHistory,
} from '@/app/actions/staffSchedule';
import { getUsers, updateUserHourlyRate } from '@/app/actions/user';

type ShiftStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
type RequestType = 'LEAVE' | 'SHIFT_SWAP';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface StaffUser {
  id: string;
  name: string;
  username: string;
  hourlyRate?: number;
  roles?: string[];
}

type DateLike = string | Date;

interface AttendanceData {
  clockIn: DateLike | null;
  clockOut: DateLike | null;
}

interface ShiftData {
  id: string;
  date: DateLike;
  startTime: DateLike;
  endTime: DateLike;
  role: string;
  notes: string;
  status: ShiftStatus;
  assignments?: AssignmentData[];
}

interface AssignmentData {
  id: string;
  shiftId: string;
  userId: string;
  user: StaffUser;
  attendance: AttendanceData | null;
}

interface MyAssignment {
  id: string;
  shiftId: string;
  shift: ShiftData;
  attendance: AttendanceData | null;
}

interface StaffRequestData {
  id: string;
  type: RequestType;
  status: RequestStatus;
  reason: string;
  startDate: DateLike | null;
  endDate: DateLike | null;
  createdAt: DateLike;
  user?: StaffUser;
  targetUser?: StaffUser | null;
  sourceAssignment?: { shift: ShiftData } | null;
}

interface PayrollPaymentData {
  id: string;
  userId: string;
  user?: { name: string };
  periodStart: DateLike;
  periodEnd: DateLike;
  totalHours: number;
  hourlyRate: number;
  totalAmount: number;
  createdAt: DateLike;
}

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  LEAVE: 'مرخصی',
  SHIFT_SWAP: 'جابجایی شیفت',
};

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  SCHEDULED: 'برنامه‌ریزی‌شده',
  COMPLETED: 'انجام‌شده',
  CANCELLED: 'لغوشده',
};

function toPersianDigits(num: number | string) {
  const d = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => d[parseInt(x)]);
}

function formatDateTime(value: DateLike | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDate(value: DateLike | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fa-IR');
}

function formatCurrency(amount: number) {
  return toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(amount)));
}

function formatHours(hours: number) {
  return toPersianDigits(hours.toFixed(1));
}

export default function StaffSchedulePage() {
  const { user } = useAuth();
  const hasRole = (role: string) => user?.roles?.includes(role);
  const isManager = hasRole('ADMIN');
  const canRunPayroll = hasRole('ADMIN') || hasRole('ACCOUNTANT');

  const tabs = [
    { key: 'my-shifts', label: '📅 شیفت‌های من' },
    { key: 'my-requests', label: '📝 درخواست‌های من' },
    ...(isManager ? [{ key: 'manage-shifts', label: '🗓️ مدیریت شیفت‌ها' }] : []),
    ...(isManager ? [{ key: 'review-requests', label: '✅ بررسی درخواست‌ها' }] : []),
    ...(canRunPayroll ? [{ key: 'payroll', label: '💵 حقوق و دستمزد' }] : []),
  ] as const;

  const [activeTab, setActiveTab] = useState<string>('my-shifts');

  // --- My shifts ---
  const [myAssignments, setMyAssignments] = useState<MyAssignment[]>([]);
  const [isLoadingMyShifts, setIsLoadingMyShifts] = useState(false);

  const fetchMyShifts = useCallback(async () => {
    setIsLoadingMyShifts(true);
    const res = await getMyShifts();
    if (res.success && res.assignments) setMyAssignments(res.assignments as MyAssignment[]);
    setIsLoadingMyShifts(false);
  }, []);

  useEffect(() => { fetchMyShifts(); }, [fetchMyShifts]);

  const handleClockIn = async (assignmentId: string) => {
    const res = await clockIn(assignmentId);
    if (res.success) fetchMyShifts();
    else alert(res.error || 'خطا در ثبت ورود');
  };

  const handleClockOut = async (assignmentId: string) => {
    const res = await clockOut(assignmentId);
    if (res.success) fetchMyShifts();
    else alert(res.error || 'خطا در ثبت خروج');
  };

  // --- Staff directory (for swap-target / assignment pickers) ---
  const [directory, setDirectory] = useState<StaffUser[]>([]);
  useEffect(() => {
    getStaffDirectory().then((res) => {
      if (res.success && res.users) setDirectory(res.users as StaffUser[]);
    });
  }, []);

  // --- My requests ---
  const [myRequests, setMyRequests] = useState<StaffRequestData[]>([]);
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('LEAVE');
  const [requestForm, setRequestForm] = useState({
    reason: '', startDate: '', endDate: '', sourceAssignmentId: '', targetUserId: '',
  });
  const [requestError, setRequestError] = useState('');

  const fetchMyRequests = useCallback(async () => {
    setIsLoadingMyRequests(true);
    const res = await getMyStaffRequests();
    if (res.success && res.requests) setMyRequests(res.requests as StaffRequestData[]);
    setIsLoadingMyRequests(false);
  }, []);

  useEffect(() => { fetchMyRequests(); }, [fetchMyRequests]);

  const openRequestModal = (type: RequestType) => {
    setRequestType(type);
    setRequestForm({ reason: '', startDate: '', endDate: '', sourceAssignmentId: '', targetUserId: '' });
    setRequestError('');
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    setRequestError('');
    const res = await createStaffRequest({
      type: requestType,
      reason: requestForm.reason,
      startDate: requestForm.startDate || undefined,
      endDate: requestForm.endDate || undefined,
      sourceAssignmentId: requestForm.sourceAssignmentId || undefined,
      targetUserId: requestForm.targetUserId || undefined,
    });
    if (res.success) {
      setIsRequestModalOpen(false);
      fetchMyRequests();
    } else {
      setRequestError(res.error || 'خطا در ثبت درخواست');
    }
  };

  const handleCancelMyRequest = async (id: string) => {
    if (!window.confirm('آیا از لغو این درخواست اطمینان دارید؟')) return;
    const res = await cancelMyStaffRequest(id);
    if (res.success) fetchMyRequests();
    else alert(res.error || 'خطا در لغو درخواست');
  };

  // شیفت‌های آینده‌ی خودم که هنوز حضوری برایشان ثبت نشده، برای انتخاب در درخواست جابجایی
  const swappableAssignments = myAssignments.filter((a) => !a.attendance?.clockIn && a.shift.status !== 'CANCELLED');

  // --- Manage shifts (ADMIN) ---
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ date: '', startTime: '', endTime: '', role: '', notes: '' });
  const [shiftError, setShiftError] = useState('');
  const [assigningShift, setAssigningShift] = useState<ShiftData | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  const fetchShifts = useCallback(async () => {
    if (!isManager) return;
    setIsLoadingShifts(true);
    const res = await getShifts();
    if (res.success && res.shifts) setShifts(res.shifts as ShiftData[]);
    setIsLoadingShifts(false);
  }, [isManager]);

  useEffect(() => {
    if (activeTab === 'manage-shifts') fetchShifts();
  }, [activeTab, fetchShifts]);

  const handleSaveShift = async () => {
    setShiftError('');
    if (!shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) {
      setShiftError('تاریخ و ساعت شروع/پایان الزامی است');
      return;
    }
    const res = await createShift(shiftForm);
    if (res.success) {
      setIsShiftModalOpen(false);
      setShiftForm({ date: '', startTime: '', endTime: '', role: '', notes: '' });
      fetchShifts();
    } else {
      setShiftError(res.error || 'خطا در ثبت شیفت');
    }
  };

  const handleCancelShift = async (id: string) => {
    if (!window.confirm('آیا از لغو این شیفت اطمینان دارید؟')) return;
    const res = await cancelShift(id);
    if (res.success) fetchShifts();
    else alert(res.error || 'خطا در لغو شیفت');
  };

  const openAssignModal = (shift: ShiftData) => {
    setAssigningShift(shift);
    setAssignUserId('');
  };

  const handleAssign = async () => {
    if (!assigningShift || !assignUserId) return;
    const res = await assignStaffToShift(assigningShift.id, assignUserId);
    if (res.success) {
      setAssigningShift(null);
      fetchShifts();
    } else {
      alert(res.error || 'خطا در تخصیص پرسنل');
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    if (!window.confirm('آیا از حذف این تخصیص اطمینان دارید؟')) return;
    const res = await unassignStaffFromShift(assignmentId);
    if (res.success) fetchShifts();
    else alert(res.error || 'خطا در حذف تخصیص');
  };

  // --- Review requests (ADMIN) ---
  const [pendingRequests, setPendingRequests] = useState<StaffRequestData[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<RequestStatus | 'ALL'>('PENDING');

  const fetchAllRequests = useCallback(async () => {
    if (!isManager) return;
    setIsLoadingRequests(true);
    const res = await getStaffRequests(requestFilter === 'ALL' ? undefined : requestFilter);
    if (res.success && res.requests) setPendingRequests(res.requests as StaffRequestData[]);
    setIsLoadingRequests(false);
  }, [isManager, requestFilter]);

  useEffect(() => {
    if (activeTab === 'review-requests') fetchAllRequests();
  }, [activeTab, fetchAllRequests]);

  const handleReview = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const res = await reviewStaffRequest(id, decision);
    if (res.success) fetchAllRequests();
    else alert(res.error || 'خطا در بررسی درخواست');
  };

  // --- Payroll ---
  const [payrollUserId, setPayrollUserId] = useState('');
  const [payrollStart, setPayrollStart] = useState('');
  const [payrollEnd, setPayrollEnd] = useState('');
  const [payrollPreview, setPayrollPreview] = useState<{ totalHours: number; hourlyRate: number; totalAmount: number } | null>(null);
  const [payrollError, setPayrollError] = useState('');
  const [isRunningPayroll, setIsRunningPayroll] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState<PayrollPaymentData[]>([]);
  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);

  const fetchPayrollHistory = useCallback(async () => {
    if (!canRunPayroll) return;
    const res = await getPayrollHistory();
    if (res.success && res.payments) setPayrollHistory(res.payments as PayrollPaymentData[]);
  }, [canRunPayroll]);

  useEffect(() => {
    if (activeTab === 'payroll') {
      fetchPayrollHistory();
      if (isManager) {
        getUsers().then((res: any) => { if (res.success && res.users) setAllUsers(res.users); });
      }
    }
  }, [activeTab, fetchPayrollHistory, isManager]);

  const handlePreviewPayroll = async () => {
    setPayrollError('');
    setPayrollPreview(null);
    if (!payrollUserId || !payrollStart || !payrollEnd) {
      setPayrollError('کاربر و بازه‌ی زمانی را انتخاب کنید');
      return;
    }
    const res = await getPayrollPreview(payrollUserId, payrollStart, payrollEnd);
    if (res.success && res.preview) setPayrollPreview(res.preview);
    else setPayrollError(res.error || 'خطا در محاسبه پیش‌نمایش');
  };

  const handleRunPayroll = async () => {
    if (!payrollUserId || !payrollStart || !payrollEnd) return;
    if (!window.confirm('آیا از ثبت نهایی این پرداخت حقوق اطمینان دارید؟')) return;
    setIsRunningPayroll(true);
    const res = await runPayroll(payrollUserId, payrollStart, payrollEnd);
    setIsRunningPayroll(false);
    if (res.success) {
      setPayrollPreview(null);
      fetchPayrollHistory();
      alert('پرداخت حقوق با موفقیت ثبت شد.');
    } else {
      setPayrollError(res.error || 'خطا در اجرای حقوق‌دهی');
    }
  };

  const handleUpdateRate = async (userId: string, rate: number) => {
    const res = await updateUserHourlyRate(userId, rate);
    if (res.success) {
      setAllUsers(allUsers.map((u) => (u.id === userId ? { ...u, hourlyRate: rate } : u)));
    } else {
      alert(res.error || 'خطا در به‌روزرسانی نرخ ساعتی');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">پرسنل و شیفت‌بندی</h1>
          <p className="text-gray-500 mt-1 mb-6 text-sm">شیفت‌ها، حضور و غیاب، درخواست‌های پرسنل و حقوق و دستمزد</p>

          <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${
                  activeTab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'my-shifts' && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[200px]">
          {isLoadingMyShifts ? (
            <div className="flex justify-center items-center h-[200px]">
              <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
            </div>
          ) : myAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">هیچ شیفتی برای شما ثبت نشده است.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myAssignments.map((a) => (
                <div key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">
                      {formatDate(a.shift.date)} — {formatDateTime(a.shift.startTime).split(' ')[1]} تا {formatDateTime(a.shift.endTime).split(' ')[1]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {a.shift.role && <span className="ml-2">نقش: {a.shift.role}</span>}
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                        a.shift.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>{SHIFT_STATUS_LABELS[a.shift.status]}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {a.attendance?.clockIn && (
                      <span className="text-xs text-gray-500">ورود: {formatDateTime(a.attendance.clockIn)}</span>
                    )}
                    {a.attendance?.clockOut && (
                      <span className="text-xs text-gray-500">خروج: {formatDateTime(a.attendance.clockOut)}</span>
                    )}
                    {a.shift.status !== 'CANCELLED' && !a.attendance?.clockIn && (
                      <button onClick={() => handleClockIn(a.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs">ثبت ورود</button>
                    )}
                    {a.attendance?.clockIn && !a.attendance?.clockOut && (
                      <button onClick={() => handleClockOut(a.id)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs">ثبت خروج</button>
                    )}
                    {a.attendance?.clockIn && a.attendance?.clockOut && (
                      <span className="bg-gray-100 text-gray-500 font-bold py-1.5 px-3 rounded-lg text-xs">تکمیل‌شده</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">درخواست‌های مرخصی و جابجایی شیفت من</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => openRequestModal('LEAVE')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">➕ درخواست مرخصی</button>
              <button onClick={() => openRequestModal('SHIFT_SWAP')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm">🔄 درخواست جابجایی شیفت</button>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[150px]">
            {isLoadingMyRequests ? (
              <div className="flex justify-center items-center h-[150px]">
                <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">هیچ درخواستی ثبت نکرده‌اید.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myRequests.map((r) => (
                  <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{REQUEST_TYPE_LABELS[r.type]}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {r.type === 'LEAVE' ? (
                          <span>از {formatDate(r.startDate)} تا {formatDate(r.endDate)}</span>
                        ) : (
                          <span>شیفت {formatDate(r.sourceAssignment?.shift.date)} ← {r.targetUser?.name}</span>
                        )}
                        {r.reason && <span className="mr-2">— {r.reason}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${REQUEST_STATUS_COLORS[r.status]}`}>{REQUEST_STATUS_LABELS[r.status]}</span>
                      {r.status === 'PENDING' && (
                        <button onClick={() => handleCancelMyRequest(r.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-semibold border border-red-100">لغو</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manage-shifts' && isManager && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">لیست شیفت‌ها</h2>
            <button onClick={() => { setShiftError(''); setIsShiftModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">➕ تعریف شیفت جدید</button>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[200px]">
            {isLoadingShifts ? (
              <div className="flex justify-center items-center h-[200px]">
                <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">هیچ شیفتی تعریف نشده است.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {shifts.map((s) => (
                  <div key={s.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-gray-900">
                          {formatDate(s.date)} — {formatDateTime(s.startTime).split(' ')[1]} تا {formatDateTime(s.endTime).split(' ')[1]}
                          {s.role && <span className="text-xs text-gray-500 mr-2">({s.role})</span>}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                          s.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>{SHIFT_STATUS_LABELS[s.status]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.status !== 'CANCELLED' && (
                          <button onClick={() => openAssignModal(s)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md text-xs font-semibold border border-blue-100">تخصیص پرسنل</button>
                        )}
                        {s.status !== 'CANCELLED' && (
                          <button onClick={() => handleCancelShift(s.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-semibold border border-red-100">لغو شیفت</button>
                        )}
                      </div>
                    </div>

                    {(s.assignments?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(s.assignments || []).map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-md">
                            {a.user.name}
                            {a.attendance?.clockIn && <span className="text-emerald-600">✓</span>}
                            {!a.attendance?.clockIn && (
                              <button onClick={() => handleUnassign(a.id)} className="text-red-500 hover:text-red-700 mr-1">✕</button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'review-requests' && isManager && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">بررسی درخواست‌های پرسنل</h2>
            <select value={requestFilter} onChange={(e) => setRequestFilter(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="PENDING">در انتظار</option>
              <option value="APPROVED">تأیید شده</option>
              <option value="REJECTED">رد شده</option>
              <option value="CANCELLED">لغو شده</option>
              <option value="ALL">همه</option>
            </select>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-h-[150px]">
            {isLoadingRequests ? (
              <div className="flex justify-center items-center h-[150px]">
                <span className="text-gray-500 font-bold animate-pulse">درحال دریافت اطلاعات...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">درخواستی در این وضعیت وجود ندارد.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{r.user?.name} — {REQUEST_TYPE_LABELS[r.type]}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {r.type === 'LEAVE' ? (
                          <span>از {formatDate(r.startDate)} تا {formatDate(r.endDate)}</span>
                        ) : (
                          <span>شیفت {formatDate(r.sourceAssignment?.shift.date)} ← {r.targetUser?.name}</span>
                        )}
                        {r.reason && <span className="mr-2">— {r.reason}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${REQUEST_STATUS_COLORS[r.status]}`}>{REQUEST_STATUS_LABELS[r.status]}</span>
                      {r.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleReview(r.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs">تأیید</button>
                          <button onClick={() => handleReview(r.id, 'REJECTED')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs">رد</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && canRunPayroll && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">محاسبه و ثبت حقوق</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={payrollUserId} onChange={(e) => { setPayrollUserId(e.target.value); setPayrollPreview(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">انتخاب پرسنل...</option>
                {directory.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input type="date" value={payrollStart} onChange={(e) => setPayrollStart(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={payrollEnd} onChange={(e) => setPayrollEnd(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={handlePreviewPayroll} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">محاسبه پیش‌نمایش</button>
            </div>
            {payrollError && <div className="text-red-600 text-sm font-bold">{payrollError}</div>}
            {payrollPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  <span className="font-bold">{formatHours(payrollPreview.totalHours)}</span> ساعت کار پرداخت‌نشده ×{' '}
                  <span className="font-bold">{formatCurrency(payrollPreview.hourlyRate)}</span> تومان در ساعت
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-gray-900">{formatCurrency(payrollPreview.totalAmount)} تومان</span>
                  <button disabled={isRunningPayroll || payrollPreview.totalAmount <= 0} onClick={handleRunPayroll} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm">ثبت نهایی پرداخت</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">تاریخچه پرداخت حقوق</h2></div>
            {payrollHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">هنوز پرداختی ثبت نشده است.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-right">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600">پرسنل</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600">بازه</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 text-left">ساعت</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 text-left">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {payrollHistory.map((p) => (
                      <tr key={p.id}>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">{p.user?.name}</td>
                        <td className="px-6 py-3 text-xs text-gray-600">{formatDate(p.periodStart)} تا {formatDate(p.periodEnd)}</td>
                        <td className="px-6 py-3 text-left text-sm">{formatHours(p.totalHours)}</td>
                        <td className="px-6 py-3 text-left text-sm font-bold">{formatCurrency(p.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {isManager && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">نرخ دستمزد ساعتی پرسنل</h2>
                <p className="text-xs text-gray-500 mt-1">مبنای محاسبه حقوق از روی ساعات ثبت‌شده حضور و غیاب</p>
              </div>
              <div className="divide-y divide-gray-100">
                {allUsers.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-900">{u.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        defaultValue={u.hourlyRate ?? 0}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (Number.isFinite(val) && val !== u.hourlyRate) handleUpdateRate(u.id, val);
                        }}
                        className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-left"
                      />
                      <span className="text-xs text-gray-500">تومان/ساعت</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {requestType === 'LEAVE' ? 'درخواست مرخصی' : 'درخواست جابجایی شیفت'}
            </h3>
            {requestError && <div className="text-red-600 text-sm font-bold">{requestError}</div>}

            {requestType === 'LEAVE' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">از تاریخ</label>
                  <input type="date" value={requestForm.startDate} onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">تا تاریخ</label>
                  <input type="date" value={requestForm.endDate} onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
            ) : (

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">شیفت مورد نظر</label>
                  <select value={requestForm.sourceAssignmentId} onChange={(e) => setRequestForm({ ...requestForm, sourceAssignmentId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">انتخاب شیفت...</option>
                    {swappableAssignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.shift.date)} — {formatDateTime(a.shift.startTime).split(' ')[1]} تا {formatDateTime(a.shift.endTime).split(' ')[1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">همکار مقصد</label>
                  <select value={requestForm.targetUserId} onChange={(e) => setRequestForm({ ...requestForm, targetUserId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">انتخاب همکار...</option>
                    {directory.filter((u) => u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-600">توضیح (اختیاری)</label>
              <textarea value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">انصراف</button>
              <button onClick={handleSubmitRequest} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">ثبت درخواست</button>
            </div>
          </div>
        </div>
      )}

      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">تعریف شیفت جدید</h3>
            {shiftError && <div className="text-red-600 text-sm font-bold">{shiftError}</div>}
            <div>
              <label className="text-xs font-bold text-gray-600">تاریخ</label>
              <input type="date" value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600">ساعت شروع</label>
                <input type="datetime-local" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600">ساعت پایان</label>
                <input type="datetime-local" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600">نقش/پست (اختیاری)</label>
              <input type="text" value={shiftForm.role} onChange={(e) => setShiftForm({ ...shiftForm, role: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="مثلاً صندوق‌دار" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">یادداشت (اختیاری)</label>
              <textarea value={shiftForm.notes} onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsShiftModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">انصراف</button>
              <button onClick={handleSaveShift} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">ثبت شیفت</button>
            </div>
          </div>
        </div>
      )}

      {assigningShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">تخصیص پرسنل به شیفت</h3>
            <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">انتخاب پرسنل...</option>
              {directory.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAssigningShift(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">انصراف</button>
              <button onClick={handleAssign} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">تخصیص</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
