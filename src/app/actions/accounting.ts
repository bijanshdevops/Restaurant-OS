"use server";

import { prisma } from '@/lib/prisma';
import { Prisma, TransactionType, TransactionCategoryType } from '@prisma/client';
import { requireRole, resolveBranchFilter, resolveBranchForCreate, isBranchExempt, SessionUser } from '@/lib/auth';
import { SYSTEM_CATEGORY_IDS } from '@/lib/accountingCategories';
import * as XLSX from 'xlsx';

/**
 * Phase 7: full accounting & tax.
 *
 * این ماژول یک لجر تک‌طرفه (single-entry) از تراکنش‌های INCOME/EXPENSE
 * است — نه یک سیستم دفترداری دوطرفه (debit/credit) کامل. هر تراکنش به یک
 * دسته‌ی حساب (TransactionCategory) و در صورت وجود، به رویداد واقعی
 * منشأش (سفارش/خرید/حقوق) متصل است. گزارش مالیات (VAT) از جمع ستون
 * taxAmount تراکنش‌ها ساخته می‌شود، نه از یک موتور مالیاتی جداگانه.
 */

interface TransactionFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
  categoryId?: string;
}

/** شرط where مشترک بین لیست تراکنش‌ها، گزارش مالی و خروجی اکسل. */
function buildTransactionWhere(user: SessionUser, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const effectiveBranchId = resolveBranchFilter(user, filters.branchId);
  const where: Prisma.TransactionWhereInput = {};

  // تراکنش‌های سفارش آنلاین (branchId=null) بدون شعبه ثبت می‌شوند؛ در
  // فیلتر شعبه‌ای هم نمایش داده می‌شوند تا از دید حسابداری گم نشوند.
  if (effectiveBranchId) {
    where.OR = [{ branchId: effectiveBranchId }, { branchId: null }];
  }
  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  return where;
}

/**
 * مبلغ مالیاتِ نهایی یک تراکنش را تعیین می‌کند:
 * - اگر کاربر صریحاً taxAmount داده باشد، همان (با کلمپ به بازه‌ی مجاز).
 * - وگرنه اگر دسته‌ی انتخاب‌شده نرخ پیش‌فرض دارد، amount را «شامل مالیات»
 *   فرض می‌کند و بخش مالیات را از دلش استخراج می‌کند.
 * - وگرنه صفر.
 */
function computeTaxAmount(amount: number, explicitTax: number | undefined, categoryTaxRate: number | null | undefined): number {
  if (explicitTax !== undefined && explicitTax !== null && Number.isFinite(explicitTax)) {
    return Math.max(0, Math.min(amount, Math.round(explicitTax)));
  }
  if (categoryTaxRate && categoryTaxRate > 0) {
    return Math.round(amount - amount / (1 + categoryTaxRate / 100));
  }
  return 0;
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const where = buildTransactionWhere(auth.user, filters);
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return { success: true, transactions };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: 'Failed to fetch transactions' };
  }
}

export async function createExpense(
  description: string,
  amount: number,
  options: { branchId?: string; categoryId?: string; taxAmount?: number } = {}
) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!description?.trim()) return { success: false, error: 'شرح هزینه الزامی است' };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'مبلغ وارد شده معتبر نیست' };

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, options.branchId);
    const categoryId = options.categoryId || SYSTEM_CATEGORY_IDS.EXPENSE_OTHER;
    const category = await prisma.transactionCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.type !== 'EXPENSE') {
      return { success: false, error: 'دسته‌بندی انتخاب‌شده برای هزینه معتبر نیست' };
    }
    const taxAmount = computeTaxAmount(amount, options.taxAmount, category.taxRatePercent);

    const expense = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        description: description.trim(),
        amount,
        taxAmount,
        branchId: effectiveBranchId,
        categoryId,
        createdByUserId: auth.user.id,
      },
      include: { category: true, branch: { select: { id: true, name: true } } },
    });

    return { success: true, transaction: expense };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { success: false, error: 'Failed to create expense' };
  }
}

export async function createIncome(
  description: string,
  amount: number,
  options: { branchId?: string; categoryId?: string; taxAmount?: number } = {}
) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!description?.trim()) return { success: false, error: 'شرح درآمد الزامی است' };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'مبلغ وارد شده معتبر نیست' };

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, options.branchId);
    const categoryId = options.categoryId || SYSTEM_CATEGORY_IDS.INCOME_OTHER;
    const category = await prisma.transactionCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.type !== 'INCOME') {
      return { success: false, error: 'دسته‌بندی انتخاب‌شده برای درآمد معتبر نیست' };
    }
    const taxAmount = computeTaxAmount(amount, options.taxAmount, category.taxRatePercent);

    const income = await prisma.transaction.create({
      data: {
        type: 'INCOME',
        description: description.trim(),
        amount,
        taxAmount,
        branchId: effectiveBranchId,
        categoryId,
        createdByUserId: auth.user.id,
      },
      include: { category: true, branch: { select: { id: true, name: true } } },
    });

    return { success: true, transaction: income };
  } catch (error) {
    console.error('Error creating income:', error);
    return { success: false, error: 'Failed to create income' };
  }
}

