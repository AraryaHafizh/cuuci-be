import { Station } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import { ApiError } from "../../utils/api-error";
import { PaymentService } from "../payment/payment.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";
import { Orders } from "./dto/order.dto";
import { buildOrderLog } from "../customers/helper";

const nextStationMap = {
  WASHING: "IRONING",
  IRONING: "PACKING",
} as const;

function getNextStation(station: Station): Station | null {
  return nextStationMap[station as keyof typeof nextStationMap] ?? null;
}

export class AdminService {
  private prisma: PrismaService;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  constructor() {
    this.prisma = new PrismaService();
    this.notificationService = new NotificationService();
    this.paymentService = new PaymentService();
    this.notificationService = new NotificationService();
    this.prisma = new PrismaService();
  }

  getOrders = async (adminId: string, query: Orders) => {
    const {
      orderId,
      status,
      page,
      search,
      startDate,
      endDate,
      limit,
      isHistory,
    } = query;
    const whereClause: Prisma.OrderWhereInput = {};
    const outlet = await this.prisma.outlet.findFirst({ where: { adminId } });

    if (!outlet) throw new ApiError("No outlet found", 404);
    if (!isHistory) {
      whereClause.status = { notIn: ["COMPLETED", "CANCELLED"] };
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ApiError("Invalid date range", 400);
    }
    if (startDate || endDate) {
      whereClause.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }
    if (search) {
      whereClause.orderNumber = { contains: search, mode: "insensitive" };
    }
    if (status) whereClause.status = status;

    const outletId = outlet.id;
    const where: any = { outletId };

    if (orderId) where.orderNumber = orderId;

    const skip = (page - 1) * limit;
    const orders = await this.prisma.order.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: { select: { name: true } },
      },
    });
    if (!orders) throw new ApiError("No orders found", 404);
    const total = await this.prisma.order.count({
      where: whereClause,
    });

    return {
      message: "Orders fetched successfully",
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getOrder = async (adminId: string, id: string) => {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: {
        address: true,
        payment: true,
        notes: true,
        outlet: {
          include: { admin: { select: { name: true, phoneNumber: true } } },
        },
        customer: {
          select: { name: true, phoneNumber: true },
        },
        orderItems: {
          select: {
            laundryItem: { select: { name: true } },
            quantity: true,
          },
        },
        orderWorkProcesses: {
          include: {
            worker: {
              select: {
                worker: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
        deliveryOrders: {
          include: {
            driver: {
              select: {
                driver: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
        pickupOrders: {
          select: {
            pickupNumber: true,
            pickupAt: true,
            pickupProofUrl: true,
            updatedAt: true,
            driver: {
              select: {
                driver: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
      },
    });

    if (order?.outlet.adminId !== adminId) {
      throw new ApiError("Not authorized", 401);
    }
    if (!order) throw new ApiError("No order found", 404);

    const orderLog = buildOrderLog(order);

    return {
      message: "Order detail fetched successfully",
      data: {
        ...order,
        orderLog,
        pickupOrders: undefined,
        deliveryOrders: undefined,
        orderWorkProcesses: undefined,
      },
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
    await this.paymentService.createPayment({ orderId });

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
