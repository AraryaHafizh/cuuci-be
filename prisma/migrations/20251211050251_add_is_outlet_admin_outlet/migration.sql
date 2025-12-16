-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isOutletAdmin" BOOLEAN NOT NULL DEFAULT false;
