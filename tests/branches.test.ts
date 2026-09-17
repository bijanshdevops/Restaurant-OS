import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

const rand = () => Math.floor(1_000_000 + Math.random() * 8_999_999);

describe('پشتیبانی چند شعبه‌ای: مدیریت شعبه‌ها و ایزوله‌سازی داده بین شعبه‌ها', () => {
  let admin: TestClient;
  let defaultBranchId: string;
  let branchBId: string;
  let staffA: TestClient; // پرسنل شعبه‌ی پیش‌فرض (همان شعبه‌ی ادمین)
  let staffB: TestClient; // پرسنل شعبه‌ی جدید (branchB)
  let staffAId: string;
  let staffBId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();

    const branchesRes = await admin.call('getBranches');
    expect(branchesRes.success).toBe(true);
    const defaultBranch = branchesRes.branches.find((b: any) => b.isDefault);
    expect(defaultBranch).toBeTruthy();
    defaultBranchId = defaultBranch.id;

    const createBranchRes = await admin.call('createBranch', {
      name: `شعبه تستی ${rand()}`,
      address: 'آدرس تستی',
      phone: '02100000000',
    });
    expect(createBranchRes.success).toBe(true);
    branchBId = createBranchRes.branch.id;

    const userA = await admin.call('createUser', {
      name: `پرسنل شعبه الف ${rand()}`,
      username: `branchA_${rand()}`,
      password: '123456',
      roles: ['CASHIER', 'INVENTORY_MANAGER', 'ACCOUNTANT'],
    });
    expect(userA.success).toBe(true);
    staffAId = userA.user.id;
    expect(userA.user.branchId).toBe(defaultBranchId);

    const userB = await admin.call('createUser', {
      name: `پرسنل شعبه ب ${rand()}`,
      username: `branchB_${rand()}`,
      password: '123456',
      roles: ['CASHIER', 'INVENTORY_MANAGER', 'ACCOUNTANT'],
      branchId: branchBId,
    });
    expect(userB.success).toBe(true);
    staffBId = userB.user.id;
    expect(userB.user.branchId).toBe(branchBId);

    staffA = new TestClient();
    const loginA = await staffA.call('login', userA.user.username, '123456');
    expect(loginA.success).toBe(true);

    staffB = new TestClient();
    const loginB = await staffB.call('login', userB.user.username, '123456');
    expect(loginB.success).toBe(true);
  });

  it('نمی‌توان شعبه‌ی پیش‌فرض را غیرفعال کرد', async () => {
    const res = await admin.call('setBranchActive', defaultBranchId, false);
    expect(res.success).toBe(false);
  });

  it('شعبه‌ی جدید قابل غیرفعال و دوباره فعال‌سازی است', async () => {
    const off = await admin.call('setBranchActive', branchBId, false);
    expect(off.success).toBe(true);
    expect(off.branch.isActive).toBe(false);

    const on = await admin.call('setBranchActive', branchBId, true);
    expect(on.success).toBe(true);
    expect(on.branch.isActive).toBe(true);
  });

  it('ویرایش اطلاعات شعبه ذخیره می‌شود', async () => {
    const res = await admin.call('updateBranch', branchBId, {
      name: `شعبه تستی ویرایش‌شده ${rand()}`,
      address: 'آدرس جدید',
      phone: '02199999999',
    });
    expect(res.success).toBe(true);
    expect(res.branch.address).toBe('آدرس جدید');
  });

  it('کاربر غیرمدیر نمی‌تواند شعبه بسازد یا ویرایش کند', async () => {
    const createRes = await staffA.call('createBranch', { name: 'شعبه غیرمجاز' });
    expect(createRes.success).toBe(false);

    const updateRes = await staffA.call('updateBranch', branchBId, { name: 'دستکاری' });
    expect(updateRes.success).toBe(false);
  });

  it('کالای انبار ثبت‌شده توسط شعبه‌ی ب برای پرسنل شعبه‌ی الف قابل مشاهده نیست، اما ادمین همه را می‌بیند', async () => {
    const itemRes = await staffB.call('createInventoryItem', {
      name: `کالای شعبه ب ${rand()}`,
      category: 'مواد خام',
      unit: 'کیلوگرم',
      currentStock: 10,
      minStockLevel: 2,
    });
    expect(itemRes.success).toBe(true);
    expect(itemRes.item.branchId).toBe(branchBId);

    const listA = await staffA.call('getInventoryItems');
    expect(listA.success).toBe(true);
    expect(listA.items.some((i: any) => i.id === itemRes.item.id)).toBe(false);

    const listB = await staffB.call('getInventoryItems');
    expect(listB.items.some((i: any) => i.id === itemRes.item.id)).toBe(true);

    const listAdmin = await admin.call('getInventoryItems');
    expect(listAdmin.items.some((i: any) => i.id === itemRes.item.id)).toBe(true);
  });

  let tableBId: string;

  it('میز ساخته‌شده در شعبه‌ی ب برای پرسنل شعبه‌ی الف در فهرست میزها دیده نمی‌شود', async () => {
    const number = 9500 + Math.floor(Math.random() * 400);
    const tableRes = await admin.call('createTable', number, 4, branchBId);
    expect(tableRes.success).toBe(true);
    expect(tableRes.table.branchId).toBe(branchBId);
    tableBId = tableRes.table.id;

    const tablesA = await staffA.call('getTables');
    expect(tablesA.success).toBe(true);
    expect(tablesA.tables.some((t: any) => t.id === tableBId)).toBe(false);

    const tablesB = await staffB.call('getTables');
    expect(tablesB.tables.some((t: any) => t.id === tableBId)).toBe(true);

    const tablesAdmin = await admin.call('getTables');
    expect(tablesAdmin.tables.some((t: any) => t.id === tableBId)).toBe(true);
  });

  it('پرسنل شعبه‌ی الف نمی‌تواند وضعیت میز شعبه‌ی ب را تغییر دهد یا برایش رزرو ثبت کند', async () => {
    const statusRes = await staffA.call('updateTableStatus', tableBId, 'OCCUPIED');
    expect(statusRes.success).toBe(false);

    const reservationRes = await staffA.call('createReservation', {
      tableId: tableBId,
      guestName: 'مهمان تستی',
      guestPhone: '09120000009',
      partySize: 2,
      reservationTime: new Date(Date.now() + 3 * 3_600_000).toISOString(),
    });
    expect(reservationRes.success).toBe(false);

    const okRes = await staffB.call('createReservation', {
      tableId: tableBId,
      guestName: 'مهمان تستی ب',
      guestPhone: '09120000010',
      partySize: 2,
      reservationTime: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    });
    expect(okRes.success).toBe(true);
  });

  it('تأمین‌کننده‌ی ثبت‌شده در شعبه‌ی ب برای پرسنل شعبه‌ی الف قابل مشاهده یا ویرایش نیست', async () => {
    const supRes = await staffB.call('createSupplier', { name: `تأمین‌کننده ب ${rand()}` });
    expect(supRes.success).toBe(true);
    expect(supRes.supplier.branchId).toBe(branchBId);

    const listA = await staffA.call('getSuppliers');
    expect(listA.suppliers.some((s: any) => s.id === supRes.supplier.id)).toBe(false);

    const listAdmin = await admin.call('getSuppliers');
    expect(listAdmin.suppliers.some((s: any) => s.id === supRes.supplier.id)).toBe(true);

    const updateAttempt = await staffA.call('updateSupplier', supRes.supplier.id, { name: 'دستکاری' });
    expect(updateAttempt.success).toBe(false);
    expect(updateAttempt.error).toBe('دسترسی غیرمجاز');
  });

  it('سفارش خرید همیشه به شعبه‌ی تأمین‌کننده‌اش تعلق می‌گیرد و شعبه‌ی دیگر نمی‌تواند آن را دریافت کند', async () => {
    const itemRes = await staffB.call('createInventoryItem', {
      name: `کالای خرید ب ${rand()}`,
      category: 'مواد خام',
      unit: 'عدد',
      currentStock: 0,
      minStockLevel: 5,
    });
    expect(itemRes.success).toBe(true);

    const supRes = await staffB.call('createSupplier', { name: `تأمین‌کننده خرید ب ${rand()}` });
    expect(supRes.success).toBe(true);

    const poRes = await staffB.call('createPurchaseOrder', {
      supplierId: supRes.supplier.id,
      items: [{ inventoryItemId: itemRes.item.id, quantity: 5, unitCost: 1000 }],
    });
    expect(poRes.success).toBe(true);
    expect(poRes.order.branchId).toBe(branchBId);

    const listA = await staffA.call('getPurchaseOrders');
    expect(listA.orders.some((o: any) => o.id === poRes.order.id)).toBe(false);

    const receiveAttempt = await staffA.call('receivePurchaseOrderItems', poRes.order.id, [
      { purchaseOrderItemId: poRes.order.items[0].id, quantity: 1 },
    ]);
    expect(receiveAttempt.success).toBe(false);
    expect(receiveAttempt.error).toBe('دسترسی غیرمجاز');

    const orderRes = await staffB.call('markPurchaseOrderOrdered', poRes.order.id);
    expect(orderRes.success).toBe(true);

    const receiveOk = await staffB.call('receivePurchaseOrderItems', poRes.order.id, [
      { purchaseOrderItemId: poRes.order.items[0].id, quantity: 5 },
    ]);
    expect(receiveOk.success).toBe(true);
    expect(receiveOk.order.status).toBe('RECEIVED');
  });

  it('شیفت شعبه‌ی ب فقط با پرسنل همان شعبه قابل تخصیص است', async () => {
    const today = new Date();
    const start = new Date(today.getTime() + 60_000);
    const end = new Date(today.getTime() + 3_600_000);
    const shiftRes = await admin.call('createShift', {
      date: start.toISOString().slice(0, 10),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      branchId: branchBId,
    });
    expect(shiftRes.success).toBe(true);
    expect(shiftRes.shift.branchId).toBe(branchBId);

    const assignWrongBranch = await admin.call('assignStaffToShift', shiftRes.shift.id, staffAId);
    expect(assignWrongBranch.success).toBe(false);

    const assignCorrect = await admin.call('assignStaffToShift', shiftRes.shift.id, staffBId);
    expect(assignCorrect.success).toBe(true);
  });

  it('مدیر می‌تواند فهرست شیفت‌ها را بر اساس شعبه فیلتر کند', async () => {
    const shiftsB = await admin.call('getShifts', undefined, branchBId);
    expect(shiftsB.success).toBe(true);
    expect(shiftsB.shifts.length).toBeGreaterThan(0);
    expect(shiftsB.shifts.every((s: any) => s.branchId === branchBId)).toBe(true);
  });

  it('هزینه‌ی ثبت‌شده توسط شعبه‌ی ب در تراکنش‌های شعبه‌ی الف دیده نمی‌شود، اما ادمین همه را می‌بیند', async () => {
    const expenseRes = await staffB.call('createExpense', 'هزینه تستی شعبه ب', 50000);
    expect(expenseRes.success).toBe(true);
    expect(expenseRes.transaction.branchId).toBe(branchBId);

    const txA = await staffA.call('getTransactions');
    expect(txA.transactions.some((t: any) => t.id === expenseRes.transaction.id)).toBe(false);

    const txB = await staffB.call('getTransactions');
    expect(txB.transactions.some((t: any) => t.id === expenseRes.transaction.id)).toBe(true);

    const txAdmin = await admin.call('getTransactions');
    expect(txAdmin.transactions.some((t: any) => t.id === expenseRes.transaction.id)).toBe(true);
  });

  it('سفارش صندوق (POS) به شعبه‌ی کاربر ثبت‌کننده تعلق می‌گیرد و فقط همان شعبه (یا ادمین) می‌تواند وضعیتش را تغییر دهد', async () => {
    const menuRes = await admin.call('createMenuItem', {
      title: `آیتم تستی چندشعبه‌ای ${rand()}`,
      price: 80000,
      category: 'تست',
      subCategory: '',
      imageUrl: '',
    });
    expect(menuRes.success).toBe(true);

    const orderRes = await staffB.call('createOrder', [{ menuItemId: menuRes.item.id, quantity: 1 }]);
    expect(orderRes.success).toBe(true);
    expect(orderRes.order.branchId).toBe(branchBId);

    const updateAttempt = await staffA.call('updateOrderStatus', orderRes.order.id, 'PREPARING');
    expect(updateAttempt.success).toBe(false);

    const updateByOwner = await staffB.call('updateOrderStatus', orderRes.order.id, 'PREPARING');
    expect(updateByOwner.success).toBe(true);

    const updateByAdmin = await admin.call('updateOrderStatus', orderRes.order.id, 'COMPLETED');
    expect(updateByAdmin.success).toBe(true);
  });

  it('مدیر می‌تواند پرسنل را به شعبه‌ی دیگر جابه‌جا کند', async () => {
    const res = await admin.call('updateUserBranch', staffAId, branchBId);
    expect(res.success).toBe(true);
    expect(res.user.branchId).toBe(branchBId);

    // بازگرداندن به حالت اول برای جلوگیری از اثر روی سایر آزمون‌ها
    const revert = await admin.call('updateUserBranch', staffAId, defaultBranchId);
    expect(revert.success).toBe(true);
    expect(revert.user.branchId).toBe(defaultBranchId);
  });

  it('نهایی‌سازی سفارش آنلاین، موجودی را دقیقاً از شعبه‌ی پیش‌فرض کم می‌کند', async () => {
    const ingredientRes = await admin.call('createInventoryItem', {
      name: `ماده آنلاین تستی ${rand()}`,
      category: 'مواد خام',
      unit: 'عدد',
      currentStock: 100,
      minStockLevel: 1,
    });
    expect(ingredientRes.success).toBe(true);

    const menuRes = await admin.call('createMenuItem', {
      title: `غذای آنلاین تستی ${rand()}`,
      price: 60000,
      category: 'تست',
      subCategory: '',
      imageUrl: '',
    });
    expect(menuRes.success).toBe(true);

    const recipeRes = await admin.call('saveMenuItemRecipe', menuRes.item.id, [
      { inventoryItemId: ingredientRes.item.id, quantity: 3 },
    ]);
    expect(recipeRes.success).toBe(true);

    const customer = new TestClient();
    const phone = `0910${rand()}`;
    const otpRes = await customer.call('requestOtp', phone);
    await customer.call('verifyOtp', phone, otpRes.devCode, 'مشتری چندشعبه‌ای');

    const orderRes = await customer.call(
      'createOnlineOrder',
      [{ menuItemId: menuRes.item.id, quantity: 2 }],
      'آدرس تستی چندشعبه‌ای',
      0
    );
    expect(orderRes.success).toBe(true);
    // سفارش آنلاین هنوز به هیچ شعبه‌ای تعلق ندارد (محدودیت شناخته‌شده)
    expect(orderRes.order.branchId).toBeFalsy();

    const finalized = await admin.call('finalizeOnlineOrderAfterPayment', orderRes.order.id);
    expect(finalized.status).toBe('PENDING');

    const itemsDefault = await admin.call('getInventoryItems', defaultBranchId);
    const foundDefault = itemsDefault.items.find((i: any) => i.id === ingredientRes.item.id);
    expect(foundDefault).toBeTruthy();
    expect(foundDefault.currentStock).toBe(100 - 3 * 2);

    // موجودی شعبه‌ی ب نباید تحت تأثیر قرار گرفته باشد (چون این ماده اصلاً آنجا موجودی ندارد)
    const itemsB = await admin.call('getInventoryItems', branchBId);
    expect(itemsB.items.some((i: any) => i.id === ingredientRes.item.id)).toBe(false);
  });
});
