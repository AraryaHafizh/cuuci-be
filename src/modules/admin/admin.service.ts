import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";
import { orders } from "./dto/order.dto";

export class AdminService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
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

    if (orders.length === 0) throw new ApiError("No arrived orders found", 404);

    return {
      message: "Arrived orders fetched successfully",
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
}
