import { Prisma } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export class ReportService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getSalesReport = async ({
    role,
    outletId,
    from,
    to,
    groupBy,
  }: {
    role: Role;
    outletId?: string;
    from: Date;
    to: Date;
    groupBy: "day" | "month" | "year";
  }) => {
    const where: Prisma.PaymentWhereInput = {
      status: "SUCCESS",
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    // outlet restriction
    if (role === "OUTLET_ADMIN") {
      where.order = {
        outletId,
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // manual grouping (no date-fns)
    const result: Record<string, number> = {};

    for (const p of payments) {
      const d = p.createdAt;
      let key = "";

      if (groupBy === "day") {
        key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      }
      if (groupBy === "month") {
        key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      }
      if (groupBy === "year") {
        key = `${d.getFullYear()}`;
      }

      result[key] = (result[key] || 0) + p.amount;
    }

    return Object.entries(result).map(([period, totalIncome]) => ({
      period,
      totalIncome,
    }));
  };

  getEmployeePerformance = async ({
    role,
    outletId,
    from,
    to,
  }: {
    role: Role;
    outletId?: string;
    from: Date;
    to: Date;
  }) => {
    const outletFilter = role === "OUTLET_ADMIN" ? { outletId } : {};

    // WORKERS
    const workers = await this.prisma.worker.findMany({
      where: outletFilter,
      select: {
        id: true,
        worker: { select: { name: true } },
        orderWorkProcesses: {
          where: {
            createdAt: { gte: from, lte: to },
          },
        },
      },
    });

    const workerReport = workers.map((w) => ({
      workerId: w.id,
      name: w.worker.name,
      totalJobs: w.orderWorkProcesses.length,
    }));

    // DRIVERS
    const drivers = await this.prisma.driver.findMany({
      where: outletFilter,
      select: {
        id: true,
        driver: { select: { name: true } },
        pickupOrders: {
          where: { createdAt: { gte: from, lte: to } },
        },
        deliveryOrders: {
          where: { createdAt: { gte: from, lte: to } },
        },
      },
    });

    const driverReport = drivers.map((d) => ({
      driverId: d.id,
      name: d.driver.name,
      totalJobs: d.pickupOrders.length + d.deliveryOrders.length,
    }));

    return {
      workers: workerReport,
      drivers: driverReport,
    };
  };
}
