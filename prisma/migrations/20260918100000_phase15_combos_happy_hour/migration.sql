-- CreateEnum
CREATE TYPE "HappyHourDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isCombo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "happyHourDiscountPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "happyHourRuleId" TEXT,
ADD COLUMN     "happyHourRuleName" TEXT;

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemComboComponent" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "menuItemTitle" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderItemComboComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHourRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" "HappyHourDiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "daysOfWeek" INTEGER[],
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HappyHourRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHourRuleItem" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "HappyHourRuleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Combo_menuItemId_key" ON "Combo"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboItem_comboId_menuItemId_key" ON "ComboItem"("comboId", "menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "HappyHourRuleItem_ruleId_menuItemId_key" ON "HappyHourRuleItem"("ruleId", "menuItemId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_happyHourRuleId_fkey" FOREIGN KEY ("happyHourRuleId") REFERENCES "HappyHourRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComboComponent" ADD CONSTRAINT "OrderItemComboComponent_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComboComponent" ADD CONSTRAINT "OrderItemComboComponent_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourRuleItem" ADD CONSTRAINT "HappyHourRuleItem_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "HappyHourRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourRuleItem" ADD CONSTRAINT "HappyHourRuleItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
