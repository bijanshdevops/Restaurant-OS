"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function getMenuItems() {
  const auth = await requireRole();
  if (!auth.ok) return [];

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

/**
 * Menu listing for the public/customer-facing online ordering pages. No
 * staff session required, and deliberately excludes cost/ingredient fields
 * (`ingredients`) that are only meaningful internally.
 */
export async function getPublicMenuItems() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        category: true,
        subCategory: true,
        price: true,
        imageUrl: true,
      },
    });
    return items;
  } catch (error) {
    console.error('Error fetching public menu items:', error);
    return [];
  }
}

export async function createMenuItem(data: {
  title: string;
  price: number;
  category: string;
  subCategory: string;
  imageUrl: string;
  isAvailable?: boolean;
  ingredients?: string;
}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const newItem = await prisma.menuItem.create({
      data: {
        title: data.title,
        price: data.price,
        category: data.category,
        subCategory: data.subCategory || null,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
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
  isAvailable?: boolean;
  ingredients?: string;
}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        title: data.title,
        price: data.price,
        category: data.category,
        subCategory: data.subCategory || null,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
        ingredients: data.ingredients || null,
      },
    });
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('Error updating menu item:', error);
    return { success: false, error: 'Failed to update menu item' };
  }
}

export async function createMenuItemsBulk(items: {
  title: string;
  price: number;
  category: string;
  subCategory?: string;
  imageUrl?: string;
  ingredients?: string;
}[]) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const validItems = items.filter((i) => i.title && i.price > 0);

    if (validItems.length === 0) {
      return { success: false, error: 'هیچ ردیف معتبری برای وارد کردن یافت نشد' };
    }

    const result = await prisma.menuItem.createMany({
      data: validItems.map((i) => ({
        title: i.title,
        price: i.price,
        category: i.category || 'غذا',
        subCategory: i.subCategory || null,
        imageUrl: i.imageUrl || null,
        ingredients: i.ingredients || null,
      })),
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error('Error bulk creating menu items:', error);
    return { success: false, error: 'خطا در وارد کردن گروهی آیتم‌ها' };
  }
}

export async function deleteMenuItem(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

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
