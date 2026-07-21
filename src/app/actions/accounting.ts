"use server";

import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

export async function getTransactions() {
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
