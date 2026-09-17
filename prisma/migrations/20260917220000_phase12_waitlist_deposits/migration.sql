-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "depositRefundedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatedAt" TIMESTAMP(3),
    "tableId" TEXT,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistEntry_branchId_status_idx" ON "WaitlistEntry"("branchId", "status");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the fixed system categories for reservation-deposit transactions (Phase 12).
INSERT INTO "TransactionCategory" ("id", "name", "type", "isSystem", "taxRatePercent") VALUES
  ('txcat-income-reservation-deposit', 'پیش‌پرداخت رزرو', 'INCOME', true, NULL),
  ('txcat-expense-reservation-deposit-refund', 'استرداد پیش‌پرداخت رزرو', 'EXPENSE', true, NULL);
