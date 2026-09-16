import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // آزمون‌ها به‌صورت ترتیبی اجرا می‌شوند چون یک نشست ورود مشترک (کوکی ادمین)
    // بین فایل‌های تست به اشتراک گذاشته می‌شود و به یک دیتابیس واقعی می‌زنند.
    fileParallelism: false,
  },
});
