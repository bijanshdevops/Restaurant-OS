"use server";

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { OrderStatus, Prisma } from '@prisma/client';
import { requireRole, resolveBranchFilter, resolveBranchForCreate, isBranchExempt } from '@/lib/auth';
import { requireCustomer } from '@/lib/customerAuth';
import { awardLoyaltyForOrder, pointsForAmount } from '@/lib/loyalty';
import { getDefaultBranchId } from './branch';
import { SYSTEM_CATEGORY_IDS } from '@/lib/accountingCategories';
import { computeIngredientUsagePerUnit } from '@/lib/recipeExpansion';
import { applyCouponWithinTx } from './coupon';
import { applyGiftCardWithinTx } from './giftCard';

interface CartItem {
  menuItemId: string;
  quantity: number;
  /** فاز ۱۳: شناسه‌ی مدیفایرها/افزودنی‌های انتخاب‌شده برای این ردیفِ سبد (اختیاری). */
  modifierIds?: string[];
}

interface ResolvedCartLine {
  cartItem: CartItem;
  menuItem: { id: string; title: string; price: number; isAvailable: boolean };
  /** قیمتِ واحد نهایی = قیمتِ پایه‌ی آیتم منو + مجموعِ priceDelta مدیفایرهای انتخابی. */
  unitPrice: number;
  selectedModifiers: { id: string; name: string; priceDelta: number }[];
}

/**
 * Re-fetches the real, current price for every cart item from the database
 * and validates availability/quantity. The client only ever sends a
 * menuItemId + quantity (+ optionally modifierIds) — price and total are
 * NEVER trusted from the browser, since a tampered request could otherwise
 * place an order at any price it likes. Shared by both the POS flow
 * (createOrder) and the customer-facing online ordering flow
 * (createOnlineOrder).
 *
 * فاز ۱۳: علاوه بر قیمتِ پایه، مدیفایرهای انتخابیِ هر ردیف هم سمت سرور
 * دوباره اعتبارسنجی و قیمت‌گذاری می‌شوند — شناسه‌ی مدیفایر باید واقعاً به
 * یکی از گروه‌های متصل به همان آیتم منو تعلق داشته باشد، و تعدادِ
 * انتخاب‌شده در هر گروه باید در بازه‌ی minSelect..maxSelect همان گروه
 * باشد. priceDelta هر مدیفایر همیشه از دیتابیس خوانده می‌شود، هرگز از
 * کلاینت.
 */
async function verifyCartItems(
  tx: Prisma.TransactionClient,
  cartItems: CartItem[]
): Promise<{ resolvedLines: ResolvedCartLine[]; subtotal: number }> {
  const menuItemIds = [...new Set(cartItems.map((c) => c.menuItemId))];
  const menuItems = await tx.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      modifierGroupLinks: { include: { modifierGroup: { include: { modifiers: true } } } },
    },
  });
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  const resolvedLines: ResolvedCartLine[] = [];
  let subtotal = 0;

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

    const requestedModifierIds = [...new Set(cartItem.modifierIds || [])];
    const modifierById = new Map<
      string,
      { id: string; name: string; priceDelta: number; groupId: string }
    >();
    for (const link of menuItem.modifierGroupLinks) {
      for (const mod of link.modifierGroup.modifiers) {
        modifierById.set(mod.id, {
          id: mod.id,
          name: mod.name,
          priceDelta: mod.priceDelta,
          groupId: link.modifierGroupId,
        });
      }
    }

    const selectedModifiers: { id: string; name: string; priceDelta: number }[] = [];
    const countByGroup = new Map<string, number>();
    for (const modId of requestedModifierIds) {
      const mod = modifierById.get(modId);
      if (!mod) {
        throw new Error(`افزودنیِ انتخاب‌شده برای «${menuItem.title}» معتبر نیست`);
      }
      selectedModifiers.push({ id: mod.id, name: mod.name, priceDelta: mod.priceDelta });
      countByGroup.set(mod.groupId, (countByGroup.get(mod.groupId) || 0) + 1);
    }

    for (const link of menuItem.modifierGroupLinks) {
      const count = countByGroup.get(link.modifierGroupId) || 0;
      if (count < link.modifierGroup.minSelect) {
        throw new Error(`انتخابِ گروهِ «${link.modifierGroup.name}» برای «${menuItem.title}» الزامی است`);
      }
      if (count > link.modifierGroup.maxSelect) {
        throw new Error(`تعدادِ انتخاب‌شده در گروهِ «${link.modifierGroup.name}» بیش از حدِ مجاز است`);
      }
    }

    const unitPrice = menuItem.price + selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
    subtotal += unitPrice * cartItem.quantity;

    resolvedLines.push({ cartItem, menuItem, unitPrice, selectedModifiers });
  }

  return { resolvedLines, subtotal };
}

