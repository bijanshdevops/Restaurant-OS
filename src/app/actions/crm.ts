"use server";

import { prisma } from '@/lib/prisma';
import { LoyaltyTier } from '@prisma/client';

export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: [
        { loyaltyTier: 'desc' },
        { totalSpent: 'desc' }
      ]
    });
    return { success: true, customers };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Failed to fetch customers' };
  }
}

export async function createCustomer(data: {
  fullName: string;
  phone: string;
}) {
  try {
    const newCustomer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        loyaltyTier: 'NORMAL',
        totalOrders: 0,
        totalSpent: 0,
      }
    });
    return { success: true, customer: newCustomer };
  } catch (error) {
    console.error('Error creating customer:', error);
    // Unique constraint on phone can throw an error
    return { success: false, error: 'Failed to create customer (Phone number might already exist)' };
  }
}
