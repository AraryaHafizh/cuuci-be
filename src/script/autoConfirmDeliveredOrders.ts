import cron from "node-cron";
import { PrismaService } from "../modules/prisma/prisma.service";


const prisma = new PrismaService();

export const autoConfirmOrders = cron.schedule("0 * * * *", async () => {
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: "DELIVERY_ON_THE_WAY",
      deliveryTime: { lt: threshold },
    },
  });

  for (const order of orders) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED" },
    });
  }
});