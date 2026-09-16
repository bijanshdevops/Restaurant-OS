/**
 * ابزار کمکی مشترک تست‌ها: یک کلاینت HTTP سبک که کوکی نشست را مثل یک مرورگر
 * نگه می‌دارد و روت /api/test-helpers را برای صدا زدن اکشن‌های سرور واقعی
 * فراخوانی می‌کند. هدف این است که تست‌ها دقیقاً همان مسیر واقعی برنامه
 * (Server Action پشت یک سشن واقعی) را طی کنند، نه یک شبیه‌سازی جدا.
 */

// از 127.0.0.1 به‌جای localhost استفاده می‌کنیم: در برخی محیط‌ها (مثل رانرهای
// لینوکسی CI) پیاده‌سازی fetch در Node.js ممکن است «localhost» را ابتدا به
// ::1 (IPv6) resolve کند، درحالی‌که سرور Next.js فقط روی IPv4 گوش می‌دهد؛
// نتیجه‌اش اتصال ناموفق یا هنگ کردن درخواست‌ها (و timeout کاذب تست‌ها) است.
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

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