/**
 * برای هر ردیفِ سبدِ حل‌شده (resolvedLines): یک OrderItem می‌سازد، مدیفایرهای
 * انتخابی را به‌صورتِ عکسِ لحظه‌ای (OrderItemModifier — نام و priceDelta
 * همان لحظه) ذخیره می‌کند، و مصرفِ موادِ اولیه‌ی همان ردیف را یک‌بار برای
 * همیشه محاسبه و در OrderItemIngredientUsage ذخیره می‌کند (فاز ۱۳).
 *
 * این عکسِ لحظه‌ای دقیقاً همان چیزی است که بعداً هم برای کسرِ واقعیِ
 * موجودی (چه بلافاصله در createOrder، چه بعد از تأیید پرداخت در
 * finalizeOnlineOrderAfterPayment) و هم برای برگردانِ درستِ موجودی در
 * مرجوعی (refund.ts) استفاده می‌شود — نه فرمولِ زنده‌ی فعلی — تا تغییرِ
 * بعدیِ فرمول/مدیفایر هرگز روی سفارش‌های قبلاً ثبت‌شده اثر نگذارد.
 *
 * خروجی: نگاشتِ «مجموعِ مقدارِ مصرفِ هر ماده‌ی اولیه در کلِ این سفارش» —
 * صرفاً محاسبه‌شده، هنوز به هیچ BranchInventoryStock اعمال نشده؛ تصمیمِ
 * «کدام شعبه» و «چه زمانی اعمال شود» با فراخواننده است.
 */
async function createOrderItemsWithSnapshots(
  tx: Prisma.TransactionClient,
  orderId: string,
  resolvedLines: ResolvedCartLine[]
): Promise<Map<string, number>> {
  const totalStockDeductions = new Map<string, number>();

  for (const line of resolvedLines) {
    const orderItem = await tx.orderItem.create({
      data: {
        orderId,
        menuItemId: line.menuItem.id,
        quantity: line.cartItem.quantity,
        priceAtTime: line.unitPrice,
      },
    });

    if (line.selectedModifiers.length > 0) {
      await tx.orderItemModifier.createMany({
        data: line.selectedModifiers.map((m) => ({
          orderItemId: orderItem.id,
          modifierId: m.id,
          modifierName: m.name,
          priceDelta: m.priceDelta,
        })),
      });
    }

    // db=tx: این کوئری‌ها باید داخلِ همین تراکنش اجرا شوند، نه با کلاینتِ
    // سراسریِ prisma — وگرنه در بارِ هم‌زمان می‌توانند با خودِ تراکنش سرِ
    // گرفتنِ اتصال از connection pool رقابت کنند (نک. توضیحِ recipeExpansion.ts).
    const usagePerUnit = await computeIngredientUsagePerUnit(
      line.menuItem.id,
      line.selectedModifiers.map((m) => m.id),
      tx
    );

    if (usagePerUnit.size > 0) {
      await tx.orderItemIngredientUsage.createMany({
        data: [...usagePerUnit.entries()].map(([inventoryItemId, quantityPerUnit]) => ({
          orderItemId: orderItem.id,
          inventoryItemId,
          quantityPerUnit,
        })),
      });
    }

    for (const [inventoryItemId, qtyPerUnit] of usagePerUnit) {
      totalStockDeductions.set(
        inventoryItemId,
        (totalStockDeductions.get(inventoryItemId) || 0) + qtyPerUnit * line.cartItem.quantity
      );
    }
  }

  return totalStockDeductions;
}

