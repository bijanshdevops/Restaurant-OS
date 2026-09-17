"use server";

import { prisma } from '@/lib/prisma';
import { DeliveryStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';

export async function getCouriers() {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const couriers = await prisma.courier.findMany({ orderBy: { createdAt: 'asc' } });
    return { success: true, couriers };
  } catch (error) {
    console.error('Error fetching couriers:', error);
    return { success: false, error: 'خطا در دریافت لیست پیک‌ها' };
  }
}

export async function createCourier(data: { name: string; phone: string }) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const courier = await prisma.courier.create({ data: { name: data.name, phone: data.phone } });
    return { success: true, courier };
  } catch (error) {
    console.error('Error creating courier:', error);
    return { success: false, error: 'خطا در ثبت پیک (شماره تکراری است؟)' };
  }
}

export async function setCourierActive(id: string, isActive: boolean) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const courier = await prisma.courier.update({ where: { id }, data: { isActive } });
    return { success: true, courier };
  } catch (error) {
    console.error('Error updating courier:', error);
    return { success: false, error: 'خطا در بروزرسانی پیک' };
  }
}

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'];

/** All online orders currently moving through the delivery pipeline (not yet delivered/failed). */
export async function getDeliveryBoard() {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const orders = await prisma.order.findMany({
      where: {
        channel: 'ONLINE_DELIVERY',
        deliveryStatus: { in: ACTIVE_DELIVERY_STATUSES },
      },
      include: {
        items: { include: { menuItem: true } },
        customer: true,
        courier: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching delivery board:', error);
    return { success: false, error: 'خطا در دریافت لیست تحویل‌ها' };
  }
}

export async function assignCourier(orderId: string, courierId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { courierId, deliveryStatus: 'ASSIGNED' },
    });
    return { success: true, order };
  } catch (error) {
    console.error('Error assigning courier:', error);
    return { success: false, error: 'خطا در تخصیص پیک' };
  }
}

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'ON_THE_WAY',
  ON_THE_WAY: 'DELIVERED',
};

/** Advances a delivery to its next natural status (ASSIGNED -> PICKED_UP -> ON_THE_WAY -> DELIVERED). */
export async function advanceDeliveryStatus(orderId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.deliveryStatus) {
      return { success: false, error: 'سفارش یافت نشد' };
    }
    const next = NEXT_STATUS[order.deliveryStatus];
    if (!next) {
      return { success: false, error: 'این سفارش در وضعیت قابل پیشروی نیست' };
    }

    const data: { deliveryStatus: DeliveryStatus; status?: 'COMPLETED' } =
      next === 'DELIVERED' ? { deliveryStatus: next, status: 'COMPLETED' } : { deliveryStatus: next };

    const updated = await prisma.order.update({ where: { id: orderId }, data });
    return { success: true, order: updated };
  } catch (error) {
    console.error('Error advancing delivery status:', error);
    return { success: false, error: 'خطا در بروزرسانی وضعیت ارسال' };
  }
}

export async function markDeliveryFailed(orderId: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryStatus: 'FAILED' },
    });
    return { success: true, order };
  } catch (error) {
    console.error('Error marking delivery failed:', error);
    return { success: false, error: 'خطا در ثبت شکست ارسال' };
  }
}
