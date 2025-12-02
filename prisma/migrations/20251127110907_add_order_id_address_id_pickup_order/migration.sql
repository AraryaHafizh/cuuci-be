/*
  Warnings:

  - You are about to drop the column `costumerId` on the `pickup_orders` table. All the data in the column will be lost.
  - Added the required column `addressId` to the `pickup_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `pickup_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outletId` to the `pickup_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pickup_orders" DROP CONSTRAINT "pickup_orders_costumerId_fkey";

-- AlterTable
ALTER TABLE "pickup_orders" DROP COLUMN "costumerId",
ADD COLUMN     "addressId" TEXT NOT NULL,
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "outletId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