export async function createOrder(
  cartItems: CartItem[],
  customerId?: string,
  branchId?: string,
  couponCode?: string,
  giftCardCode?: string
) {
  const auth = await requireRole('ADMIN', 'CASHIER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'سبد سفارش خالی است' };
    }

    const effectiveBranchId = resolveBranchForCreate(auth.user, branchId);

    // Generate a short unique order number (e.g. ORD-8A3B)
    const orderNumber = `ORD-${randomBytes(2).toString('hex').toUpperCase()}`;

    // We use a Prisma transaction to ensure the order and its items are created atomically
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Re-fetch the real, current price (and validate/price modifiers) for
      // every item from the database — see verifyCartItems for why this can't
      // be trusted from the client.
      const { resolvedLines, subtotal } = await verifyCartItems(tx, cartItems);

      // Apply tax and packaging cost from the restaurant's own settings — read
      // from the database here, never from the client, so a tampered request
      // can't zero these out either.
      const settings = await tx.restaurantSettings.findUnique({ where: { id: 'default' } });
      // مالیات همیشه روی subtotalِ ناخالص (قبل از کدِ تخفیف) محاسبه می‌شود —
      // نک. توضیحِ تصمیمِ محدوده در schema.prisma بالای بخشِ فازِ ۱۴.
      const taxAmount = settings ? Math.round((subtotal * settings.taxPercentage) / 100) : 0;
      const packagingCost = settings?.packagingCost ?? 0;

      // --- فاز ۱۴: کد تخفیف (اختیاری) ---
      let couponId: string | null = null;
      let couponCodeSnapshot: string | null = null;
      let discountAmount = 0;
      if (couponCode?.trim()) {
        const applied = await applyCouponWithinTx(tx, couponCode, subtotal);
        couponId = applied.couponId;
        couponCodeSnapshot = applied.couponCode;
        discountAmount = applied.discountAmount;
      }

      const preGiftCardTotal = Math.max(0, subtotal - discountAmount + taxAmount + packagingCost);

      // --- فاز ۱۴: کارت هدیه (اختیاری) — به‌عنوانِ آخرین لایه، مثلِ یک
      // روشِ پرداختِ جزئی، بعد از اعمالِ کدِ تخفیف کسر می‌شود.
      let giftCardId: string | null = null;
      let giftCardAmountUsed = 0;
      if (giftCardCode?.trim()) {
        const applied = await applyGiftCardWithinTx(tx, giftCardCode, preGiftCardTotal);
        giftCardId = applied.giftCardId;
        giftCardAmountUsed = applied.amountUsed;
      }

      const totalAmount = preGiftCardTotal - giftCardAmountUsed;

      // --- Phase 10: refunds & returns ---
      // Order.pointsEarned تا پیش از این فقط توسط جریان سفارش آنلاین
      // (finalizeOnlineOrderAfterPayment) ذخیره می‌شد؛ برای سفارش‌های POS
      // خالی (۰) می‌ماند، هرچند امتیاز واقعاً به مشتری تعلق می‌گرفت
      // (awardLoyaltyForOrder زیر). این یعنی منطق برگشت تناسبیِ امتیاز در
      // مرجوعی (refund.ts) برای سفارش‌های POS همیشه ۰ امتیاز کسر می‌کرد.
      // این‌جا همان مقداری که awardLoyaltyForOrder محاسبه می‌کند، روی خودِ
      // سفارش هم ذخیره می‌شود تا آن اکشن بتواند بدون محاسبه‌ی مجدد
      // (و بدون ریسک ناهم‌خوانی با نرخ فعلیِ تنظیمات) از آن استفاده کند.
      const pointsEarned = customerId
        ? pointsForAmount(totalAmount, settings?.loyaltyPointsPerTenThousand ?? 1)
        : 0;

      // 2. Create the main order
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          taxAmount,
          pointsEarned,
          status: 'PENDING',
          customerId: customerId || null,
          branchId: effectiveBranchId,
          couponId,
          couponCode: couponCodeSnapshot,
          discountAmount,
          giftCardId,
          giftCardAmountUsed,
        },
      });

      // فاز ۱۴: ثبتِ تراکنشِ استفاده از کارتِ هدیه (اگر بود) — حالا که
      // order.id در دسترس است.
      if (giftCardId && giftCardAmountUsed > 0) {
        const giftCard = await tx.giftCard.findUniqueOrThrow({ where: { id: giftCardId } });
        await tx.giftCardTransaction.create({
          data: {
            giftCardId,
            orderId: order.id,
            type: 'REDEEM',
            amount: giftCardAmountUsed,
            balanceAfter: giftCard.currentBalance,
          },
        });
      }

      // 3. Create the associated order items (with the server-verified price
      // and selected modifiers), and snapshot each one's ingredient usage
      // (فاز ۱۳ — نک. createOrderItemsWithSnapshots).
      const stockDeductions = await createOrderItemsWithSnapshots(tx, order.id, resolvedLines);

      // 4. Deduct ingredient stock according to each item's snapshotted usage
      // — from THIS order's own branch's BranchInventoryStock.
      for (const [inventoryItemId, amount] of stockDeductions) {
        await tx.branchInventoryStock.update({
          where: {
            branchId_inventoryItemId: { branchId: effectiveBranchId, inventoryItemId },
          },
          data: { currentStock: { decrement: amount } },
        });
      }

      // 5. Automatically record INCOME in the accounting system
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          description: `درآمد از سفارش ${orderNumber}`,
          amount: totalAmount,
          taxAmount,
          branchId: effectiveBranchId,
          categoryId: SYSTEM_CATEGORY_IDS.INCOME_POS,
          referenceType: 'ORDER',
          referenceId: order.id,
          createdByUserId: auth.user.id,
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
          referralBonusPoints: settings?.referralBonusPoints ?? 0,
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

