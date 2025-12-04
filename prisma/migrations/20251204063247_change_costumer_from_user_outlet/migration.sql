/*
  Warnings:

  - You are about to drop the column `admin` on the `outlets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "outlets" DROP COLUMN "admin",
ADD COLUMN     "adminId" TEXT;
