import cron from "node-cron";
import { PrismaService } from "../modules/prisma/prisma.service";

const prisma = new PrismaService()

export const autoConfirmDeliveredOrders = () => {
  cron.schedule("*/5 * * * * *", async () => {
    await prisma.order.findMany({
        where: {status: "DELIVERY_ON_THE_WAY"},
    })


    // add logic here
    console.log("running task");
  });
};
