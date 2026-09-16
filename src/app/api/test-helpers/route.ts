import { NextRequest, NextResponse } from 'next/server';
import { loginUser, logoutUser, createUser } from '@/app/actions/user';
import { getMenuItems, createMenuItem } from '@/app/actions/menu';
import { createOrder, getActiveOrders, updateOrderStatus } from '@/app/actions/order';
import { getTables, createTable, createReservation, getReservations, updateReservationStatus } from '@/app/actions/reservation';
import { getSettings, updateSettings, updateModianSettings } from '@/app/actions/settings';
import { getUsers } from '@/app/actions/user';

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
  getMenuItems,
  createMenuItem,
  createOrder,
  getActiveOrders,
  updateOrderStatus,
  getTables,
  createTable,
  createReservation,
  getReservations,
  updateReservationStatus,
  getSettings,
  updateSettings,
  updateModianSettings,
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
