-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('MOCK_EXPRESS');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryProvider" "DeliveryProvider",
ADD COLUMN "externalDeliveryId" TEXT,
ADD COLUMN "externalTrackingUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalDeliveryId_key" ON "Order"("externalDeliveryId");
