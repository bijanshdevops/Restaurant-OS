-- CreateEnum
CREATE TYPE "TransactionCategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionCategoryType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "taxRatePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_name_type_key" ON "TransactionCategory"("name", "type");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_referenceType_referenceId_idx" ON "Transaction"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the fixed system categories (Phase 7). Fixed, human-readable ids so
-- application code can reference them as constants (see
-- src/lib/accountingCategories.ts) instead of looking them up by name.
INSERT INTO "TransactionCategory" ("id", "name", "type", "isSystem", "taxRatePercent") VALUES
  ('txcat-income-pos', 'فروش حضوری (POS)', 'INCOME', true, NULL),
  ('txcat-income-online', 'فروش آنلاین', 'INCOME', true, NULL),
  ('txcat-income-other', 'سایر درآمدها', 'INCOME', true, NULL),
  ('txcat-expense-purchase', 'خرید کالا و مواد اولیه', 'EXPENSE', true, NULL),
  ('txcat-expense-payroll', 'حقوق و دستمزد', 'EXPENSE', true, NULL),
  ('txcat-expense-other', 'سایر هزینه‌ها', 'EXPENSE', true, NULL);
