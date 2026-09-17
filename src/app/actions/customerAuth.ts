"use server";

import { prisma } from '@/lib/prisma';
import { PasswordHasher } from '@/shared/infrastructure/security/PasswordHasher';
import { createCustomerSession, destroyCustomerSession, requireCustomer } from '@/lib/customerAuth';
import { getSmsProvider } from '@/lib/sms';

const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between requests
const OTP_MAX_ATTEMPTS = 5;

/** Normalizes an Iranian mobile number to the canonical "09xxxxxxxxx" form. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('98') ? `0${digits.slice(2)}` : digits;
  if (!/^09\d{9}$/.test(local)) return null;
  return local;
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { success: false, error: 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)' };
  }

  try {
    const recent = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return { success: false, error: 'کمی صبر کنید و دوباره تلاش کنید.' };
    }

    const code = generateOtpCode();
    const codeHash = await PasswordHasher.hash(code);
    await prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await getSmsProvider().sendOtp(phone, code);

    return {
      success: true,
      phone,
      // Dev/test convenience only: never leak the code in a real production
      // deployment, where a real SMS gateway is expected to be configured
      // instead. ENABLE_TEST_ROUTES=1 is also accepted here (in addition to
      // NODE_ENV !== 'production') so automated E2E tests can drive the OTP
      // flow even when they run against a production build (e.g. `next
      // build && next start`, used as a Windows dev-mode workaround) — that
      // flag is never set in a real production deployment, only in CI/test.
      devCode:
        process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_ROUTES === '1'
          ? code
          : undefined,
    };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return { success: false, error: 'خطا در ارسال کد تایید' };
  }
}

export async function verifyOtp(rawPhone: string, code: string, fullName?: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { success: false, error: 'شماره موبایل معتبر نیست' };
  }

  try {
    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return { success: false, error: 'کد منقضی شده است. دوباره درخواست کد دهید.' };
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return { success: false, error: 'تعداد تلاش‌های مجاز به پایان رسید. دوباره درخواست کد دهید.' };
    }

    const isValid = await PasswordHasher.compare(code, otp.codeHash);
    if (!isValid) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, error: 'کد وارد شده اشتباه است' };
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    let customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone,
          fullName: fullName?.trim() || 'مشتری',
        },
      });
    }

    await createCustomerSession({
      id: customer.id,
      phone: customer.phone,
      fullName: customer.fullName,
    });

    return { success: true, customer };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'خطا در تایید کد' };
  }
}

export async function logoutCustomer() {
  await destroyCustomerSession();
  return { success: true };
}

export async function getCustomerProfile() {
  const auth = await requireCustomer();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { include: { menuItem: true } }, payment: true },
        },
      },
    });
    if (!customer) return { success: false, error: 'مشتری یافت نشد' };
    return { success: true, customer };
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return { success: false, error: 'خطا در دریافت اطلاعات' };
  }
}
