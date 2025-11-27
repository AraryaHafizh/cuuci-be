/*
  Warnings:

  - You are about to drop the `OrderWorkProcess` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `costumerId` to the `pickup_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderWorkProcess" DROP CONSTRAINT "OrderWorkProcess_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderWorkProcess" DROP CONSTRAINT "OrderWorkProcess_workerId_fkey";

-- AlterTable
ALTER TABLE "pickup_orders" ADD COLUMN     "costumerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "OrderWorkProcess";

-- CreateTable
CREATE TABLE "order_work_processes" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "station" "Station" NOT NULL,
    "status" "OrderWorkProcessStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_work_processes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_work_processes" ADD CONSTRAINT "order_work_processes_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_work_processes" ADD CONSTRAINT "order_work_processes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_costumerId_fkey" FOREIGN KEY ("costumerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
