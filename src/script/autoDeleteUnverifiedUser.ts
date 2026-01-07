import cron from "node-cron";
import { PrismaService } from "../modules/prisma/prisma.service";


const prisma = new PrismaService();

export const autoDeleteUnverifiedUser = cron.schedule("0 * * * *", async () => {

  const users = await prisma.user.findMany({
    where: {
      emailVerified: false,
      verifiedAt: null
    },
  });

  for (const user of users) {
    await prisma.user.delete({
      where: { id: user.id }
    });
  }
});