/*
  Warnings:

  - Added the required column `outletId` to the `order_work_processes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderWorkProcessStatus" ADD VALUE 'BYPASS_REQUESTED';

-- AlterTable
ALTER TABLE "order_work_processes" ADD COLUMN     "outletId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "order_work_processes" ADD CONSTRAINT "order_work_processes_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
