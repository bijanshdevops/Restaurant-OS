import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const CUSTOMER_SESSION_COOKIE = 'restaurant_customer_session';
const CUSTOMER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — customers shouldn't have to re-OTP every visit

export interface SessionCustomer {
  id: string;
  phone: string;
  fullName: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.');
  }

  console.warn('[customerAuth] WARNING: JWT_SECRET is not set. Using an insecure development-only fallback.');
  return 'dev-only-insecure-fallback-secret-change-me';
}

/**
 * Signs a session token for the given customer and stores it in an httpOnly
 * cookie, kept entirely separate from the staff session cookie so a customer
 * and a staff member can be logged in on the same browser at once, and so
 * neither session can be mistaken for the other by any Server Action.
 */
export async function createCustomerSession(customer: SessionCustomer): Promise<void> {
  const token = jwt.sign(customer, getSecret(), { expiresIn: CUSTOMER_SESSION_MAX_AGE_SECONDS });
  cookies().set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  cookies().delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCurrentCustomer(): Promise<SessionCustomer | null> {
  const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, getSecret()) as SessionCustomer;
  } catch {
    return null;
  }
}

type CustomerAuthResult =
  | { ok: true; customer: SessionCustomer }
  | { ok: false; error: string };

/** Guards a customer-facing Server Action. */
export async function requireCustomer(): Promise<CustomerAuthResult> {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false, error: 'ابتدا با شماره موبایل خود وارد شوید.' };
  }
  return { ok: true, customer };
}
