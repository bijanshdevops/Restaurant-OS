"use client";

import { useInventory } from '../hooks/useInventory';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toPersianDigits } from '../../../shared/utils/formatters';

export function InventoryTable() {
  const { data, isLoading, error } = useInventory();

  if (isLoading) {
    return <div className="h-64 bg-gray-50 animate-pulse m-6 rounded-lg" />;
  }

  if (error || !data) {
    return <div className="m-6 p-4 bg-red-50 text-red-600 rounded-xl">خطا: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4">نام کالا</th>
            <th className="px-6 py-4">موجودی</th>
            <th className="px-6 py-4">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isOut = item.status === 'OUT_OF_STOCK';
            const isLow = item.status === 'LOW_STOCK';
            
            return (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{item.itemName}</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {toPersianDigits(item.currentStock)}
                  </span>
                  <span className="text-gray-400 ms-1 text-xs">/ {toPersianDigits(item.threshold)} (حداقل)</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {isOut ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : isLow ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    <span className={
                      isOut ? 'text-red-600 font-medium' : 
                      isLow ? 'text-yellow-600 font-medium' : 
                      'text-green-600 font-medium'
                    }>
                      {isOut ? 'ناموجود' : isLow ? 'رو به اتمام' : 'موجود'}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
