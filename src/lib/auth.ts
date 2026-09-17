import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const SESSION_COOKIE = 'restaurant_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  roles: Role[];
  // --- Phase 5: multi-branch support ---
  // شعبه‌ی محل خدمت این کاربر. نقش ADMIN از فیلتر شعبه مستثناست (همه‌جا را
  // می‌بیند)؛ فقط سایر نقش‌ها همیشه به همین شعبه محدود می‌شوند.
  branchId: string;
  branchName: string;
}

/** true اگر این کاربر نقش ADMIN دارد و بنابراین از محدودیت شعبه مستثناست. */
export function isBranchExempt(user: SessionUser): boolean {
  return user.roles?.includes('ADMIN');
}

/**
 * شعبه‌ی مؤثر برای یک عملیات: اگر کاربر ADMIN باشد و صریحاً شعبه‌ای
 * انتخاب کرده باشد همان، وگرنه (برای ADMIN بدون انتخاب) undefined به‌معنای
 * «همه‌ی شعبه‌ها»؛ برای غیر ADMIN همیشه شعبه‌ی خودش، صرف‌نظر از هر مقداری
 * که از کلاینت رسیده — تا یک کاربر عادی هرگز نتواند با فرستادن یک
 * branchId دلخواه به داده‌ی شعبه‌ی دیگری دسترسی پیدا کند.
 */
export function resolveBranchFilter(user: SessionUser, requestedBranchId?: string): string | undefined {
  if (isBranchExempt(user)) {
    return requestedBranchId || undefined;
  }
  return user.branchId;
}

/** شعبه‌ای که یک رکورد جدید باید به آن تعلق بگیرد: مثل resolveBranchFilter اما هرگز undefined برنمی‌گرداند (ADMIN بدون انتخاب صریح، به شعبه‌ی خودش می‌افتد). */
export function resolveBranchForCreate(user: SessionUser, requestedBranchId?: string): string {
  if (isBranchExempt(user) && requestedBranchId) {
    return requestedBranchId;
  }
  return user.branchId;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    // Never allow a guessable/unsigned session in production.
    throw new Error('JWT_SECRET environment variable must be set in production.');
  }

  console.warn('[auth] WARNING: JWT_SECRET is not set. Using an insecure development-only fallback.');
  return 'dev-only-insecure-fallback-secret-change-me';
}

/**
 * Signs a session token for the given user and stores it in an httpOnly cookie.
 * Must be called from a Server Action or Route Handler (not a Server Component render).
 */
export async function createSession(user: SessionUser): Promise<void> {
  const token = jwt.sign(user, getSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the session cookie (logout). */
export async function destroySession(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

/** Reads and verifies the current session cookie, if any. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, getSecret()) as SessionUser;
  } catch {
    return null;
  }
}

type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

/**
 * Guards a Server Action. Call with no arguments to require any logged-in user,
 * or pass one or more roles to require the caller to have at least one of them.
 *
 * Usage:
 *   const auth = await requireRole('ADMIN');
 *   if (!auth.ok) return { success: false, error: auth.error };
 */
export async function requireRole(...allowedRoles: Role[]): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: 'ابتدا وارد سیستم شوید.' };
  }

  if (allowedRoles.length > 0 && !allowedRoles.some((r) => user.roles?.includes(r))) {
    return { ok: false, error: 'شما اجازه دسترسی به این بخش را ندارید.' };
  }

  return { ok: true, user };
}
