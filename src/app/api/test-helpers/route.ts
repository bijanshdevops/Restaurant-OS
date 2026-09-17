import { NextRequest, NextResponse } from 'next/server';
import { loginUser, logoutUser, createUser, updateUserHourlyRate, updateUserBranch } from '@/app/actions/user';
import { getBranches, createBranch, updateBranch, setBranchActive, setDefaultBranch } from '@/app/actions/branch';
import { getMenuItems, createMenuItem, updateMenuItem, getPublicMenuItems } from '@/app/actions/menu';
import {
  createOrder,
  getActiveOrders,
  updateOrderStatus,
  createOnlineOrder,
  getMyOnlineOrder,
  finalizeOnlineOrderAfterPayment,
  markOnlineOrderPaymentFailed,
} from '@/app/actions/order';
import { getTables, createTable, updateTableStatus, createReservation, getReservations, updateReservationStatus } from '@/app/actions/reservation';
import { getSettings, updateSettings, updateModianSettings, getPublicOrderSettings } from '@/app/actions/settings';
import { getUsers } from '@/app/actions/user';
import {
  getCustomers,
  createCustomer,
  getCustomerDetail,
  addCustomerNote,
  updateCustomerProfile,
  getCustomerSegmentPreview,
  getDistinctCustomerTags,
  getUpcomingBirthdayCustomers,
} from '@/app/actions/crm';
import { createCampaign, sendCampaign, getCampaigns, getCampaignDetail } from '@/app/actions/marketing';
import { submitOrderFeedback, getFeedbackList } from '@/app/actions/feedback';
import { requestOtp, verifyOtp, logoutCustomer, getCustomerProfile, getMyReferralInfo } from '@/app/actions/customerAuth';
import {
  getCouriers,
  createCourier,
  setCourierActive,
  getDeliveryBoard,
  assignCourier,
  advanceDeliveryStatus,
  markDeliveryFailed,
} from '@/app/actions/delivery';
import { getInventoryItems, createInventoryItem, restockInventoryItem } from '@/app/actions/inventory';
import { getMenuCostAnalysis, getMenuItemRecipe, saveMenuItemRecipe, updateInventoryItemCost } from '@/app/actions/costing';
import {
  getTransactions,
  createExpense,
  createIncome,
  updateTransactionCategory,
  deleteTransaction,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFinancialSummary,
  getProfitAndLossReport,
  exportTransactionsToExcel,
} from '@/app/actions/accounting';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierActive,
  recordSupplierPayment,
  getSupplierLedger,
} from '@/app/actions/supplier';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  markPurchaseOrderOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrderItems,
  getLowStockItems,
  getItemPriceHistory,
} from '@/app/actions/purchaseOrder';
import {
  getShifts,
  createShift,
  cancelShift,
  assignStaffToShift,
  unassignStaffFromShift,
  getMyShifts,
  clockIn,
  clockOut,
  getStaffDirectory,
  createStaffRequest,
  getMyStaffRequests,
  cancelMyStaffRequest,
  getStaffRequests,
  reviewStaffRequest,
  getPayrollPreview,
  runPayroll,
  getPayrollHistory,
} from '@/app/actions/staffSchedule';

/**
 * دروازه‌ی کمکی مخصوص تست‌های خودکار (Vitest / CI).
 *
 * این روت فقط وقتی ENABLE_TEST_ROUTES=1 باشد فعال است (که فقط در محیط CI/تست
 * تنظیم می‌شود، هرگز در تولید). هدفش این است که اکشن‌های سرور واقعی را از داخل
 * یک درخواست واقعی Next.js صدا بزند تا next/headers (cookies) به‌درستی کار کند —
 * چیزی که فراخوانی مستقیم Server Action از بیرون فریم‌ورک (مثلاً از Vitest) اجازه
 * نمی‌دهد. خودِ منطق امنیتی/RBAC هر اکشن دست‌نخورده باقی می‌ماند؛ این فقط یک لایه
 * انتقال (transport) است.
 */

const actions: Record<string, (...args: any[]) => Promise<any>> = {
  login: loginUser,
  logout: logoutUser,
  createUser,
  getUsers,
  updateUserBranch,
  getBranches,
  createBranch,
  updateBranch,
  setBranchActive,
  setDefaultBranch,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  createOrder,
  getActiveOrders,
  updateOrderStatus,
  getTables,
  createTable,
  updateTableStatus,
  createReservation,
  getReservations,
  updateReservationStatus,
  getSettings,
  updateSettings,
  updateModianSettings,
  getPublicOrderSettings,
  getPublicMenuItems,
  requestOtp,
  verifyOtp,
  logoutCustomer,
  getCustomerProfile,
  getMyReferralInfo,
  createOnlineOrder,
  getMyOnlineOrder,
  finalizeOnlineOrderAfterPayment,
  markOnlineOrderPaymentFailed,
  getCouriers,
  createCourier,
  setCourierActive,
  getDeliveryBoard,
  assignCourier,
  advanceDeliveryStatus,
  markDeliveryFailed,
  getCustomers,
  createCustomer,
  getCustomerDetail,
  addCustomerNote,
  updateCustomerProfile,
  getCustomerSegmentPreview,
  getDistinctCustomerTags,
  getUpcomingBirthdayCustomers,
  createCampaign,
  sendCampaign,
  getCampaigns,
  getCampaignDetail,
  submitOrderFeedback,
  getFeedbackList,
  getInventoryItems,
  createInventoryItem,
  restockInventoryItem,
  getMenuCostAnalysis,
  getMenuItemRecipe,
  saveMenuItemRecipe,
  updateInventoryItemCost,
  getTransactions,
  createExpense,
  createIncome,
  updateTransactionCategory,
  deleteTransaction,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFinancialSummary,
  getProfitAndLossReport,
  exportTransactionsToExcel,
  getSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierActive,
  recordSupplierPayment,
  getSupplierLedger,
  getPurchaseOrders,
  createPurchaseOrder,
  markPurchaseOrderOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrderItems,
  getLowStockItems,
  getItemPriceHistory,
  updateUserHourlyRate,
  getShifts,
  createShift,
  cancelShift,
  assignStaffToShift,
  unassignStaffFromShift,
  getMyShifts,
  clockIn,
  clockOut,
  getStaffDirectory,
  createStaffRequest,
  getMyStaffRequests,
  cancelMyStaffRequest,
  getStaffRequests,
  reviewStaffRequest,
  getPayrollPreview,
  runPayroll,
  getPayrollHistory,
};

function guard() {
  return process.env.ENABLE_TEST_ROUTES === '1';
}

export async function POST(req: NextRequest) {
  if (!guard()) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, args } = body as { action: string; args?: any[] };
  const fn = actions[action];

  if (!fn) {
    return NextResponse.json({ error: 'unknown action: ' + action }, { status: 400 });
  }

  try {
    const result = await fn(...(args || []));
    return NextResponse.json(result ?? { success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
