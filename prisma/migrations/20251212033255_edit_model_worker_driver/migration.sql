-- AlterTable
ALTER TABLE "drivers" ALTER COLUMN "pickupOrderId" DROP NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workers" ALTER COLUMN "station" DROP NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL;
