"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { OrderStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';

interface CartItem {
  menuItemId: string;
  quantity: number;
}

export async function createOrder(cartItems: CartItem[], customerId?: string) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'سبد سفارش خالی است' };
    }

    // Generate a short unique order number (e.g. ORD-8A3B)
    const orderNumber = `ORD-${randomBytes(2).toString('hex').toUpperCase()}`;

    // We use a Prisma transaction to ensure the order and its items are created atomically
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Re-fetch the real, current price (and recipe/ingredients) for every item
      // from the database. The client only ever sends a menuItemId + quantity —
      // price and total are NEVER trusted from the browser, since a tampered
      // request could otherwise place an order at any price it likes.
      const menuItemIds = [...new Set(cartItems.map((c) => c.menuItemId))];
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: menuItemIds } },
        include: { recipeItems: true },
      });
      const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

      for (const cartItem of cartItems) {
        const menuItem = menuItemMap.get(cartItem.menuItemId);
        if (!menuItem) {
          throw new Error('یکی از اقلام سفارش دیگر در منو موجود نیست');
        }
        if (!menuItem.isAvailable) {
          throw new Error(`«${menuItem.title}» در حال حاضر ناموجود است`);
        }
        if (!Number.isFinite(cartItem.quantity) || cartItem.quantity <= 0) {
          throw new Error('تعداد نامعتبر در سفارش');
        }
      }

      const subtotal = cartItems.reduce((sum, c) => {
        const menuItem = menuItemMap.get(c.menuItemId)!;
        return sum + menuItem.price * c.quantity;
      }, 0);

      // Apply tax and packaging cost from the restaurant's own settings — read
      // from the database here, never from the client, so a tampered request
      // can't zero these out either.
      const settings = await tx.restaurantSettings.findUnique({ where: { id: 'default' } });
      const taxAmount = settings ? Math.round((subtotal * settings.taxPercentage) / 100) : 0;
      const packagingCost = settings?.packagingCost ?? 0;
      const totalAmount = subtotal + taxAmount + packagingCost;

      // 2. Create the main order
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          status: 'PENDING',
          customerId: customerId || null,
        },
      });

      // 3. Create the associated order items, using the server-verified price
      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceAtTime: menuItemMap.get(item.menuItemId)!.price,
        })),
      });

      // 4. Deduct ingredient stock according to each item's recipe (BOM)
      const stockDeductions = new Map<string, number>();
      for (const cartItem of cartItems) {
        const menuItem = menuItemMap.get(cartItem.menuItemId)!;
        for (const recipeLine of menuItem.recipeItems) {
          const amount = recipeLine.quantity * cartItem.quantity;
          stockDeductions.set(
            recipeLine.inventoryItemId,
            (stockDeductions.get(recipeLine.inventoryItemId) || 0) + amount
          );
        }
      }
      for (const [inventoryItemId, amount] of stockDeductions) {
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { currentStock: { decrement: amount } },
        });
      }

      // 5. Automatically record INCOME in the accounting system
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          description: `درآمد از سفارش ${orderNumber}`,
          amount: totalAmount,
        },
      });

      // 6. Update customer loyalty stats, if a customer was attached to this order
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: totalAmount },
          },
        });
      }

      return order;
    });

    return { success: true, order: newOrder };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { success: false, error: error?.message || 'Failed to create order' };
  }
}

export async function getActiveOrders() {
  const auth = await requireRole('ADMIN', 'CASHIER', 'CHEF');
  if (!auth.ok) return { success: false, error: auth.error };

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
  const auth = await requireRole('ADMIN', 'CASHIER', 'CHEF');
  if (!auth.ok) return { success: false, error: auth.error };

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
