/**
 * Phase 7: full accounting & tax.
 *
 * شناسه‌های ثابتِ دسته‌های سیستمیِ حسابداری — همان مقادیری که در
 * prisma/migrations/20260917180000_phase7_accounting_tax/migration.sql
 * با INSERT مستقیم در جدول TransactionCategory ساخته شده‌اند. اکشن‌های
 * خودکار (سفارش POS، سفارش آنلاین، دریافت کالای خرید، اجرای حقوق) این
 * ثابت‌ها را به‌جای جست‌وجوی دسته بر اساس نام استفاده می‌کنند تا از هر
 * جابه‌جایی/تغییر نام احتمالی دسته‌ها مصون بمانند.
 */
export const SYSTEM_CATEGORY_IDS = {
  INCOME_POS: 'txcat-income-pos',
  INCOME_ONLINE: 'txcat-income-online',
  INCOME_OTHER: 'txcat-income-other',
  EXPENSE_PURCHASE: 'txcat-expense-purchase',
  EXPENSE_PAYROLL: 'txcat-expense-payroll',
  EXPENSE_OTHER: 'txcat-expense-other',
} as const;
