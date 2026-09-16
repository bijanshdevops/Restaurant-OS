import { describe, it, expect } from 'vitest';
import { TestClient, loginAsAdmin } from './helpers';

describe('احراز هویت و کنترل دسترسی (RBAC)', () => {
  it('ورود با رمز اشتباه رد می‌شود', async () => {
    const client = new TestClient();
    const res = await client.call('login', 'admin', 'wrong-password-xyz');
    expect(res.success).toBe(false);
  });

  it('ورود با نام کاربری و رمز صحیح موفق است و نشست ایجاد می‌کند', async () => {
    const client = await loginAsAdmin();
    // بعد از ورود موفق، یک اکشن نیازمند نشست باید بدون خطای «ابتدا وارد شوید» کار کند
    const res = await client.call('getUsers');
    expect(res.success).toBe(true);
  });

  it('بدون ورود، اکشن‌های محافظت‌شده رد می‌شوند', async () => {
    const client = new TestClient(); // بدون لاگین
    const res = await client.call('getUsers');
    expect(res.success).toBe(false);
  });

  it('کاربر با نقش غیرمدیر (CASHIER) نمی‌تواند به اکشن مخصوص ADMIN دسترسی داشته باشد', async () => {
    const admin = await loginAsAdmin();
    const uniqueUsername = 'test_cashier_' + Date.now();
    const createRes = await admin.call('createUser', {
      name: 'صندوق‌دار تستی',
      username: uniqueUsername,
      password: 'test-pass-123',
      roles: ['CASHIER'],
    });
    expect(createRes.success).toBe(true);

    const cashier = new TestClient();
    const loginRes = await cashier.call('login', uniqueUsername, 'test-pass-123');
    expect(loginRes.success).toBe(true);

    // getUsers فقط برای ADMIN مجاز است
    const forbidden = await cashier.call('getUsers');
    expect(forbidden.success).toBe(false);
  });
});
