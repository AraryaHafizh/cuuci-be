-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_driverId_fkey";

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
