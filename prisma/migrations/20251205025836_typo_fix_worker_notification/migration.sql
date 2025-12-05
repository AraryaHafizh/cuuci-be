/*
  Warnings:

  - You are about to drop the column `workerid` on the `worker_notifications` table. All the data in the column will be lost.
  - Added the required column `workerId` to the `worker_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "worker_notifications" DROP COLUMN "workerid",
ADD COLUMN     "workerId" TEXT NOT NULL;
