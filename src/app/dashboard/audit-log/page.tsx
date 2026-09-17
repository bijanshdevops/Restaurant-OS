"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';
import { getAuditLogs, getAuditActionList } from '@/app/actions/auditLog';

interface AuditLogRow {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  success: boolean;
  createdAt: string | Date;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'ورود موفق',
  LOGIN_FAILURE: 'ورود ناموفق',
  USER_CREATED: 'ایجاد کاربر',
  USER_DELETED: 'حذف کاربر',
  TRANSACTION_DELETED: 'حذف تراکنش',
  TRANSACTION_UPDATED: 'ویرایش تراکنش',
  REFUND_CREATED: 'ثبت مرجوعی',
  SETTINGS_UPDATED: 'تغییر تنظیمات',
  PAYROLL_RUN: 'اجرای حقوق‌دهی',
};

const toPersianDigits = (num: number | string) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

const formatDate = (date: string | Date) =>
  toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date))
  );

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const res = await getAuditLogs({
      action: (actionFilter || undefined) as any,
      entityType: entityTypeFilter.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 200,
    });
    if (!res.success || !res.logs) {
      setError(res.error || 'خطا در دریافت لاگ');
      setIsLoading(false);
      return;
    }
    setLogs(res.logs as any);
    setIsLoading(false);
  }, [actionFilter, entityTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    getAuditActionList().then((res) => {
      if (res.success && res.actions) setActionOptions(res.actions as string[]);
    });
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">لاگ عملیات و ممیزی</h1>
          <p className="text-gray-500 mt-1">
            فقط رویدادهای حساس (حذف/ویرایش تراکنش، مرجوعی، تنظیمات، کاربران، حقوق‌دهی، ورود) ثبت می‌شوند.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">نوع رویداد</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">همه</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">نوع موجودیت</label>
          <input
            type="text"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            placeholder="مثال: Transaction"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">از تاریخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">تا تاریخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={loadLogs}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl transition-all shadow-sm text-sm"
        >
          اعمال فیلتر
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Log table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-right">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">زمان</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">عملگر</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">رویداد</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">موجودیت</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-center">وضعیت</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-bold text-gray-800">{log.actorName}</span>
                      {log.actorRole && <span className="text-xs text-gray-400 font-mono"> ({log.actorRole})</span>}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="px-2 py-1 rounded-full font-bold bg-blue-50 text-blue-700">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 font-mono" dir="ltr">
                      {log.entityType ? `${log.entityType}${log.entityId ? ' · ' + log.entityId.slice(0, 8) : ''}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {log.success ? 'موفق' : 'ناموفق'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-left">
                      {log.metadata && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          {expandedId === log.id ? 'بستن' : 'جزئیات'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.metadata && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50/70">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all" dir="ltr">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm font-medium">
                    هیچ رویدادی با این فیلتر یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
