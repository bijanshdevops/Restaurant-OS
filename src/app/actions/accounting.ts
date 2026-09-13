"use server";

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { requireRole } from '@/lib/auth';

export async function getTransactions() {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, transactions };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: 'Failed to fetch transactions' };
  }
}

export async function createExpense(description: string, amount: number) {
  const auth = await requireRole('ADMIN', 'ACCOUNTANT');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const expense = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        description,
        amount,
      }
    });

    return { success: true, transaction: expense };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { success: false, error: 'Failed to create expense' };
  }
}
