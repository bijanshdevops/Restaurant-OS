import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * فاز ۱۳: بسطِ کاملِ فرمول غذا (BOM) — شاملِ درصد بازده (yield %) و
 * زیرفرمول‌های تودرتو — به یک نگاشتِ تخت از «مقدار مصرفِ هر ماده‌ی اولیه‌ی
 * خام، به‌ازای یک واحد از آیتم منو (یا یک واحد از خودِ زیرفرمول)».
 *
 * این ماژول تنها محلی است که منطقِ بسطِ فرمول را پیاده‌سازی می‌کند — هم
 * ثبت سفارش (order.ts) و هم آنالیز قیمت تمام‌شده (costing.ts) باید از
 * همین توابع استفاده کنند تا هرگز دو برداشت متفاوت از «فرمول این آیتم
 * چیست» در کدبیس وجود نداشته باشد.
 *
 * توجه مهم: مرجوعی (refund.ts) از این ماژول استفاده نمی‌کند — به‌جای آن،
 * از عکسِ لحظه‌ایِ ذخیره‌شده در OrderItemIngredientUsage (که در لحظه‌ی ثبت
 * سفارش، دقیقاً با همین تابع محاسبه شده) استفاده می‌کند، تا اگر فرمول
 * بعداً تغییر کند، مرجوعی همچنان مقدار واقعیِ کسرشده را برگرداند.
 *
 * نکته‌ی مهمِ دیگر (رفعِ یک اشکال کشف‌شده در تست‌ها): هر تابعِ این ماژول
 * یک پارامترِ اختیاریِ «db» می‌پذیرد (پیش‌فرض: کلاینتِ سراسریِ prisma).
 * فراخوانی‌کننده‌هایی که از داخلِ یک prisma.$transaction(async (tx) => ...)
 * صدا می‌زنند (مثل order.ts هنگامِ ثبتِ سفارش، یا subRecipe.ts هنگامِ
 * بررسیِ حلقه) باید حتماً همان «tx» را پاس بدهند، نه کلاینتِ سراسری —
 * وگرنه این کوئری‌های اضافه، خارج از تراکنش و با یک اتصالِ جداگانه از
 * pool اجرا می‌شوند، درحالی‌که خودِ تراکنش یک اتصالِ دیگر از همان pool را
 * نگه داشته و منتظرِ همین کوئری‌هاست — با یک pool کوچک، این می‌تواند به‌طور
 * متناوب باعثِ timeout/gridlock در گرفتنِ اتصال از pool شود (دقیقاً همان
 * ناپایداریِ بین‌گاه‌به‌گاهی که در تست‌های این فاز مشاهده شد).
 */

type DbClient = PrismaClient | Prisma.TransactionClient;

const MAX_SUBRECIPE_DEPTH = 12;

export class RecipeCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeCycleError';
  }
}

function addTo(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) || 0) + amount);
}

/** بسطِ فرمولِ خودِ یک زیرفرمول به مصرفِ مواد اولیه‌ی خام، به‌ازای «یک واحد» از آن زیرفرمول. */
async function expandSubRecipeUsage(
  db: DbClient,
  subRecipeId: string,
  visited: Set<string>,
  depth: number
): Promise<Map<string, number>> {
  if (depth > MAX_SUBRECIPE_DEPTH || visited.has(subRecipeId)) {
    throw new RecipeCycleError('حلقه یا عمقِ بیش‌ازحد در زنجیره‌ی زیرفرمول‌ها شناسایی شد.');
  }
  const nextVisited = new Set(visited);
  nextVisited.add(subRecipeId);

  const lines = await db.subRecipeItem.findMany({ where: { subRecipeId } });
  const result = new Map<string, number>();

  for (const line of lines) {
    const effectiveQty = line.quantity / (line.yieldPercent / 100);
    if (line.inventoryItemId) {
      addTo(result, line.inventoryItemId, effectiveQty);
    } else if (line.childSubRecipeId) {
      const childUsage = await expandSubRecipeUsage(db, line.childSubRecipeId, nextVisited, depth + 1);
      for (const [invId, qty] of childUsage) {
        addTo(result, invId, qty * effectiveQty);
      }
    }
  }

  return result;
}

/**
 * نسخه‌ی عمومیِ expandSubRecipeUsage — برای مصرف‌کننده‌هایی مثل آنالیزِ
 * قیمتِ تمام‌شده (costing.ts) که نیاز دارند هزینه/مصرفِ خودِ یک زیرفرمول
 * (نه یک آیتمِ منو) را، به‌ازای یک واحد از آن، محاسبه کنند.
 */
export async function expandSubRecipeUsagePerUnit(
  subRecipeId: string,
  db: DbClient = prisma
): Promise<Map<string, number>> {
  return expandSubRecipeUsage(db, subRecipeId, new Set(), 0);
}

