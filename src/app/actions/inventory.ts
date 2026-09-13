"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function getInventoryItems() {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return { success: false, error: 'Failed to fetch inventory items' };
  }
}

export async function createInventoryItem(data: {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
}) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const newItem = await prisma.inventoryItem.create({
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentStock: data.currentStock,
        minStockLevel: data.minStockLevel,
      },
    });
    return { success: true, item: newItem };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: 'Failed to create inventory item' };
  }
}

export async function restockInventoryItem(id: string, addedAmount: number) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    // Use Prisma's atomic `increment` instead of read-then-write: two concurrent
    // restocks of the same item would otherwise race and one update could be
    // silently lost.
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        currentStock: { increment: addedAmount },
        lastRestocked: new Date(),
      },
    });

    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('Error restocking inventory item:', error);
    return { success: false, error: 'Failed to restock inventory item' };
  }
}

export async function deleteInventoryItem(id: string) {
  const auth = await requireRole('ADMIN', 'INVENTORY_MANAGER');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await prisma.inventoryItem.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: 'Failed to delete inventory item' };
  }
}
