import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // در محیط CI (رانر تازه، بدون کش وب‌پک/Next و با موتور Prisma هنوز
    // بالانیامده) اولین درخواست HTTP به هر مسیر می‌تواند به‌دلیل کامپایل
    // آنی (on-demand) در حالت dev چند ثانیه طول بکشد؛ مهلت بیشتری در نظر
    // می‌گیریم تا این کندی گذرا باعث شکست کاذب تست‌ها نشود.
    testTimeout: 45000,
    hookTimeout: 45000,
    // آزمون‌ها به‌صورت ترتیبی اجرا می‌شوند چون یک نشست ورود مشترک (کوکی ادمین)
    // بین فایل‌های تست به اشتراک گذاشته می‌شود و به یک دیتابیس واقعی می‌زنند.
    fileParallelism: false,
  },
});