export async function getActiveOrders(branchId?: string) {
  const auth = await requireRole('ADMIN', 'CASHIER', 'CHEF');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    // سفارش‌های آنلاین (branchId=null) در تابلوی هر شعبه‌ای دیده می‌شوند —
    // محدودیت شناخته‌شده‌ای که تا زمان افزودن انتخاب شعبه به سفارش آنلاین برقرار است.
    const activeOrders = await prisma.order.findMany({
      where: {
        status: { not: 'COMPLETED' },
        ...(effectiveBranchId ? { OR: [{ branchId: effectiveBranchId }, { branchId: null }] } : {}),
      },
      include: {
        items: { include: { menuItem: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
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
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return { success: false, error: 'سفارش یافت نشد' };
    // سفارش‌های آنلاین (branchId=null) از هر شعبه‌ای قابل پیگیری هستند؛
    // سفارش‌های صندوق (POS) فقط توسط همان شعبه (یا ADMIN) قابل تغییرند.
    if (!isBranchExempt(auth.user) && existing.branchId && existing.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

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
 *
 * The online ordering UI has no branch picker yet, so this order's
 * branchId is left null; it is fulfilled/attributed to the default branch
 * at finalization time (see finalizeOnlineOrderAfterPayment below) — a
 * known, documented limitation until multi-branch online ordering exists.
 */
export async function createOnlineOrder(
  cartItems: CartItem[],
  deliveryAddress: string,
  pointsToRedeem: number = 0,
  couponCode?: string,
  giftCardCode?: string
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
      const { resolvedLines, subtotal } = await verifyCartItems(tx, cartItems);

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

      // --- فاز ۱۴: کد تخفیف (اختیاری) — درصد/مبلغِ ثابت روی subtotalِ
      // ناخالص محاسبه می‌شود (نک. توضیحِ تصمیمِ محدوده در schema.prisma).
      let couponId: string | null = null;
      let couponCodeSnapshot: string | null = null;
      let discountAmount = 0;
      if (couponCode?.trim()) {
        const applied = await applyCouponWithinTx(tx, couponCode, subtotal);
        couponId = applied.couponId;
        couponCodeSnapshot = applied.couponCode;
        discountAmount = applied.discountAmount;
      }
      const afterCoupon = Math.max(0, preDiscountTotal - discountAmount);

      // Never let a customer redeem more points than they actually have, and
      // never let the discount take the order below zero — both are enforced
      // server-side regardless of what the client asked for.
      const maxRedeemableByBalance = Math.max(0, customer.pointsBalance);
      const maxRedeemableByOrderValue = Math.floor(afterCoupon / Math.max(pointValue, 1));
      const pointsRedeemed = Math.min(redeemRequested, maxRedeemableByBalance, maxRedeemableByOrderValue);
      const pointsDiscount = pointsRedeemed * pointValue;
      const preGiftCardTotal = Math.max(0, afterCoupon - pointsDiscount);

      // --- فاز ۱۴: کارت هدیه (اختیاری) — آخرین لایه، بعد از کدِ تخفیف و
      // تخفیفِ امتیازِ وفاداری.
      let giftCardId: string | null = null;
      let giftCardAmountUsed = 0;
      if (giftCardCode?.trim()) {
        const applied = await applyGiftCardWithinTx(tx, giftCardCode, preGiftCardTotal);
        giftCardId = applied.giftCardId;
        giftCardAmountUsed = applied.amountUsed;
      }
      const totalAmount = preGiftCardTotal - giftCardAmountUsed;

      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          taxAmount,
          status: 'AWAITING_PAYMENT',
          channel: 'ONLINE_DELIVERY',
          customerId: customer.id,
          deliveryAddress: deliveryAddress.trim(),
          deliveryFee,
          pointsRedeemed,
          couponId,
          couponCode: couponCodeSnapshot,
          discountAmount,
          giftCardId,
          giftCardAmountUsed,
        },
      });

      // فاز ۱۴: ثبتِ تراکنشِ استفاده از کارتِ هدیه (اگر بود).
      if (giftCardId && giftCardAmountUsed > 0) {
        const giftCard = await tx.giftCard.findUniqueOrThrow({ where: { id: giftCardId } });
        await tx.giftCardTransaction.create({
          data: {
            giftCardId,
            orderId: order.id,
            type: 'REDEEM',
            amount: giftCardAmountUsed,
            balanceAfter: giftCard.currentBalance,
          },
        });
      }

      // مصرفِ موادِ اولیه (فاز ۱۳) همین‌جا، در لحظه‌ی ثبتِ سفارش، محاسبه و
      // به‌صورتِ عکسِ لحظه‌ای ذخیره می‌شود — کسرِ واقعیِ موجودی اما تا زمانِ
      // تأییدِ پرداخت به تعویق می‌افتد (نک. finalizeOnlineOrderAfterPayment).
      await createOrderItemsWithSnapshots(tx, order.id, resolvedLines);

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
        feedback: true,
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
 * Online orders carry no branchId of their own (see createOnlineOrder), so
 * stock is deducted from the default branch's BranchInventoryStock — the
 * one designated fulfillment point for online orders until per-branch
 * online ordering exists. The booked INCOME transaction stays branchless
 * too, matching Order.branchId.
 *
 * Not itself auth-gated: it's only ever called from the payment callback
 * route after the gateway signature/verify step has already succeeded,
 * never directly from the client.
 */
export async function finalizeOnlineOrderAfterPayment(orderId: string) {
  const defaultBranchId = await getDefaultBranchId();

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ingredientUsages: true } } },
    });
    if (!order) throw new Error('سفارش یافت نشد');

    // Already finalized by a previous (e.g. duplicated) callback — no-op.
    if (order.status !== 'AWAITING_PAYMENT') {
      return order;
    }

    // 1. Deduct ingredient stock according to each item's SNAPSHOTTED usage
    // (OrderItemIngredientUsage — محاسبه‌شده در لحظه‌ی createOnlineOrder، نه
    // فرمولِ زنده‌ی فعلی؛ فاز ۱۳) — از موجودیِ شعبه‌ی پیش‌فرض (نک. docstring).
    const stockDeductions = new Map<string, number>();
    for (const item of order.items) {
      for (const usage of item.ingredientUsages) {
        const amount = usage.quantityPerUnit * item.quantity;
        stockDeductions.set(
          usage.inventoryItemId,
          (stockDeductions.get(usage.inventoryItemId) || 0) + amount
        );
      }
    }
    for (const [inventoryItemId, amount] of stockDeductions) {
      await tx.branchInventoryStock.update({
        where: {
          branchId_inventoryItemId: { branchId: defaultBranchId, inventoryItemId },
        },
        data: { currentStock: { decrement: amount } },
      });
    }

    // 2. Automatically record INCOME in the accounting system
    await tx.transaction.create({
      data: {
        type: 'INCOME',
        description: `درآمد از سفارش آنلاین ${order.orderNumber}`,
        amount: order.totalAmount,
        taxAmount: order.taxAmount,
        categoryId: SYSTEM_CATEGORY_IDS.INCOME_ONLINE,
        referenceType: 'ORDER',
        referenceId: order.id,
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
        referralBonusPoints: settings?.referralBonusPoints ?? 0,
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
