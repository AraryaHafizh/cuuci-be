import cron from "node-cron";
import { PrismaService } from "../modules/prisma/prisma.service";

const prisma = new PrismaService();

export const cancelUnpaidOrders = cron.schedule("*/5 * * * *", async () => {
  const deadline = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: "WAITING_FOR_PAYMENT",
      createdAt: { lt: deadline },
      payment: null,
    },
  });

  for (const order of orders) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
  }
});
