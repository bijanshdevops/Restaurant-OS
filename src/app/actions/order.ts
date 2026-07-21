"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { OrderStatus } from '@prisma/client';

interface CartItem {
  menuItemId: string;
  quantity: number;
  price: number;
}

export async function createOrder(cartItems: CartItem[], totalAmount: number) {
  try {
    // Generate a short unique order number (e.g. ORD-8A3B)
    const orderNumber = `ORD-${randomBytes(2).toString('hex').toUpperCase()}`;

    // We use a Prisma transaction to ensure the order and its items are created atomically
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the main order
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          status: 'PENDING',
        },
      });

      // 2. Create the associated order items
      await tx.orderItem.createMany({
        data: cartItems.map(item => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceAtTime: item.price,
        })),
      });

      // 3. Automatically record INCOME in the accounting system
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          description: `درآمد از سفارش ${orderNumber}`,
          amount: totalAmount,
        },
      });

      return order;
    });

    return { success: true, order: newOrder };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Failed to create order' };
  }
}

export async function getActiveOrders() {
  try {
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          not: 'COMPLETED',
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { success: true, orders: activeOrders };
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return { success: false, error: 'Failed to fetch active orders' };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}
