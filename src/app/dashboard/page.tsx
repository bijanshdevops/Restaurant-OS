import { AnalyticsSummary } from './components/AnalyticsSummary';
import { InventoryTable } from './components/InventoryTable';
import { RecentOrders } from './components/RecentOrders';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">داشبورد</h1>
        <p className="mt-1 text-sm text-gray-500">
          نمایی کلی از عملکرد، موجودی و فعالیت‌های اخیر رستوران شما.
        </p>
      </div>

      {/* Top Row: Analytics Summary */}
      <section>
        <AnalyticsSummary />
      </section>

      {/* Bottom Row: Two Columns for Inventory and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">وضعیت موجودی</h2>
          </div>
          <InventoryTable />
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">سفارشات اخیر</h2>
          </div>
          <RecentOrders />
        </section>
      </div>
    </div>
  );
}
