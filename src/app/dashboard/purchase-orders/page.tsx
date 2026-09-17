"use client";

import { useState, useEffect, useCallback } from 'react';
import { getSuppliers } from '@/app/actions/supplier';
import { getInventoryItems } from '@/app/actions/inventory';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  markPurchaseOrderOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrderItems,
  getLowStockItems,
  getItemPriceHistory,
} from '@/app/actions/purchaseOrder';

const toFa = (num: number) => {
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return Math.round(num).toLocaleString('en-US').replace(/\d/g, (x) => digits[parseInt(x)]);
};

const formatDate = (v: string | Date) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date(v));

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  ORDERED: 'ثبت‌شده نزد تأمین‌کننده',
  PARTIALLY_RECEIVED: 'دریافت جزئی',
  RECEIVED: 'دریافت کامل',
  CANCELLED: 'لغو شده',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  ORDERED: 'bg-blue-100 text-blue-800 border-blue-200',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RECEIVED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

interface Line { inventoryItemId: string; quantity: number; unitCost: number }

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [draftItemId, setDraftItemId] = useState('');
  const [draftQty, setDraftQty] = useState('');
  const [draftCost, setDraftCost] = useState('');

  const [receiveTarget, setReceiveTarget] = useState<any | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});

  const [historyItemId, setHistoryItemId] = useState('');
  const [historyLines, setHistoryLines] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [ordersRes, suppliersRes, itemsRes, lowStockRes] = await Promise.all([
      getPurchaseOrders(),
      getSuppliers(),
      getInventoryItems(),
      getLowStockItems(),
    ]);
    if (ordersRes.success) setOrders(ordersRes.orders || []);
    if (suppliersRes.success) setSuppliers(suppliersRes.suppliers || []);
    if (itemsRes.success) setInventoryItems(itemsRes.items || []);
    if (lowStockRes.success) setLowStock(lowStockRes.items || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = (prefill?: { inventoryItemId: string; quantity: number }) => {
    setSupplierId('');
    setNotes('');
    setLines(prefill ? [{ inventoryItemId: prefill.inventoryItemId, quantity: prefill.quantity, unitCost: 0 }] : []);
    setDraftItemId('');
    setDraftQty('');
    setDraftCost('');
    setIsCreateOpen(true);
  };

  const addLine = () => {
    const qty = parseFloat(draftQty);
    const cost = parseFloat(draftCost);
    if (!draftItemId) { alert('یک کالا انتخاب کنید.'); return; }
    if (!qty || qty <= 0) { alert('تعداد را درست وارد کنید.'); return; }
    if (!Number.isFinite(cost) || cost < 0) { alert('قیمت خرید را درست وارد کنید.'); return; }
    setLines([...lines, { inventoryItemId: draftItemId, quantity: qty, unitCost: cost }]);
    setDraftItemId('');
    setDraftQty('');
    setDraftCost('');
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const itemName = (id: string) => inventoryItems.find((i) => i.id === id)?.name || id;

  const createTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

  const submitCreate = async () => {
    if (!supplierId) { alert('تأمین‌کننده را انتخاب کنید.'); return; }
    if (lines.length === 0) { alert('حداقل یک قلم کالا اضافه کنید.'); return; }
    const res = await createPurchaseOrder({ supplierId, items: lines, notes });
    if (res.success) {
      setIsCreateOpen(false);
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت سفارش خرید');
    }
  };

  const handleMarkOrdered = async (id: string) => {
    const res = await markPurchaseOrderOrdered(id);
    if (res.success) fetchAll(); else alert(res.error);
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('این سفارش خرید لغو شود؟')) return;
    const res = await cancelPurchaseOrder(id);
    if (res.success) fetchAll(); else alert(res.error);
  };

  const openReceive = (po: any) => {
    setReceiveTarget(po);
    const initial: Record<string, string> = {};
    for (const item of po.items) {
      const remaining = item.quantityOrdered - item.quantityReceived;
      initial[item.id] = remaining > 0 ? String(remaining) : '';
    }
    setReceiveQty(initial);
  };

  const submitReceive = async () => {
    if (!receiveTarget) return;
    const receipts = Object.entries(receiveQty)
      .map(([purchaseOrderItemId, v]) => ({ purchaseOrderItemId, quantity: parseFloat(v) }))
      .filter((r) => r.quantity > 0);
    if (receipts.length === 0) { alert('حداقل مقدار دریافتی یک قلم را وارد کنید.'); return; }
    const res = await receivePurchaseOrderItems(receiveTarget.id, receipts);
    if (res.success) {
      setReceiveTarget(null);
      fetchAll();
    } else {
      alert(res.error || 'خطا در ثبت ورود کالا');
    }
  };

  const loadHistory = async (itemId: string) => {
    setHistoryItemId(itemId);
    if (!itemId) { setHistoryLines([]); return; }
    const res = await getItemPriceHistory(itemId);
    if (res.success) setHistoryLines(res.lines || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">سفارش‌های خرید</h1>
          <p className="text-gray-500 mt-1">چرخه کامل خرید از تأمین‌کننده تا دریافت کالا در انبار</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span>➕</span> سفارش خرید جدید
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-amber-800 mb-3">⚠️ کالاهای رو به اتمام — پیشنهاد سفارش مجدد</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((item) => (
              <div key={item.id} className="bg-white border border-amber-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    موجودی: {toFa(item.currentStock)} {item.unit} — نقطه سفارش: {toFa(item.minStockLevel)}
                  </div>
                </div>
                <button
                  onClick={() => openCreate({ inventoryItemId: item.id, quantity: item.suggestedQuantity })}
                  className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg"
                >
                  افزودن به سفارش ({toFa(item.suggestedQuantity)})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">تاریخچه قیمت خرید کالا</h2>
        <select
          value={historyItemId}
          onChange={(e) => loadHistory(e.target.value)}
          className="w-full md:w-72 border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
        >
          <option value="">— انتخاب کالا —</option>
          {inventoryItems.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {historyItemId && (
          <div className="mt-4 overflow-x-auto">
            {historyLines.length === 0 ? (
              <p className="text-xs text-gray-400">سابقه خریدی برای این کالا ثبت نشده.</p>
            ) : (
              <table className="min-w-full text-right text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="py-1.5 px-3">تاریخ</th>
                    <th className="py-1.5 px-3">تأمین‌کننده</th>
                    <th className="py-1.5 px-3">تعداد سفارش</th>
                    <th className="py-1.5 px-3">تعداد دریافتی</th>
                    <th className="py-1.5 px-3">قیمت واحد</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLines.map((l) => (
                    <tr key={l.id} className="border-t border-gray-100">
                      <td className="py-1.5 px-3">{formatDate(l.purchaseOrder.createdAt)}</td>
                      <td className="py-1.5 px-3 font-bold">{l.purchaseOrder.supplier.name}</td>
                      <td className="py-1.5 px-3">{toFa(l.quantityOrdered)}</td>
                      <td className="py-1.5 px-3">{toFa(l.quantityReceived)}</td>
                      <td className="py-1.5 px-3">{toFa(l.unitCost)} تومان</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">شماره سفارش</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">تأمین‌کننده</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">مبلغ کل</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">وضعیت</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600">تاریخ ثبت</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{po.supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold">{toFa(po.totalAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-md border ${STATUS_COLORS[po.status]}`}>
                        {STATUS_LABELS[po.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(po.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {po.status === 'DRAFT' && (
                          <>
                            <button onClick={() => handleMarkOrdered(po.id)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 font-bold text-xs">ثبت سفارش</button>
                            <button onClick={() => handleCancel(po.id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 font-bold text-xs">لغو</button>
                          </>
                        )}
                        {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                          <>
                            <button onClick={() => openReceive(po)} className="text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-100 font-bold text-xs">ثبت ورود کالا</button>
                            {po.status === 'ORDERED' && (
                              <button onClick={() => handleCancel(po.id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 font-bold text-xs">لغو</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">هنوز سفارش خریدی ثبت نشده.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">سفارش خرید جدید</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تأمین‌کننده <span className="text-red-500">*</span></label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500">
                  <option value="">— انتخاب کنید —</option>
                  {suppliers.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-bold text-gray-700">افزودن قلم کالا</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select value={draftItemId} onChange={(e) => setDraftItemId(e.target.value)}
                    className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">— کالا —</option>
                    {inventoryItems.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="تعداد" dir="ltr" value={draftQty} onChange={(e) => setDraftQty(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                  <input type="number" placeholder="قیمت واحد" dir="ltr" value={draftCost} onChange={(e) => setDraftCost(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <button onClick={addLine} className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg">افزودن به سفارش</button>
              </div>

              {lines.length > 0 && (
                <div className="space-y-2">
                  {lines.map((l, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <span className="font-bold text-gray-800">{itemName(l.inventoryItemId)}</span>
                      <span className="text-gray-600">{toFa(l.quantity)} × {toFa(l.unitCost)} = {toFa(l.quantity * l.unitCost)} تومان</span>
                      <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                    </div>
                  ))}
                  <div className="text-right text-sm font-bold text-gray-900 pt-1">جمع کل: {toFa(createTotal)} تومان</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">یادداشت</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={submitCreate} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">ثبت سفارش خرید (پیش‌نویس)</button>
            </div>
          </div>
        </div>
      )}

      {receiveTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">ثبت ورود کالا — سفارش {receiveTarget.poNumber}</h2>
              <button onClick={() => setReceiveTarget(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {receiveTarget.items.map((item: any) => {
                const remaining = item.quantityOrdered - item.quantityReceived;
                return (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-800">{item.inventoryItem.name}</span>
                      <span className="text-xs text-gray-500">
                        سفارش: {toFa(item.quantityOrdered)} — دریافت‌شده: {toFa(item.quantityReceived)} — باقی‌مانده: {toFa(remaining)}
                      </span>
                    </div>
                    <input
                      type="number"
                      dir="ltr"
                      disabled={remaining <= 0}
                      value={receiveQty[item.id] ?? ''}
                      onChange={(e) => setReceiveQty({ ...receiveQty, [item.id]: e.target.value })}
                      placeholder="مقدار دریافتی الان"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                    />
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
              <button onClick={() => setReceiveTarget(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100">انصراف</button>
              <button onClick={submitReceive} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700">ثبت ورود کالا</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
