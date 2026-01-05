/*
  Warnings:

  - You are about to drop the column `driverId` on the `driver_notifications` table. All the data in the column will be lost.
  - Added the required column `userId` to the `driver_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "driver_notifications" DROP CONSTRAINT "driver_notifications_driverId_fkey";

-- AlterTable
ALTER TABLE "driver_notifications" DROP COLUMN "driverId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "driver_notifications" ADD CONSTRAINT "driver_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
