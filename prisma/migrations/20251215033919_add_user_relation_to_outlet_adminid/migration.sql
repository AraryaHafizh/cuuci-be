/*
  Warnings:

  - A unique constraint covering the columns `[adminId]` on the table `outlets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_outletId_fkey";

-- CreateTable
CREATE TABLE "_OutletToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutletToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OutletToUser_B_index" ON "_OutletToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_adminId_key" ON "outlets"("adminId");

-- AddForeignKey
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletToUser" ADD CONSTRAINT "_OutletToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletToUser" ADD CONSTRAINT "_OutletToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
