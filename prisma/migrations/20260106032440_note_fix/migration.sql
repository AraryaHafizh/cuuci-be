/*
  Warnings:

  - You are about to drop the column `workerId` on the `worker_notifications` table. All the data in the column will be lost.
  - You are about to drop the `notes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `worker_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('COMPLAINT', 'BYPASS', 'INSTRUCTION');

-- DropForeignKey
ALTER TABLE "order_work_processes" DROP CONSTRAINT "order_work_processes_workerId_fkey";

-- DropForeignKey
ALTER TABLE "worker_notifications" DROP CONSTRAINT "worker_notifications_workerId_fkey";

-- AlterTable
ALTER TABLE "order_work_processes" ALTER COLUMN "workerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "worker_notifications" DROP COLUMN "workerId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "notes";

-- DropEnum
DROP TYPE "Notes";

-- CreateTable
CREATE TABLE "Notes" (
    "id" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'INSTRUCTION',
    "body" TEXT,
    "orderId" TEXT,

    CONSTRAINT "Notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_work_processes" ADD CONSTRAINT "order_work_processes_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_notifications" ADD CONSTRAINT "worker_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
