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

    // tspApiKey یک مقدار حساس است و فقط باید نزد ADMIN قابل مشاهده باشد،
    // نه هر کاربر واردشده‌ای (مثل صندوق‌دار یا آشپز) که فقط برای خواندن
    // تنظیمات عمومی (مالیات، بسته‌بندی و...) این اکشن را صدا می‌زند.
    const isAdmin = auth.user?.roles?.includes('ADMIN');
    const { tspApiKey, ...rest } = settings;
    const safeSettings = isAdmin ? settings : { ...rest, tspApiKey: '' };

    return { success: true, settings: { ...safeSettings, hasApiKey: !!tspApiKey } };
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

// تنظیمات اتصال به سامانه مودیان (از طریق معتمد مالیاتی / TSP).
// tspApiKey یک مقدار حساس است؛ فقط ADMIN اجازه‌ی تغییر آن را دارد.
export async function updateModianSettings(data: {
  modianEnabled: boolean;
  economicCode: string;
  nationalId: string;
  tspProviderName: string;
  tspApiBaseUrl: string;
  tspApiKey?: string; // اگر خالی باشد، کلید قبلی دست‌نخورده باقی می‌ماند
}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const current = await prisma.restaurantSettings.findUnique({ where: { id: SETTINGS_ID } });
    const settings = await prisma.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        modianEnabled: data.modianEnabled,
        economicCode: data.economicCode,
        nationalId: data.nationalId,
        tspProviderName: data.tspProviderName,
        tspApiBaseUrl: data.tspApiBaseUrl,
        tspApiKey: data.tspApiKey || '',
      },
      update: {
        modianEnabled: data.modianEnabled,
        economicCode: data.economicCode,
        nationalId: data.nationalId,
        tspProviderName: data.tspProviderName,
        tspApiBaseUrl: data.tspApiBaseUrl,
        // اگر فیلد کلید API خالی فرستاده شود یعنی کاربر نمی‌خواهد آن را عوض کند
        tspApiKey: data.tspApiKey ? data.tspApiKey : current?.tspApiKey || '',
      },
    });
    // کلید API را در پاسخ برنمی‌گردانیم تا در کلاینت نمایش داده نشود
    const { tspApiKey, ...safeSettings } = settings;
    return { success: true, settings: { ...safeSettings, hasApiKey: !!tspApiKey } };
  } catch (error) {
    console.error('Error updating modian settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات سامانه مودیان' };
  }
}
