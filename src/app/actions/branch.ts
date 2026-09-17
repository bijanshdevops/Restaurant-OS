"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

/**
 * فهرست شعبه‌ها برای هر کاربر واردشده آزاد است (نام شعبه اطلاعات حساسی
 * نیست و برای نمایش هدر، انتخاب شعبه هنگام ساخت کاربر/رکورد، و غیره لازم
 * است). مدیریت (ساخت/ویرایش/غیرفعال‌سازی) فقط با ADMIN است.
 */
export async function getBranches() {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    return { success: true, branches };
  } catch (error) {
    console.error('Error fetching branches:', error);
    return { success: false, error: 'خطا در دریافت فهرست شعبه‌ها' };
  }
}

export async function createBranch(data: { name: string; address?: string; phone?: string }) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name?.trim()) {
    return { success: false, error: 'نام شعبه الزامی است' };
  }

  try {
    const branch = await prisma.branch.create({
      data: {
        name: data.name.trim(),
        address: data.address?.trim() || '',
        phone: data.phone?.trim() || '',
      },
    });
    return { success: true, branch };
  } catch (error) {
    console.error('Error creating branch:', error);
    return { success: false, error: 'خطا در ثبت شعبه' };
  }
}

export async function updateBranch(id: string, data: { name: string; address?: string; phone?: string }) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name?.trim()) {
    return { success: false, error: 'نام شعبه الزامی است' };
  }

  try {
    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name.trim(),
        address: data.address?.trim() || '',
        phone: data.phone?.trim() || '',
      },
    });
    return { success: true, branch };
  } catch (error) {
    console.error('Error updating branch:', error);
    return { success: false, error: 'خطا در ویرایش شعبه' };
  }
}

export async function setBranchActive(id: string, isActive: boolean) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    // شعبه‌ی پیش‌فرض (مقصد سفارش‌های آنلاین و داده‌های قدیمی) هرگز نباید
    // غیرفعال شود، وگرنه سفارش‌های آنلاین جدید بدون شعبه‌ی معتبر می‌مانند.
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return { success: false, error: 'شعبه یافت نشد' };
    if (branch.isDefault && !isActive) {
      return { success: false, error: 'شعبه‌ی پیش‌فرض را نمی‌توان غیرفعال کرد' };
    }

    const updated = await prisma.branch.update({ where: { id }, data: { isActive } });
    return { success: true, branch: updated };
  } catch (error) {
    console.error('Error updating branch status:', error);
    return { success: false, error: 'خطا در تغییر وضعیت شعبه' };
  }
}

/**
 * شعبه‌ی پیش‌فرض مقصد سفارش‌های آنلاین (که هنوز انتخاب شعبه ندارند) و
 * موجودی/تراکنش‌های داده‌ی قدیمی است. دقیقاً یک شعبه باید isDefault=true
 * داشته باشد؛ این اکشن آن را جابه‌جا می‌کند (شعبه‌ی قبلی خودکار خاموش می‌شود).
 */
export async function setDefaultBranch(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return { success: false, error: 'شعبه یافت نشد' };
    if (!branch.isActive) return { success: false, error: 'شعبه‌ی غیرفعال نمی‌تواند پیش‌فرض شود' };

    await prisma.$transaction([
      prisma.branch.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      prisma.branch.update({ where: { id }, data: { isDefault: true } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error setting default branch:', error);
    return { success: false, error: 'خطا در تعیین شعبه‌ی پیش‌فرض' };
  }
}

/** شناسه‌ی شعبه‌ی پیش‌فرض فعلی — برای مقصد دادن سفارش‌های آنلاین به آن. */
export async function getDefaultBranchId(): Promise<string> {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  if (!branch) throw new Error('هیچ شعبه‌ی پیش‌فرضی تعریف نشده است');
  return branch.id;
}
