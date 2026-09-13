"use server";

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

const SETTINGS_ID = 'default';

export async function getSettings() {
  const auth = await requireRole();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    let settings = await prisma.restaurantSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.restaurantSettings.create({
        data: { id: SETTINGS_ID },
      });
    }

    return { success: true, settings };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { success: false, error: 'خطا در دریافت تنظیمات' };
  }
}

export async function updateSettings(data: {
  taxPercentage: number;
  packagingCost: number;
  restaurantName: string;
  contactNumber: string;
  footerMessage: string;
}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const settings = await prisma.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    return { success: true, settings };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات' };
  }
}
