import cron from "node-cron";
import { PrismaService } from "../modules/prisma/prisma.service";

const prisma = new PrismaService();

export const paymentReminder = cron.schedule("*/10 * * * *", async () => {
  const lower = new Date(Date.now() - 22 * 60 * 60 * 1000);
  const upper = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: "WAITING_FOR_PAYMENT",
      payment: null,
      createdAt: {
        lt: lower,
        gt: upper,
      },
    },
  });

  for (const order of orders) {
    await prisma.notification.create({
      data: {
        title: "Payment Reminder",
        description: `Please complete payment for order ${order.orderNumber}`,
        customerNotifications: {
          create: {
            userId: order.customerId,
          },
        },
      },
    });
  }
});
