import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

const SYSTEM_CATEGORY_IDS = {
  INCOME_POS: 'txcat-income-pos',
  INCOME_ONLINE: 'txcat-income-online',
  INCOME_OTHER: 'txcat-income-other',
  EXPENSE_PURCHASE: 'txcat-expense-purchase',
  EXPENSE_PAYROLL: 'txcat-expense-payroll',
  EXPENSE_OTHER: 'txcat-expense-other',
};

describe('حسابداری و مالیات کامل (فاز ۷)', () => {
  let admin: TestClient;
  let cashierOnly: TestClient;
  let customExpenseCategoryId: string;
  const customExpenseCategoryName = `اجاره تستی ${rand()}`;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const cashierUser = await admin.call('createUser', {
      name: `صندوقدار تستی ${rand()}`,
      username: `cashier_acc_${rand()}`,
      password: '123456',
      roles: ['CASHIER'],
    });
    expect(cashierUser.success).toBe(true);
    cashierOnly = new TestClient();
    const login = await cashierOnly.call('login', cashierUser.user.username, '123456');
    expect(login.success).toBe(true);
  });

  describe('کنترل دسترسی', () => {
    it('CASHIER به هیچ‌کدام از عملیات حسابداری دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getCategories')).success).toBe(false);
      expect((await cashierOnly.call('createCategory', 'دسته تستی', 'EXPENSE')).success).toBe(false);
      expect((await cashierOnly.call('getFinancialSummary')).success).toBe(false);
      expect((await cashierOnly.call('createExpense', 'هزینه تستی', 1000)).success).toBe(false);
      expect((await cashierOnly.call('createIncome', 'درآمد تستی', 1000)).success).toBe(false);
    });

    it('حذف تراکنش فقط برای ADMIN است، نه ACCOUNTANT/CASHIER', async () => {
      const res = await cashierOnly.call('deleteTransaction', 'non-existent-id');
      expect(res.success).toBe(false);
    });
  });

  describe('دسته‌بندی حساب‌ها (Chart of Accounts)', () => {
    it('دسته‌های سیستمی از قبل موجودند و isSystem=true دارند', async () => {
      const res = await admin.call('getCategories');
      expect(res.success).toBe(true);
      const ids = res.categories.map((c: any) => c.id);
      for (const id of Object.values(SYSTEM_CATEGORY_IDS)) {
        expect(ids).toContain(id);
      }
      const posCategory = res.categories.find((c: any) => c.id === SYSTEM_CATEGORY_IDS.INCOME_POS);
      expect(posCategory.isSystem).toBe(true);
    });

    it('دسته‌ی سیستمی قابل حذف نیست', async () => {
      const res = await admin.call('deleteCategory', SYSTEM_CATEGORY_IDS.EXPENSE_OTHER);
      expect(res.success).toBe(false);
    });

    it('ایجاد دسته‌ی جدید هزینه با نرخ مالیات ۹٪', async () => {
      const res = await admin.call('createCategory', customExpenseCategoryName, 'EXPENSE', 9);
      expect(res.success).toBe(true);
      expect(res.category.taxRatePercent).toBe(9);
      customExpenseCategoryId = res.category.id;
    });

    it('نام تکراری برای همان نوع دسته رد می‌شود', async () => {
      const res = await admin.call('createCategory', customExpenseCategoryName, 'EXPENSE', 9);
      expect(res.success).toBe(false);
    });

    it('همان نام برای نوع درآمد مشکلی ندارد (یکتایی روی name+type است)', async () => {
      const res = await admin.call('createCategory', customExpenseCategoryName, 'INCOME');
      expect(res.success).toBe(true);
      // پاک‌سازی این دسته‌ی کمکی، تا آزمون‌های بعدی شمارش دسته‌ها را به‌هم نریزد
      await admin.call('deleteCategory', res.category.id);
    });

    it('دسته‌ای که به هیچ تراکنشی متصل نیست قابل حذف است', async () => {
      const tempRes = await admin.call('createCategory', `دسته موقت ${rand()}`, 'EXPENSE');
      expect(tempRes.success).toBe(true);
      const delRes = await admin.call('deleteCategory', tempRes.category.id);
      expect(delRes.success).toBe(true);
    });
  });

  describe('ثبت دستی هزینه/درآمد', () => {
    it('ثبت هزینه بدون دسته‌بندی روی «سایر هزینه‌ها» می‌رود و مالیات صفر است', async () => {
      const res = await admin.call('createExpense', `هزینه متفرقه ${rand()}`, 20000);
      expect(res.success).toBe(true);
      expect(res.transaction.category.id).toBe(SYSTEM_CATEGORY_IDS.EXPENSE_OTHER);
      expect(res.transaction.taxAmount).toBe(0);
    });

    it('ثبت هزینه با دسته‌ی دارای نرخ مالیات، مالیات را خودکار از مبلغِ شامل‌مالیات استخراج می‌کند', async () => {
      const amount = 109000; // شامل ۹٪ مالیات => مالیات = ۱۰۹۰۰۰ - ۱۰۹۰۰۰/۱٫۰۹ ≈ ۹۰۰۰
      const res = await admin.call('createExpense', 'اجاره ماهانه', amount, { categoryId: customExpenseCategoryId });
      expect(res.success).toBe(true);
      expect(res.transaction.categoryId).toBe(customExpenseCategoryId);
      expect(res.transaction.taxAmount).toBeCloseTo(9000, 0);
    });

    it('مقدار صریح taxAmount همیشه بر محاسبه‌ی خودکار اولویت دارد', async () => {
      const res = await admin.call('createExpense', 'اجاره با مالیات صریح', 100000, {
        categoryId: customExpenseCategoryId,
        taxAmount: 5000,
      });
      expect(res.success).toBe(true);
      expect(res.transaction.taxAmount).toBe(5000);
    });

    it('دسته‌ی هزینه برای createIncome رد می‌شود (نوع باید INCOME باشد)', async () => {
      const res = await admin.call('createIncome', 'درآمد نامعتبر', 10000, { categoryId: customExpenseCategoryId });
      expect(res.success).toBe(false);
    });

    it('ثبت درآمد دستی بدون دسته‌بندی روی «سایر درآمدها» می‌رود', async () => {
      const res = await admin.call('createIncome', `درآمد متفرقه ${rand()}`, 30000);
      expect(res.success).toBe(true);
      expect(res.transaction.category.id).toBe(SYSTEM_CATEGORY_IDS.INCOME_OTHER);
    });
  });

  describe('ویرایش و حذف تراکنش', () => {
    let manualExpenseId: string;

    beforeAll(async () => {
      const res = await admin.call('createExpense', `هزینه‌ی قابل‌ویرایش ${rand()}`, 15000);
      expect(res.success).toBe(true);
      manualExpenseId = res.transaction.id;
    });

    it('بازطبقه‌بندی به دسته‌ای با نوع نادرست رد می‌شود', async () => {
      const incomeCategories = await admin.call('getCategories');
      const anyIncomeCat = incomeCategories.categories.find((c: any) => c.type === 'INCOME');
      const res = await admin.call('updateTransactionCategory', manualExpenseId, { categoryId: anyIncomeCat.id });
      expect(res.success).toBe(false);
    });

    it('بازطبقه‌بندی به دسته‌ی هم‌نوع و اصلاح شرح موفق است', async () => {
      const res = await admin.call('updateTransactionCategory', manualExpenseId, {
        categoryId: customExpenseCategoryId,
        description: 'شرح اصلاح‌شده',
        taxAmount: 1000,
      });
      expect(res.success).toBe(true);
      expect(res.transaction.categoryId).toBe(customExpenseCategoryId);
      expect(res.transaction.description).toBe('شرح اصلاح‌شده');
      expect(res.transaction.taxAmount).toBe(1000);
    });

    it('مبلغ مالیاتِ بزرگ‌تر از مبلغ اصلی رد می‌شود', async () => {
      const res = await admin.call('updateTransactionCategory', manualExpenseId, { taxAmount: 999999999 });
      expect(res.success).toBe(false);
    });

    it('یک تراکنش دستی (بدون referenceType) توسط ADMIN قابل حذف است', async () => {
      const res = await admin.call('deleteTransaction', manualExpenseId);
      expect(res.success).toBe(true);
    });

    it('تراکنش حذف‌شده دیگر در فهرست نیست', async () => {
      const res = await admin.call('getTransactions', {});
      expect(res.success).toBe(true);
      expect(res.transactions.some((t: any) => t.id === manualExpenseId)).toBe(false);
    });
  });

  describe('اتصال خودکار تراکنش‌ها به رویداد واقعی', () => {
    it('سفارش POS تراکنش درآمدی با دسته‌ی سیستمی «فروش حضوری» و مالیات درست می‌سازد', async () => {
      const menuRes = await admin.call('createMenuItem', {
        title: `غذای تستی حسابداری ${rand()}`,
        price: 100000,
        category: 'تست',
        subCategory: '',
        imageUrl: '',
      });
      expect(menuRes.success).toBe(true);

      const settingsRes = await admin.call('getSettings');
      const taxPercentage = settingsRes.settings.taxPercentage;

      const orderRes = await admin.call('createOrder', [{ menuItemId: menuRes.item.id, quantity: 1 }]);
      expect(orderRes.success).toBe(true);
      const expectedTax = Math.round((100000 * taxPercentage) / 100);

      const txRes = await admin.call('getTransactions', {});
      expect(txRes.success).toBe(true);
      const orderTx = txRes.transactions.find((t: any) => t.referenceType === 'ORDER' && t.referenceId === orderRes.order.id);
      expect(orderTx).toBeTruthy();
      expect(orderTx.category.id).toBe(SYSTEM_CATEGORY_IDS.INCOME_POS);
      expect(orderTx.taxAmount).toBeCloseTo(expectedTax, 0);
      expect(orderTx.amount).toBe(orderRes.order.totalAmount);
    });

    it('دریافت کالای خرید، تراکنش هزینه‌ای با دسته‌ی سیستمی «خرید کالا» می‌سازد', async () => {
      const supplierRes = await admin.call('createSupplier', {
        name: `تأمین‌کننده تستی حسابداری ${rand()}`,
        contactName: 'تماس تست',
        phone: '02100000000',
      });
      expect(supplierRes.success).toBe(true);

      const itemRes = await admin.call('createInventoryItem', {
        name: `قلم انبار تستی حسابداری ${rand()}`,
        category: 'تست',
        unit: 'کیلوگرم',
        currentStock: 0,
        minStockLevel: 5,
      });
      expect(itemRes.success).toBe(true);

      const poRes = await admin.call('createPurchaseOrder', {
        supplierId: supplierRes.supplier.id,
        items: [{ inventoryItemId: itemRes.item.id, quantity: 10, unitCost: 2000 }],
      });
      expect(poRes.success).toBe(true);
      const purchaseOrderItemId = poRes.order.items[0].id;

      const orderedRes = await admin.call('markPurchaseOrderOrdered', poRes.order.id);
      expect(orderedRes.success).toBe(true);

      const receiveRes = await admin.call('receivePurchaseOrderItems', poRes.order.id, [
        { purchaseOrderItemId, quantity: 10 },
      ]);
      expect(receiveRes.success).toBe(true);

      const txRes = await admin.call('getTransactions', {});
      const poTx = txRes.transactions.find((t: any) => t.referenceType === 'PURCHASE_ORDER' && t.referenceId === poRes.order.id);
      expect(poTx).toBeTruthy();
      expect(poTx.category.id).toBe(SYSTEM_CATEGORY_IDS.EXPENSE_PURCHASE);
      expect(poTx.amount).toBe(20000);
    });
  });

  describe('اتصال خودکار حقوق‌دهی', () => {
    it('اجرای حقوق، تراکنش هزینه‌ای با دسته‌ی سیستمی «حقوق و دستمزد» می‌سازد', async () => {
      const staffUser = await admin.call('createUser', {
        name: `پرسنل تستی حقوق ${rand()}`,
        username: `payroll_acc_${rand()}`,
        password: '123456',
        roles: ['CASHIER'],
        hourlyRate: 100000,
      });
      expect(staffUser.success).toBe(true);
      const staffClient = new TestClient();
      const login = await staffClient.call('login', staffUser.user.username, '123456');
      expect(login.success).toBe(true);

      const now = new Date();
      const shiftRes = await admin.call('createShift', {
        date: now.toISOString().slice(0, 10),
        startTime: now.toISOString(),
        endTime: new Date(now.getTime() + 3_600_000).toISOString(),
      });
      expect(shiftRes.success).toBe(true);

      const assignRes = await admin.call('assignStaffToShift', shiftRes.shift.id, staffUser.user.id);
      expect(assignRes.success).toBe(true);

      const clockInRes = await staffClient.call('clockIn', assignRes.assignment.id);
      expect(clockInRes.success).toBe(true);

      await new Promise((r) => setTimeout(r, 1100));

      const clockOutRes = await staffClient.call('clockOut', assignRes.assignment.id);
      expect(clockOutRes.success).toBe(true);

      const periodStart = new Date(now.getTime() - 60_000).toISOString();
      const periodEnd = new Date(now.getTime() + 2 * 3_600_000).toISOString();
      const payrollRes = await admin.call('runPayroll', staffUser.user.id, periodStart, periodEnd);
      expect(payrollRes.success).toBe(true);

      const txRes = await admin.call('getTransactions', {});
      const payrollTx = txRes.transactions.find(
        (t: any) => t.referenceType === 'PAYROLL' && t.referenceId === payrollRes.payment.id
      );
      expect(payrollTx).toBeTruthy();
      expect(payrollTx.category.id).toBe(SYSTEM_CATEGORY_IDS.EXPENSE_PAYROLL);
      expect(payrollTx.amount).toBeCloseTo(payrollRes.payment.totalAmount, 5);
    });
  });

  describe('گزارش مالی، سود و زیان، و مالیات', () => {
    it('جمع دسته‌ی هزینه‌ی سفارشی از تراکنش‌های واقعاً ثبت‌شده در آن دقیقاً برمی‌آید', async () => {
      const res = await admin.call('getFinancialSummary', {});
      expect(res.success).toBe(true);
      const bucket = res.summary.expenseByCategory.find((c: any) => c.categoryId === customExpenseCategoryId);
      expect(bucket).toBeTruthy();
      // ۱۰۹٬۰۰۰ (مالیات ≈۹٬۰۰۰) + ۱۰۰٬۰۰۰ (مالیات صریح ۵٬۰۰۰) = ۲۰۹٬۰۰۰ / ۱۴٬۰۰۰
      expect(bucket.total).toBeCloseTo(209000, 0);
      expect(bucket.taxTotal).toBeCloseTo(14000, 0);
      expect(bucket.count).toBe(2);
    });

    it('اتحادهای حسابداری همیشه برقرارند: سود خالص = درآمد - هزینه، مانده مالیات = خروجی - ورودی', async () => {
      const res = await admin.call('getFinancialSummary', {});
      expect(res.success).toBe(true);
      const s = res.summary;
      expect(s.netProfit).toBeCloseTo(s.totalIncome - s.totalExpense, 5);
      expect(s.netVatPayable).toBeCloseTo(s.outputTax - s.inputTax, 5);
    });

    it('گزارش سود و زیان همان اعداد خلاصه‌ی مالی را در قالب صورت‌حساب بازمی‌تاباند', async () => {
      const summaryRes = await admin.call('getFinancialSummary', {});
      const reportRes = await admin.call('getProfitAndLossReport', {});
      expect(reportRes.success).toBe(true);
      expect(reportRes.report.revenue.total).toBeCloseTo(summaryRes.summary.totalIncome, 5);
      expect(reportRes.report.expenses.total).toBeCloseTo(summaryRes.summary.totalExpense, 5);
      expect(reportRes.report.netProfit).toBeCloseTo(summaryRes.summary.netProfit, 5);
      expect(reportRes.report.tax.netVatPayable).toBeCloseTo(summaryRes.summary.netVatPayable, 5);
    });

    it('CASHIER به گزارش مالی و گزارش سود و زیان دسترسی ندارد', async () => {
      expect((await cashierOnly.call('getFinancialSummary', {})).success).toBe(false);
      expect((await cashierOnly.call('getProfitAndLossReport', {})).success).toBe(false);
    });
  });

  describe('خروجی اکسل', () => {
    it('خروجی اکسل شامل یک رشته‌ی base64 غیرخالی و نام فایل .xlsx است', async () => {
      const res = await admin.call('exportTransactionsToExcel', {});
      expect(res.success).toBe(true);
      expect(typeof res.base64).toBe('string');
      expect(res.base64.length).toBeGreaterThan(100);
      expect(res.filename).toMatch(/\.xlsx$/);
    });

    it('CASHIER اجازه‌ی خروجی اکسل ندارد', async () => {
      const res = await cashierOnly.call('exportTransactionsToExcel', {});
      expect(res.success).toBe(false);
    });
  });
});
