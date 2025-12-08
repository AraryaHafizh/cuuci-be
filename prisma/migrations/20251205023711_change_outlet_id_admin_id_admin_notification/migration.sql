/*
  Warnings:

  - You are about to drop the column `outletId` on the `admin_notifications` table. All the data in the column will be lost.
  - Added the required column `adminId` to the `admin_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin_notifications" DROP COLUMN "outletId",
ADD COLUMN     "adminId" TEXT NOT NULL;
