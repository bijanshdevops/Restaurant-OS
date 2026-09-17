"use server";

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { requireRole, resolveBranchFilter, resolveBranchForCreate } from '@/lib/auth';

export async function getTransactions(branchId?: string) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchFilter(auth.user, branchId);
    // تراکنش‌های سفارش آنلاین (branchId=null) بدون شعبه ثبت می‌شوند؛ در
    // فیلتر شعبه‌ای هم نمایش داده می‌شوند تا از دید حسابداری گم نشوند.
    const transactions = await prisma.transaction.findMany({
      where: effectiveBranchId ? { OR: [{ branchId: effectiveBranchId }, { branchId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { branch: { select: { id: true, name: true } } },
    });

    return { success: true, transactions };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: 'Failed to fetch transactions' };
  }
}

export async function createExpense(description: string, amount: number, branchId?: string) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const effectiveBranchId = resolveBranchForCreate(auth.user, branchId);
    const expense = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        description,
        amount,
        branchId: effectiveBranchId,
      }
    });

    return { success: true, transaction: expense };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { success: false, error: 'Failed to create expense' };
  }
}