export async function updateTransactionCategory(
  id: string,
  data: { categoryId?: string | null; description?: string; taxAmount?: number }
) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'تراکنش یافت نشد' };
    if (!isBranchExempt(auth.user) && existing.branchId && existing.branchId !== auth.user.branchId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const updateData: Prisma.TransactionUpdateInput = {};

    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        updateData.category = { disconnect: true };
      } else {
        const category = await prisma.transactionCategory.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: 'دسته یافت نشد' };
        if (category.type !== existing.type) {
          return { success: false, error: 'نوع دسته با نوع تراکنش (درآمد/هزینه) هم‌خوانی ندارد' };
        }
        updateData.category = { connect: { id: data.categoryId } };
      }
    }
    if (data.description !== undefined) {
      if (!data.description.trim()) return { success: false, error: 'شرح نمی‌تواند خالی باشد' };
      updateData.description = data.description.trim();
    }
    if (data.taxAmount !== undefined) {
      if (!Number.isFinite(data.taxAmount) || data.taxAmount < 0 || data.taxAmount > existing.amount) {
        return { success: false, error: 'مبلغ مالیات نامعتبر است' };
      }
      updateData.taxAmount = data.taxAmount;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true, branch: { select: { id: true, name: true } } },
    });
    return { success: true, transaction: updated };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}

export async function deleteTransaction(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'تراکنش یافت نشد' };
    if (existing.referenceType) {
      return {
        success: false,
        error: 'این تراکنش به یک رویداد سیستمی (سفارش/خرید/حقوق) متصل است و برای حفظ صحت سوابق مالی قابل حذف نیست؛ به‌جای حذف، دسته‌بندی یا شرح آن را اصلاح کنید.',
      };
    }
    await prisma.transaction.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: 'Failed to delete transaction' };
  }
}

export async function getCategories() {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const categories = await prisma.transactionCategory.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: 'Failed to fetch categories' };
  }
}

export async function createCategory(name: string, type: TransactionCategoryType, taxRatePercent?: number) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!name?.trim()) return { success: false, error: 'نام دسته الزامی است' };
  if (type !== 'INCOME' && type !== 'EXPENSE') return { success: false, error: 'نوع دسته نامعتبر است' };
  if (taxRatePercent !== undefined && taxRatePercent !== null) {
    if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100) {
      return { success: false, error: 'نرخ مالیات باید بین ۰ تا ۱۰۰ باشد' };
    }
  }

  try {
    const category = await prisma.transactionCategory.create({
      data: { name: name.trim(), type, taxRatePercent: taxRatePercent ?? null },
    });
    return { success: true, category };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'این نام قبلاً برای همین نوع دسته استفاده شده است' };
    }
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategory(id: string, data: { name?: string; taxRatePercent?: number | null }) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const updateData: Prisma.TransactionCategoryUpdateInput = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) return { success: false, error: 'نام نمی‌تواند خالی باشد' };
      updateData.name = data.name.trim();
    }
    if (data.taxRatePercent !== undefined) {
      if (data.taxRatePercent !== null && (!Number.isFinite(data.taxRatePercent) || data.taxRatePercent < 0 || data.taxRatePercent > 100)) {
        return { success: false, error: 'نرخ مالیات باید بین ۰ تا ۱۰۰ باشد' };
      }
      updateData.taxRatePercent = data.taxRatePercent;
    }
    const category = await prisma.transactionCategory.update({ where: { id }, data: updateData });
    return { success: true, category };
  } catch (error: any) {
    if (error?.code === 'P2002') return { success: false, error: 'این نام قبلاً برای همین نوع دسته استفاده شده است' };
    console.error('Error updating category:', error);
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategory(id: string) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const category = await prisma.transactionCategory.findUnique({ where: { id } });
    if (!category) return { success: false, error: 'دسته یافت نشد' };
    if (category.isSystem) return { success: false, error: 'دسته‌های سیستمی قابل حذف نیستند' };

    const usageCount = await prisma.transaction.count({ where: { categoryId: id } });
    if (usageCount > 0) {
      return { success: false, error: `این دسته به ${usageCount} تراکنش متصل است و قابل حذف نیست` };
    }

    await prisma.transactionCategory.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}

interface ReportFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

