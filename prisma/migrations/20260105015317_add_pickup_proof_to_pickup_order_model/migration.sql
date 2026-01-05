-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'LOOKING_FOR_DRIVER';

-- AlterTable
ALTER TABLE "pickup_orders" ADD COLUMN     "pickupAt" TIMESTAMP(3),
ADD COLUMN     "pickupProofUrl" TEXT;
