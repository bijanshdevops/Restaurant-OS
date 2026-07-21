"use server";

import { prisma } from '@/lib/prisma';

export async function getMenuItems() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { title: 'asc' }
    });
    return items;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
}

export async function createMenuItem(data: {
  title: string;
  price: number;
  category: string;
  subCategory: string;
  imageUrl: string;
  ingredients?: string;
}) {
  try {
    const newItem = await prisma.menuItem.create({
      data: {
        title: data.title,
        price: data.price,
        category: data.category,
        subCategory: data.subCategory || null,
        imageUrl: data.imageUrl || null,
        ingredients: data.ingredients || null,
      },
    });
    return { success: true, item: newItem };
  } catch (error) {
    console.error('Error creating menu item:', error);
    return { success: false, error: 'Failed to create menu item' };
  }
}

export async function updateMenuItem(id: string, data: {
  title: string;
  price: number;
  category: string;
  subCategory: string;
  imageUrl: string;
  ingredients?: string;
}) {
  try {
    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        title: data.title,
        price: data.price,
        category: data.category,
        subCategory: data.subCategory || null,
        imageUrl: data.imageUrl || null,
        ingredients: data.ingredients || null,
      },
    });
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('Error updating menu item:', error);
    return { success: false, error: 'Failed to update menu item' };
  }
}

export async function deleteMenuItem(id: string) {
  try {
    await prisma.menuItem.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return { success: false, error: 'Failed to delete menu item' };
  }
}
