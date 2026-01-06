import { PrismaService } from "../prisma/prisma.service";

export class SummaryService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOutletSummary = async (outletId: string) => {
    const now = new Date();

    // ===== DATE HELPERS (NO date-fns)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ===== METRICS
    const [
      revenueThisMonth,
      revenueLastMonth,
      totalCustomers,
      totalDrivers,
      totalWorkers,
      ordersToday,
      orderStatusOverview,
    ] = await Promise.all([
      // Revenue this month
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "SUCCESS",
          order: {
            outletId: outletId,
          },
          createdAt: { gte: startOfMonth },
        },
      }),

      // Revenue last month
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "SUCCESS",
          order: {
            outletId: outletId,
          },
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfMonth,
          },
        },
      }),

      this.prisma.user.count({ where: { role: "CUSTOMER" } }),
      this.prisma.driver.count({ where: { outletId } }),
      this.prisma.worker.count({ where: { outletId } }),

      this.prisma.order.count({
        where: {
          outletId,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),

      this.prisma.order.groupBy({
        by: ["status"],
        where: { outletId },
        _count: true,
      }),
    ]);

    return {
      revenue: {
        thisMonth: revenueThisMonth._sum.amount || 0,
        lastMonth: revenueLastMonth._sum.amount || 0,
      },
      counts: {
        customers: totalCustomers,
        drivers: totalDrivers,
        workers: totalWorkers,
        ordersToday,
      },
      orderStatusOverview: orderStatusOverview.map((o) => ({
        status: o.status,
        total: o._count,
      })),
    };
  };
}
