"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { OrderStatus, Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { requireCustomer } from '@/lib/customerAuth';
import { awardLoyaltyForOrder } from '@/lib/loyalty';

interface CartItem {
  menuItemId: string;
  quantity: number;
}

/**
 * Re-fetches the real, current price for every cart item from the database
 * and validates availability/quantity. The client only ever sends a
 * menuItemId + quantity — price and total are NEVER trusted from the
 * browser, since a tampered request could otherwise place an order at any
 * price it likes. Shared by both the POS flow (createOrder) and the
 * customer-facing online ordering flow (createOnlineOrder).
 */
async function verifyCartItems(
  tx: Prisma.TransactionClient,
  cartItems: CartItem[]
) {
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

  return { menuItemMap, subtotal };
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
      // from the database — see verifyCartItems for why this can't be trusted
      // from the client.
      const { menuItemMap, subtotal } = await verifyCartItems(tx, cartItems);

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

      // 6. Award loyalty points / recompute tier, if a customer was attached
      if (customerId) {
        await awardLoyaltyForOrder(tx, {
          customerId,
          orderId: order.id,
          orderNumber,
          totalAmount,
          pointsRedeemed: 0,
          pointsPerTenThousand: settings?.loyaltyPointsPerTenThousand ?? 1,
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

/**
 * Places a customer-facing online/delivery order. Unlike the POS flow
 * (createOrder), this does NOT deduct inventory, book income, or touch
 * loyalty points/customer stats immediately — the order sits in
 * AWAITING_PAYMENT until the ZarinPal payment is confirmed (see
 * confirmOnlineOrderPayment in payment.ts), so an abandoned/failed payment
 * never depletes stock or awards points for a sale that never happened.
 */
export async function createOnlineOrder(
  cartItems: CartItem[],
  deliveryAddress: string,
  pointsToRedeem: number = 0
) {
  const auth = await requireCustomer();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'سبد سفارش خالی است' };
  }
  if (!deliveryAddress || !deliveryAddress.trim()) {
    return { success: false, error: 'آدرس تحویل را وارد کنید' };
  }
  const redeemRequested = Math.max(0, Math.floor(pointsToRedeem || 0));

  try {
    const orderNumber = `ORD-${randomBytes(2).toString('hex').toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const { menuItemMap, subtotal } = await verifyCartItems(tx, cartItems);

      const [settings, customer] = await Promise.all([
        tx.restaurantSettings.findUnique({ where: { id: 'default' } }),
        tx.customer.findUnique({ where: { id: auth.customer.id } }),
      ]);
      if (!customer) throw new Error('مشتری یافت نشد');

      const taxAmount = settings ? Math.round((subtotal * settings.taxPercentage) / 100) : 0;
      const packagingCost = settings?.packagingCost ?? 0;
      const deliveryFee = settings?.defaultDeliveryFee ?? 0;
      const pointValue = settings?.loyaltyPointValueToman ?? 1000;

      const preDiscountTotal = subtotal + taxAmount + packagingCost + deliveryFee;

      // Never let a customer redeem more points than they actually have, and
      // never let the discount take the order below zero — both are enforced
      // server-side regardless of what the client asked for.
      const maxRedeemableByBalance = Math.max(0, customer.pointsBalance);
      const maxRedeemableByOrderValue = Math.floor(preDiscountTotal / Math.max(pointValue, 1));
      const pointsRedeemed = Math.min(redeemRequested, maxRedeemableByBalance, maxRedeemableByOrderValue);
      const discount = pointsRedeemed * pointValue;
      const totalAmount = Math.max(0, preDiscountTotal - discount);

      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          status: 'AWAITING_PAYMENT',
          channel: 'ONLINE_DELIVERY',
          customerId: customer.id,
          deliveryAddress: deliveryAddress.trim(),
          deliveryFee,
          pointsRedeemed,
        },
      });

      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceAtTime: menuItemMap.get(item.menuItemId)!.price,
        })),
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'ZARINPAL',
          status: 'PENDING',
          amount: totalAmount,
        },
      });

      return { order, payment };
    });

    return { success: true, order: result.order, payment: result.payment };
  } catch (error: any) {
    console.error('Error creating online order:', error);
    return { success: false, error: error?.message || 'خطا در ثبت سفارش' };
  }
}

export async function getMyOnlineOrder(orderId: string) {
  const auth = await requireCustomer();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: auth.customer.id },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        courier: true,
      },
    });
    if (!order) return { success: false, error: 'سفارش یافت نشد' };
    return { success: true, order };
  } catch (error) {
    console.error('Error fetching online order:', error);
    return { success: false, error: 'خطا در دریافت سفارش' };
  }
}

/**
 * Finalizes an online order once its payment has been confirmed by the
 * gateway: deducts inventory, books income, awards/redeems loyalty points,
 * and flips the order into the kitchen + delivery pipeline. Idempotent —
 * safe to call twice for the same order (e.g. a duplicated gateway
 * callback) since it only acts on orders still in AWAITING_PAYMENT.
 *
 * Not itself auth-gated: it's only ever called from the payment callback
 * route after the gateway signature/verify step has already succeeded,
 * never directly from the client.
 */
export async function finalizeOnlineOrderAfterPayment(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: { include: { recipeItems: true } } } } },
    });
    if (!order) throw new Error('سفارش یافت نشد');

    // Already finalized by a previous (e.g. duplicated) callback — no-op.
    if (order.status !== 'AWAITING_PAYMENT') {
      return order;
    }

    // 1. Deduct ingredient stock according to each item's recipe (BOM)
    const stockDeductions = new Map<string, number>();
    for (const item of order.items) {
      for (const recipeLine of item.menuItem.recipeItems) {
        const amount = recipeLine.quantity * item.quantity;
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

    // 2. Automatically record INCOME in the accounting system
    await tx.transaction.create({
      data: {
        type: 'INCOME',
        description: `درآمد از سفارش آنلاین ${order.orderNumber}`,
        amount: order.totalAmount,
      },
    });

    // 3. Award/redeem loyalty points and recompute tier
    let pointsEarned = 0;
    if (order.customerId) {
      const settings = await tx.restaurantSettings.findUnique({ where: { id: 'default' } });
      pointsEarned = await awardLoyaltyForOrder(tx, {
        customerId: order.customerId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        pointsRedeemed: order.pointsRedeemed,
        pointsPerTenThousand: settings?.loyaltyPointsPerTenThousand ?? 1,
      });
    }

    // 4. Move the order into the kitchen queue + delivery pipeline
    return tx.order.update({
      where: { id: order.id },
      data: { status: 'PENDING', deliveryStatus: 'PENDING_ASSIGNMENT', pointsEarned },
    });
  });
}

/** Cancels an order whose payment failed/was aborted (only from AWAITING_PAYMENT). */
export async function markOnlineOrderPaymentFailed(orderId: string) {
  try {
    await prisma.order.updateMany({
      where: { id: orderId, status: 'AWAITING_PAYMENT' },
      data: { status: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Error marking online order payment failed:', error);
  }
}
