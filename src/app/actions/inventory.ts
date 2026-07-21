"use server";

import { prisma } from '@/lib/prisma';

export async function getInventoryItems() {
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
  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Item not found' };
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        currentStock: existing.currentStock + addedAmount,
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
