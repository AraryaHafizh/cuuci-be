import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";

export class SummaryService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getMetrics = async (userId: string, role: Role) => {
    const data: any = {};
    if (role === "SUPER_ADMIN") {
      const revenue = await this.prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      });

      const outlets = await this.prisma.outlet.aggregate({
        _count: { id: true },
      });

      const orders = await this.prisma.order.aggregate({
        _count: { id: true },
      });

      const users = await this.prisma.user.groupBy({
        by: ["role"],
        where: { deletedAt: null },
        _count: { role: true },
      });

      const roleCounts: Record<string, number> = {};
      users.forEach((u) => {
        roleCounts[u.role] = u._count.role ?? 0;
      });

      const totalUsers = users.reduce(
        (sum, u) => sum + (u._count.role ?? 0),
        0
      );

      data.revenue = revenue._sum.amount ?? 0;
      data.outlets = outlets._count.id ?? 0;
      data.orders = orders._count.id ?? 0;
      data.customers = roleCounts["CUSTOMER"] ?? 0;
      data.workers = roleCounts["WORKER"] ?? 0;
      data.drivers = roleCounts["DRIVER"] ?? 0;
      data.admins = roleCounts["OUTLET_ADMIN"] ?? 0;
      data.users = totalUsers;
    }
    if (role === "OUTLET_ADMIN") {
      const outlet = await this.prisma.outlet.findFirst({
        where: { adminId: userId },
        include: {
          orders: {
            select: {
              payment: { select: { amount: true, status: true } },
              pickupOrders: { select: { id: true } },
              deliveryOrders: { select: { id: true } },
              orderWorkProcesses: { select: { id: true } },
            },
          },
          workers: {
            where: { worker: { deletedAt: null } },
            select: { id: true },
          },
          drivers: {
            where: { driver: { deletedAt: null } },
            select: { id: true },
          },
        },
      });

      if (!outlet) throw new ApiError("Outlet not found", 404);

      const totalRevenue = outlet.orders.reduce((sum, order) => {
        if (order.payment?.status === "SUCCESS") {
          return sum + (order.payment.amount ?? 0);
        }
        return sum;
      }, 0);

      const totalOrders = outlet.orders.length;

      const totalPickupOrders = outlet.orders.reduce(
        (sum, order) => sum + (order.pickupOrders?.length ?? 0),
        0
      );

      const totalDeliveryOrders = outlet.orders.reduce(
        (sum, order) => sum + (order.deliveryOrders?.length ?? 0),
        0
      );

      const totalOrderWorkProcesses = outlet.orders.reduce(
        (sum, order) => sum + (order.orderWorkProcesses?.length ?? 0),
        0
      );

      const totalWorkers = outlet.workers.length;
      const totalDrivers = outlet.drivers.length;

      data.revenue = totalRevenue;
      data.orders = totalOrders;
      data.workers = totalWorkers;
      data.drivers = totalDrivers;
      data.pickup = totalPickupOrders;
      data.delivery = totalDeliveryOrders;
      data.inProgress = totalOrderWorkProcesses;
    }

    return {
      message: "metric fetched successfully",
      data: data,
    };
  };

  useOutletOverview = async () => {
    const outlets = await this.prisma.outlet.findMany({
      include: {
        orders: { select: { id: true } },
        drivers: { select: { id: true } },
        workers: { select: { id: true } },
      },
    });

    const data: any = [];

    outlets.forEach((outlet) => {
      data.push({
        id: outlet.id,
        name: outlet.name,
        orders: outlet.orders.length,
        drivers: outlet.drivers.length,
        workers: outlet.workers.length,
      });
    });

    return {
      message: "Outlet performance fetched successfully",
      data: data,
    };
  };

  getOrderOverview = async (userId: string, role: Role) => {
    let statusCounts = [];

    if (role === "OUTLET_ADMIN") {
      const outlet = await this.prisma.outlet.findFirst({
        where: { adminId: userId },
        select: { id: true },
      });

      if (!outlet) throw new ApiError("Outlet not found", 404);

      statusCounts = await this.prisma.order.groupBy({
        by: ["status"],
        where: { outletId: outlet.id },
        _count: { status: true },
      });
    } else if (role === "SUPER_ADMIN") {
      statusCounts = await this.prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
      });
    } else {
      throw new ApiError("Unauthorized", 403);
    }

    const statusOverview: Record<string, number> = {};
    statusCounts.forEach((item) => {
      statusOverview[item.status] = item._count.status;
    });

    return {
      message: "Order status overview fetched successfully",
      data: statusOverview,
    };
  };

  getWorkerActivity = async (userId: string) => {
    const outlet = await this.prisma.outlet.findFirst({
      where: { adminId: userId },
      include: {
        workers: {
          select: {
            id: true,
            worker: { select: { name: true, deletedAt: true } },
            station: true,
          },
        },
        drivers: {
          select: {
            id: true,
            driver: { select: { name: true, deletedAt: true } },
            currentPickupOrderId: true,
            currentDeliveryOrderId: true,
          },
        },
      },
    });

    if (!outlet) throw new ApiError("Outlet not found", 404);

    const workers = outlet.workers
      .filter((w) => w.worker && w.worker.deletedAt === null)
      .map((worker) => ({
        id: worker.id,
        name: worker.worker.name,
        station: worker.station,
      }));

    const drivers = outlet.drivers
      .filter((d) => d.driver && d.driver.deletedAt === null)
      .map((driver) => ({
        id: driver.id,
        name: driver.driver.name,
        pickup: driver.currentPickupOrderId,
        delivery: driver.currentDeliveryOrderId,
      }));

    return {
      message: "Worker activity fetched successfully",
      data: { workers, drivers },
    };
  };
}
