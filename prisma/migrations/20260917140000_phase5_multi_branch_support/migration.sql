-- Phase 5: Multi-branch support.
-- Unlike earlier phases, this migration touches EXISTING tables and rows,
-- so (unlike a plain `prisma migrate diff`) it must backfill data before
-- any column can be made NOT NULL. Order of operations matters:
--   1) create Branch + seed one default branch
--   2) create BranchInventoryStock and copy today's stock figures into it
--      (per existing InventoryItem row) before those columns are dropped
--   3) drop the now-migrated stock columns from InventoryItem
--   4) add branchId (nullable) to every table that needs it, backfill it
--      to the seeded default branch, then tighten to NOT NULL where the
--      column isn't meant to stay optional (Order/Transaction stay
--      nullable — see schema.prisma comments on why)

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Branch" ("id", "name", "isActive", "isDefault")
VALUES ('seed-default-branch', 'شعبه مرکزی', true, true);

-- CreateTable
CREATE TABLE "BranchInventoryStock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRestocked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchInventoryStock_pkey" PRIMARY KEY ("id")
);

-- Carry every existing item's stock/reorder-point/cost figures over to the
-- seeded default branch before InventoryItem loses those columns.
INSERT INTO "BranchInventoryStock" ("id", "branchId", "inventoryItemId", "currentStock", "minStockLevel", "costPerUnit", "lastRestocked")
SELECT 'seed-stock-' || "id", 'seed-default-branch', "id", "currentStock", "minStockLevel", "costPerUnit", "lastRestocked"
FROM "InventoryItem";

-- AlterTable
ALTER TABLE "InventoryItem"
  DROP COLUMN "costPerUnit",
  DROP COLUMN "currentStock",
  DROP COLUMN "lastRestocked",
  DROP COLUMN "minStockLevel";

-- CreateIndex
CREATE INDEX "BranchInventoryStock_inventoryItemId_idx" ON "BranchInventoryStock"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchInventoryStock_branchId_inventoryItemId_key" ON "BranchInventoryStock"("branchId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "BranchInventoryStock" ADD CONSTRAINT "BranchInventoryStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventoryStock" ADD CONSTRAINT "BranchInventoryStock_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User: every existing user (created before branches existed) belongs to
-- the seeded default branch. New users must pick a branch going forward.
ALTER TABLE "User" ADD COLUMN "branchId" TEXT;
UPDATE "User" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Table: table numbers become unique per branch instead of system-wide.
ALTER TABLE "Table" ADD COLUMN "branchId" TEXT;
UPDATE "Table" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Table" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Table" ADD CONSTRAINT "Table_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Table_number_key";
CREATE UNIQUE INDEX "Table_branchId_number_key" ON "Table"("branchId", "number");

-- Reservation
ALTER TABLE "Reservation" ADD COLUMN "branchId" TEXT;
UPDATE "Reservation" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Reservation" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supplier
ALTER TABLE "Supplier" ADD COLUMN "branchId" TEXT;
UPDATE "Supplier" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Supplier" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "branchId" TEXT;
UPDATE "PurchaseOrder" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift
ALTER TABLE "Shift" ADD COLUMN "branchId" TEXT;
UPDATE "Shift" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Shift" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Shift_branchId_idx" ON "Shift"("branchId");

-- Order: stays nullable going forward (online orders don't have a branch
-- yet), but every existing order did happen somewhere, so backfill it.
ALTER TABLE "Order" ADD COLUMN "branchId" TEXT;
UPDATE "Order" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Transaction: same reasoning as Order.
ALTER TABLE "Transaction" ADD COLUMN "branchId" TEXT;
UPDATE "Transaction" SET "branchId" = 'seed-default-branch' WHERE "branchId" IS NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
