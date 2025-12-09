/*
  Warnings:

  - A unique constraint covering the columns `[outletId]` on the table `outlets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `outletId` to the `outlets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "outletId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "outlets_outletId_key" ON "outlets"("outletId");
