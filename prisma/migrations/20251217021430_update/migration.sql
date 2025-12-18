/*
  Warnings:

  - A unique constraint covering the columns `[driverId]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[adminId]` on the table `outlets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workerId]` on the table `workers` will be added. If there are existing duplicate values, this will fail.
  - Made the column `orderId` on table `delivery_orders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderId` on table `pickup_orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "OrderWorkProcessStatus" ADD VALUE 'BYPASS_REQUESTED';

-- DropForeignKey
ALTER TABLE "delivery_orders" DROP CONSTRAINT "delivery_orders_orderId_fkey";

-- DropForeignKey
ALTER TABLE "pickup_orders" DROP CONSTRAINT "pickup_orders_orderId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_outletId_fkey";

-- AlterTable
ALTER TABLE "delivery_orders" ALTER COLUMN "orderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_work_processes" ADD COLUMN     "outletId" TEXT;

-- AlterTable
ALTER TABLE "pickup_orders" ALTER COLUMN "orderId" SET NOT NULL;

-- CreateTable
CREATE TABLE "_OutletToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutletToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OutletToUser_B_index" ON "_OutletToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driverId_key" ON "drivers"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_adminId_key" ON "outlets"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_workerId_key" ON "workers"("workerId");

-- AddForeignKey
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_work_processes" ADD CONSTRAINT "order_work_processes_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletToUser" ADD CONSTRAINT "_OutletToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletToUser" ADD CONSTRAINT "_OutletToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
