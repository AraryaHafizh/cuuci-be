import { Station } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";
import { orders } from "./dto/order.dto";

const nextStationMap = {
  WASHING: "IRONING",
  IRONING: "PACKING",
} as const;

function getNextStation(station: Station): Station | null {
  return nextStationMap[station as keyof typeof nextStationMap] ?? null;
}

export class AdminService {
  private prisma: PrismaService;
  private notificationService: NotificationService;

  constructor() {
    this.prisma = new PrismaService();
    this.notificationService = new NotificationService();
  }

  getOrders = async (adminId: string, query: orders) => {
    const { orderId, status } = query;
    const outlet = await this.prisma.outlet.findFirst({ where: { adminId } });

    if (!outlet) throw new ApiError("No outlet found", 404);

    const outletId = outlet.id;
    const where: any = { outletId };

    if (orderId) where.orderNumber = orderId;
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({ where });
    if (!orders) throw new ApiError("No orders found", 404);

    return {
      message: "Orders fetched successfully",
      data: orders,
    };
  };

  getArrivedOrders = async (adminId: string) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { adminId } });

    const orders = await this.prisma.order.findMany({
      where: {
        outletId: outlet!.id,
        status: "ARRIVED_AT_OUTLET",
        totalPrice: 0,
        totalWeight: 0,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        address: true,
        driver: {
          select: {
            id: true,
            driver: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      message: "Arrived orders fetched successfully",
      data: orders,
    };
  };

  getBypassOrders = async (adminId: string) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { adminId } });

    const orders = await this.prisma.orderWorkProcess.findMany({
      where: { outletId: outlet!.id, status: "BYPASS_REQUESTED" },
      include: {
        order: {
          select: { orderNumber: true, notes: { where: { type: "BYPASS" } } },
        },
        worker: { select: { worker: { select: { name: true } } } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      message: "Bypass requested orders fetched successfully",
      data: orders,
    };
  };

  assignOrderToWorkers = async (orderId: string, body: CreateDTO) => {
    const { totalPrice, totalWeight, orderItems } = body;
    await this.prisma.$transaction(async (tx) => {
      const notes = await tx.notes.findFirst({
        where: { orderId, type: "INSTRUCTION" },
      });

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          totalPrice,
          totalWeight,
        },
      });
      const mergedItems = Object.values(
        orderItems.reduce((acc: any, item: any) => {
          acc[item.id] ??= { laundryItemId: item.id, quantity: 0 };
          acc[item.id].quantity += item.qty;
          return acc;
        }, {})
      );
      await tx.orderItem.createMany({
        data: mergedItems.map((item: any) => ({
          orderId,
          laundryItemId: item.laundryItemId,
          quantity: item.quantity,
        })),
      });

      await tx.orderWorkProcess.create({
        data: {
          orderId,
          station: "WASHING",
          notes: notes?.body,
          outletId: order.outletId,
        },
      });

      const workers = await tx.worker.findMany({
        where: { outletId: order.outletId },
      });
      if (!workers) throw new ApiError("No drivers available", 400);

      const notification = await tx.notification.create({
        data: {
          title: "New Task Available",
          description: `Washing task for Order #${order.orderNumber}.`,
        },
      });
      await tx.workerNotification.createMany({
        data: workers.map((worker) => ({
          userId: worker.workerId,
          notificationId: notification.id,
          isRead: false,
        })),
      });
    });

    return { message: "Create task success!" };
  };

  resolveBypass = async (id: string) => {
    const order = await this.prisma.orderWorkProcess.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            orderNumber: true,
            outletId: true,
            customerId: true,
            payment: true,
            notes: { where: { type: "BYPASS" } },
          },
        },
      },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.status === "COMPLETED") {
      throw new ApiError("Bypass already resolved", 400);
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: order.workerId! },
    });
    if (!worker) throw new ApiError("Worker not found", 404);

    const nextStation = getNextStation(order.station);

    await this.prisma.$transaction(async (tx) => {
      const notes = await tx.notes.findFirst({
        where: { orderId: order.orderId, type: "INSTRUCTION" },
      });

      await tx.orderWorkProcess.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await tx.worker.update({
        where: { id: worker.id },
        data: { isBypass: false, station: null },
      });

      await tx.notes.delete({ where: { id: order.order.notes[0].id } });

      if (nextStation) {
        await tx.order.update({
          where: { id: order.orderId },
          data: { status: nextStation },
        });
        await tx.orderWorkProcess.create({
          data: {
            orderId: order.orderId,
            outletId: order.outletId,
            station: nextStation,
            notes: notes?.body,
          },
        });
      } else {
        const finalStatus = order.order.payment
          ? "READY_FOR_DELIVERY"
          : "WAITING_FOR_PAYMENT";

        await tx.order.update({
          where: { id: order.orderId },
          data: { status: finalStatus },
        });
      }
    });

    await this.notificationService.pushNotification({
      title: "Bypass Resolved",
      description: "Your bypass request has been resolved",
      receiverId: worker.workerId,
      role: "WORKER",
    });

    if (nextStation) {
      await this.notificationService.pushNotificationBulk({
        title: "New Task Available",
        description: `${nextStation} task for Order #${order.order.orderNumber}.`,
        outletId: order.order.outletId,
        role: "WORKER",
      });
    } else {
      await this.notificationService.pushNotification({
        title: "Order finish",
        description: "Your order is finished and ready for payment.",
        receiverId: order.order.customerId,
        role: "CUSTOMER",
      });
    }

    return { message: "Bypass resolved successfully" };
  };
}
