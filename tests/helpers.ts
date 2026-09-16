/**
 * ابزار کمکی مشترک تست‌ها: یک کلاینت HTTP سبک که کوکی نشست را مثل یک مرورگر
 * نگه می‌دارد و روت /api/test-helpers را برای صدا زدن اکشن‌های سرور واقعی
 * فراخوانی می‌کند. هدف این است که تست‌ها دقیقاً همان مسیر واقعی برنامه
 * (Server Action پشت یک سشن واقعی) را طی کنند، نه یک شبیه‌سازی جدا.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export class TestClient {
  private cookie: string | null = null;

  async call<T = any>(action: string, ...args: any[]): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/test-helpers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: JSON.stringify({ action, args }),
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // فقط بخش name=value را نگه می‌داریم (بدون Path/HttpOnly/...)
      this.cookie = setCookie.split(';')[0];
    }

    return res.json();
  }

  clearCookie() {
    this.cookie = null;
  }
}

export async function loginAsAdmin(): Promise<TestClient> {
  const client = new TestClient();
  const res = await client.call('login', 'admin', '123');
  if (!res.success) {
    throw new Error('ورود ادمین تستی ناموفق بود: ' + res.error);
  }
  return client;
}