async function fetchTransactionsForReport(user: SessionUser, filters: TransactionFilters) {
  const where = buildTransactionWhere(user, filters);
  return prisma.transaction.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

type ReportRow = Awaited<ReturnType<typeof fetchTransactionsForReport>>[number];

interface CategoryBucket {
  categoryId: string | null;
  name: string;
  total: number;
  taxTotal: number;
  count: number;
}

function summarizeTransactions(transactions: ReportRow[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  let outputTax = 0;
  let inputTax = 0;
  const incomeByCategory = new Map<string, CategoryBucket>();
  const expenseByCategory = new Map<string, CategoryBucket>();

  for (const t of transactions) {
    const bucket = t.type === 'INCOME' ? incomeByCategory : expenseByCategory;
    const key = t.categoryId ?? 'uncategorized';
    const entry = bucket.get(key) ?? {
      categoryId: t.categoryId,
      name: t.category?.name ?? 'بدون دسته‌بندی',
      total: 0,
      taxTotal: 0,
      count: 0,
    };
    entry.total += t.amount;
    entry.taxTotal += t.taxAmount;
    entry.count += 1;
    bucket.set(key, entry);

    if (t.type === 'INCOME') {
      totalIncome += t.amount;
      outputTax += t.taxAmount;
    } else {
      totalExpense += t.amount;
      inputTax += t.taxAmount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    outputTax,
    inputTax,
    netVatPayable: outputTax - inputTax,
    incomeByCategory: [...incomeByCategory.values()].sort((a, b) => b.total - a.total),
    expenseByCategory: [...expenseByCategory.values()].sort((a, b) => b.total - a.total),
  };
}

export async function getFinancialSummary(filters: ReportFilters = {}) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const transactions = await fetchTransactionsForReport(auth.user, filters);
    const summary = summarizeTransactions(transactions);
    return {
      success: true,
      summary: { dateFrom: filters.dateFrom ?? null, dateTo: filters.dateTo ?? null, ...summary },
    };
  } catch (error) {
    console.error('Error building financial summary:', error);
    return { success: false, error: 'Failed to build financial summary' };
  }
}

export async function getProfitAndLossReport(filters: ReportFilters = {}) {
  const result = await getFinancialSummary(filters);
  if (!result.success || !result.summary) {
    return { success: false, error: (result as any).error || 'Failed to build report' };
  }
  const s = result.summary;
  return {
    success: true,
    report: {
      periodFrom: s.dateFrom,
      periodTo: s.dateTo,
      revenue: { items: s.incomeByCategory, total: s.totalIncome },
      expenses: { items: s.expenseByCategory, total: s.totalExpense },
      netProfit: s.netProfit,
      tax: { outputTax: s.outputTax, inputTax: s.inputTax, netVatPayable: s.netVatPayable },
    },
  };
}

/**
 * خروجی اکسل (.xlsx) از تراکنش‌های فیلترشده به‌همراه یک برگه‌ی خلاصه.
 *
 * به‌جای تولید PDF سمت‌سرور (که برای متن فارسی/راست‌به‌چپ نیازمند فونت
 * و shaping ویژه و یک وابستگی سنگین جدید مثل puppeteer/pdfkit است)، خروجی
 * «چاپ/PDF» در داشبورد از طریق یک نمای قابل‌چاپ در مرورگر (window.print)
 * ارائه می‌شود؛ خروجی اکسل این تابع، فایل واقعی .xlsx است.
 */
export async function exportTransactionsToExcel(filters: TransactionFilters = {}) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const where = buildTransactionWhere(auth.user, filters);
    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: { select: { name: true } }, branch: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const sheetData: (string | number)[][] = [
      ['تاریخ', 'نوع', 'دسته‌بندی', 'شرح', 'مبلغ (تومان)', 'مالیات (تومان)', 'شعبه'],
      ...transactions.map((t) => [
        new Date(t.createdAt).toLocaleString('fa-IR'),
        t.type === 'INCOME' ? 'درآمد' : 'هزینه',
        t.category?.name ?? 'بدون دسته‌بندی',
        t.description,
        t.amount,
        t.taxAmount,
        t.branch?.name ?? '—',
      ]),
    ];

    const summary = summarizeTransactions(transactions as unknown as ReportRow[]);
    const summarySheetData: (string | number)[][] = [
      ['شاخص', 'مبلغ (تومان)'],
      ['جمع درآمد', summary.totalIncome],
      ['جمع هزینه', summary.totalExpense],
      ['سود خالص', summary.netProfit],
      ['مالیات فروش (خروجی)', summary.outputTax],
      ['مالیات خرید (ورودی)', summary.inputTax],
      ['مانده مالیات قابل پرداخت', summary.netVatPayable],
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), 'تراکنش‌ها');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheetData), 'خلاصه');

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
    const filename = `accounting-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return { success: true, base64, filename };
  } catch (error) {
    console.error('Error exporting transactions to Excel:', error);
    return { success: false, error: 'Failed to export transactions' };
  }
}