/** بسطِ فرمولِ پایه‌ی یک آیتم منو (بدون مدیفایر) به مصرفِ مواد اولیه‌ی خام، به‌ازای یک واحد از آن آیتم. */
export async function expandMenuItemBaseUsage(
  menuItemId: string,
  db: DbClient = prisma
): Promise<Map<string, number>> {
  const lines = await db.recipeItem.findMany({ where: { menuItemId } });
  const result = new Map<string, number>();

  for (const line of lines) {
    const effectiveQty = line.quantity / (line.yieldPercent / 100);
    if (line.inventoryItemId) {
      addTo(result, line.inventoryItemId, effectiveQty);
    } else if (line.subRecipeId) {
      const subUsage = await expandSubRecipeUsage(db, line.subRecipeId, new Set(), 0);
      for (const [invId, qty] of subUsage) {
        addTo(result, invId, qty * effectiveQty);
      }
    }
  }

  return result;
}

/**
 * اثرِ مدیفایرهای انتخاب‌شده روی مصرفِ مواد اولیه — مقادیر می‌توانند منفی
 * باشند (مدیفایری که چیزی را از فرمول پایه کم می‌کند، مثل «بدون سس»).
 */
export async function expandModifierUsage(
  modifierIds: string[],
  db: DbClient = prisma
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (modifierIds.length === 0) return result;

  const lines = await db.modifierRecipeItem.findMany({
    where: { modifierId: { in: modifierIds } },
  });
  for (const line of lines) {
    addTo(result, line.inventoryItemId, line.quantity);
  }
  return result;
}

/**
 * نتیجه‌ی نهایی: مصرفِ هر ماده‌ی اولیه به‌ازای «یک واحد» از این ردیفِ
 * سفارش (فرمول پایه + بسطِ زیرفرمول‌ها + اثرِ مدیفایرهای انتخابی)، با
 * کلیپ‌شدن در صفر — نمی‌توان کمتر از صفر واحد از چیزی کسر کرد. خروجی فقط
 * شامل ماده‌های اولیه‌ای است که مصرفِ نهایی‌شان بزرگ‌تر از صفر است.
 *
 * db را از داخلِ یک تراکنش (مثلاً createOrder) حتماً با همان «tx» صدا
 * بزنید — نک. توضیحِ بالای فایل.
 */
export async function computeIngredientUsagePerUnit(
  menuItemId: string,
  modifierIds: string[] = [],
  db: DbClient = prisma
): Promise<Map<string, number>> {
  const base = await expandMenuItemBaseUsage(menuItemId, db);
  const modifierEffect = await expandModifierUsage(modifierIds, db);

  const merged = new Map(base);
  for (const [invId, delta] of modifierEffect) {
    addTo(merged, invId, delta);
  }

  const clamped = new Map<string, number>();
  for (const [invId, qty] of merged) {
    if (qty > 0) clamped.set(invId, qty);
  }
  return clamped;
}

/**
 * بررسیِ عدمِ حلقه پیش از ذخیره‌ی یک ردیفِ زیرفرمول که خودش به یک
 * زیرفرمولِ دیگر (childSubRecipeId) اشاره می‌کند — یعنی آیا خودِ
 * ownerSubRecipeId در میان اجدادِ خط‌مشیِ childSubRecipeId (به‌صورت
 * مستقیم یا غیرمستقیم) ظاهر می‌شود یا نه. باید پیش از هر ذخیره‌ی
 * SubRecipeItem با childSubRecipeId غیرخالی فراخوانی شود.
 *
 * db را از داخلِ تراکنشِ saveSubRecipe حتماً با همان «tx» صدا بزنید — نک.
 * توضیحِ بالای فایل.
 */
export async function assertNoSubRecipeCycle(
  ownerSubRecipeId: string,
  childSubRecipeId: string,
  db: DbClient = prisma
): Promise<void> {
  if (ownerSubRecipeId === childSubRecipeId) {
    throw new RecipeCycleError('یک زیرفرمول نمی‌تواند مستقیماً به خودش اشاره کند.');
  }

  const visited = new Set<string>();
  const queue = [childSubRecipeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === ownerSubRecipeId) {
      throw new RecipeCycleError('این ارتباط باعث ایجاد یک حلقه در زنجیره‌ی زیرفرمول‌ها می‌شود.');
    }
    if (visited.size > 500) {
      // یک محافظِ ایمنیِ اضافه در برابر گراف‌های به‌طرز غیرمنتظره بزرگ.
      throw new RecipeCycleError('زنجیره‌ی زیرفرمول‌ها بیش‌ازحد بزرگ یا نامعتبر است.');
    }

    const children = await db.subRecipeItem.findMany({
      where: { subRecipeId: current, childSubRecipeId: { not: null } },
      select: { childSubRecipeId: true },
    });
    for (const child of children) {
      if (child.childSubRecipeId) queue.push(child.childSubRecipeId);
    }
  }
}
