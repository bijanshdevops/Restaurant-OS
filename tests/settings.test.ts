import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

describe('تنظیمات: کلید API سامانه مودیان هرگز نزد نقش غیرمدیر فاش نمی‌شود', () => {
  let admin: TestClient;
  let cashier: TestClient;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    const username = 'test_settings_cashier_' + Date.now();
    const createRes = await admin.call('createUser', {
      name: 'صندوق‌دار تست تنظیمات',
      username,
      password: 'test-pass-123',
      roles: ['CASHIER'],
    });
    expect(createRes.success).toBe(true);

    cashier = new TestClient();
    const loginRes = await cashier.call('login', username, 'test-pass-123');
    expect(loginRes.success).toBe(true);
  });

  it('ADMIN مقدار hasApiKey را می‌بیند اما کلید واقعی هیچ‌وقت در پاسخ برنمی‌گردد', async () => {
    await admin.call('updateModianSettings', {
      modianEnabled: false,
      economicCode: 'x',
      nationalId: 'y',
      tspProviderName: 'test',
      tspApiBaseUrl: 'https://example.invalid',
      tspApiKey: 'super-secret-key',
    });

    const res = await admin.call('getSettings');
    expect(res.success).toBe(true);
    expect(res.settings.tspApiKey).not.toBe('super-secret-key');
    expect(res.settings.hasApiKey).toBe(true);
  });

  it('نقش غیرمدیر (CASHIER) هیچ مقداری از کلید API دریافت نمی‌کند', async () => {
    const res = await cashier.call('getSettings');
    expect(res.success).toBe(true);
    expect(res.settings.tspApiKey).toBeFalsy();
  });
});
