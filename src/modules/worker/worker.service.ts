import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import {
  Role,
  Station,
  OrderStatus,
  Shift,
  PaymentStatus,
  OrderWorkProcessStatus,
} from "../../generated/prisma/enums";
import { ProcessOrderItemDTO } from "./dto/worker.dto";
import { Prisma } from "@prisma/client";

export class WorkerService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  private async assertWorker(userId: string, role: Role) {
    if (role !== Role.WORKER) {
      throw new ApiError("Only workers may access this resource", 403);
    }

    const worker = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!worker) throw new ApiError("Worker not found", 404);

    return worker;
  }

  private async ensureActiveAttendance(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        userId,
        checkIn: { gte: startOfDay, lte: endOfDay },
        checkOut: null,
      },
    });

    if (!attendance) {
      throw new ApiError(
        "You must check-in for today before processing orders",
        400
      );
    }
  }

  private async isWorkerBusy(workerUserId: string) {
    const activeShift = await this.prisma.worker.findFirst({
      where: {
        workerId: workerUserId,
        endTime: null,
      },
    });

    return !!activeShift;
  }

  private getStationFromStatus(status: OrderStatus): Station {
    if (status === OrderStatus.WASHING) return Station.WASHING;
    if (status === OrderStatus.IRONING) return Station.IRONING;

    if (
      status === OrderStatus.PACKING ||
      status === OrderStatus.WAITING_FOR_PAYMENT
    ) {
      return Station.PACKING;
    }

    throw new ApiError("Order is not in a worker station", 400);
  }

  private getNextStatusForStation(
    currentStation: Station,
    paymentStatus?: PaymentStatus | null
  ): OrderStatus {
    if (currentStation === Station.WASHING) {
      return OrderStatus.IRONING;
    }
    if (currentStation === Station.IRONING) {
      return OrderStatus.PACKING;
    }

    if (!paymentStatus || paymentStatus !== PaymentStatus.SUCCESS) {
      return OrderStatus.WAITING_FOR_PAYMENT;
    }
    return OrderStatus.READY_FOR_DELIVERY;
  }

  private generateDeliveryNumber(orderId: string): string {
    const now = new Date();
    return `DEL-${orderId}-${now.getTime()}`;
  }

  private getCurrentShift(): Shift {
    const now = new Date();
    const hour = now.getHours();
    return hour < 12 ? Shift.MORNING : Shift.NOON;
  }

  private async notifyWorkersForStation(
    outletId: string,
    station: Station,
    description: string
  ) {
    const activeShifts = await this.prisma.worker.findMany({
      where: {
        outletId,
        station,
        endTime: null,
      },
      select: {
        workerId: true,
      },
    });

    if (!activeShifts.length) return;

    const notification = await this.prisma.notification.create({
      data: {
        title: `New job in ${station} station`,
        description,
      },
    });

    await this.prisma.workerNotification.createMany({
      data: activeShifts.map((shift) => ({
        workerId: shift.workerId,
        notificationId: notification.id,
      })),
    });
  }

  
autoCheckoutExpiredShifts = async () => {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const activeShifts = await this.prisma.worker.findMany({
    where: {
      endTime: null,
      startTime: { gte: startOfToday },
    },
    select: { id: true, startTime: true, shift: true },
  });

  const updates: Prisma.PrismaPromise<any>[] = [];

  for (const shift of activeShifts) {
    const scheduledEnd = new Date(shift.startTime);

    if (shift.shift === Shift.MORNING) {
      scheduledEnd.setHours(12, 0, 0, 0);
    } else {
      scheduledEnd.setHours(23, 59, 59, 999);
    }

    if (now >= scheduledEnd) {
      updates.push(
        this.prisma.worker.update({
          where: { id: shift.id },
          data: { endTime: scheduledEnd },
        })
      );
    }
  }

  if (updates.length > 0) {
    await this.prisma.$transaction(updates);
  }

  return {
    message: "Expired worker shifts auto-checked-out",
    count: updates.length,
  };
};

  getOrdersForStation = async (
    userId: string,
    role: Role,
    station: Station,
    page = 1,
    limit = 10
  ) => {
    const worker = await this.assertWorker(userId, role);
    if (!worker.outletId) {
      throw new ApiError("Worker is not assigned to any outlet", 400);
    }

    let statusFilter: OrderStatus;
    if (station === Station.WASHING) statusFilter = OrderStatus.WASHING;
    else if (station === Station.IRONING) statusFilter = OrderStatus.IRONING;
    else statusFilter = OrderStatus.PACKING;

    const skip = (page - 1) * limit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: {
          status: statusFilter,
          outletId: worker.outletId,
        },
        include: {
          customer: true,
          address: true,
          orderItems: {
            include: { laundryItem: true },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({
        where: {
          status: statusFilter,
          outletId: worker.outletId,
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  };

  processOrder = async (
    userId: string,
    role: Role,
    orderId: string,
    items: ProcessOrderItemDTO[]
  ) => {
    const workerUser = await this.assertWorker(userId, role);

    await this.ensureActiveAttendance(workerUser.id);

    const isBusy = await this.isWorkerBusy(workerUser.id);
    if (isBusy) {
      throw new ApiError("Worker is currently busy on another job", 400);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) throw new ApiError("Order not found", 404);

    const currentStation = this.getStationFromStatus(order.status);

    const existingProcess = await this.prisma.orderWorkProcess.findFirst({
      where: {
        orderId: order.id,
        station: currentStation,
        status: {
          in: [
            OrderWorkProcessStatus.PENDING,
            OrderWorkProcessStatus.IN_PROCESS,
          ],
        },
      },
    });

    if (existingProcess) {
      throw new ApiError(
        "This job at this station is already being processed by another worker",
        400
      );
    }

    const dbItems = order.orderItems.map((i) => ({
      id: i.laundryItemId,
      qty: i.quantity,
    }));

    const inputItems = items.map((it) => ({
      id: it.laundryItemId,
      qty: it.quantity,
    }));

    const mismatch =
      inputItems.length !== dbItems.length ||
      inputItems.some((it) => {
        const match = dbItems.find((d) => d.id === it.id);
        return !match || match.qty !== it.qty;
      });

    if (mismatch) {
      return {
        ok: false,
        needBypass: true,
        message:
          "Input items do not match original order items. Request admin bypass to continue.",
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.worker.create({
        data: {
          workerId: workerUser.id,
          outletId: order.outletId,
          station: currentStation,
          startTime: new Date(),
          shift: this.getCurrentShift(),
        },
      });

      const workProcess = await tx.orderWorkProcess.create({
        data: {
          workerId: shift.id,
          orderId: order.id,
          station: currentStation,
          status: OrderWorkProcessStatus.IN_PROCESS,
        },
      });

      return { shift, workProcess };
    });

    return {
      ok: true,
      needBypass: false,
      message: "Items verified. Worker is now processing this order.",
      station: currentStation,
      shiftId: result.shift.id,
      workProcessId: result.workProcess.id,
    };
  };

  requestBypass = async (
    userId: string,
    role: Role,
    orderId: string,
    reason?: string
  ) => {
    const worker = await this.assertWorker(userId, role);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        outlet: true,
      },
    });

    if (!order) throw new ApiError("Order not found", 404);

    const description = `Worker ${worker.name} requested bypass for order ${order.id}${
      reason ? `: ${reason}` : ""
    }`;

    const notification = await this.prisma.notification.create({
      data: {
        title: "Bypass Request",
        description,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: {
        role: Role.OUTLET_ADMIN,
        outletId: order.outletId,
      },
      select: { id: true },
    });

    if (!admins.length) {
      throw new ApiError(
        "No outlet admins found for this outlet. Cannot send bypass notification.",
        400
      );
    }

    await this.prisma.adminNotification.createMany({
      data: admins.map((admin) => ({
        adminId: admin.id,
        notificationId: notification.id,
      })),
    });

    return { message: "Bypass request sent to admin" };
  };

  completeOrderStation = async (
    userId: string,
    role: Role,
    orderId: string
  ) => {
    const workerUser = await this.assertWorker(userId, role);

    await this.ensureActiveAttendance(workerUser.id);

    const activeShift = await this.prisma.worker.findFirst({
      where: {
        workerId: workerUser.id,
        endTime: null,
      },
    });

    if (!activeShift) {
      throw new ApiError("Worker has no active job", 400);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new ApiError("Order not found", 404);

    const currentStation = this.getStationFromStatus(order.status);

    if (currentStation !== activeShift.station) {
      throw new ApiError(
        "Order station and worker active station do not match",
        400
      );
    }

    const paymentStatus = order.payment?.status ?? null;
    const nextStatus = this.getNextStatusForStation(
      currentStation,
      paymentStatus || undefined
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          ...(currentStation === Station.PACKING &&
          nextStatus === OrderStatus.READY_FOR_DELIVERY
            ? { deliveryTime: new Date() }
            : {}),
        },
      });

      const shouldEndShift =
        currentStation === Station.WASHING ||
        currentStation === Station.IRONING ||
        (currentStation === Station.PACKING &&
          nextStatus === OrderStatus.READY_FOR_DELIVERY);

      if (shouldEndShift) {
        await tx.worker.update({
          where: { id: activeShift.id },
          data: {
            endTime: new Date(),
          },
        });
      }

      await tx.orderWorkProcess.updateMany({
        where: {
          orderId: order.id,
          station: currentStation,
          workerId: activeShift.id,
          status: OrderWorkProcessStatus.IN_PROCESS,
        },
        data: {
          status: OrderWorkProcessStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      if (
        currentStation === Station.PACKING &&
        nextStatus === OrderStatus.READY_FOR_DELIVERY
      ) {
        await tx.deliveryOrder.create({
          data: {
            deliveryNumber: this.generateDeliveryNumber(order.id),
            status: OrderStatus.READY_FOR_DELIVERY,
            orderId: order.id,
          },
        });
      }
    });

    if (nextStatus === OrderStatus.IRONING) {
      await this.notifyWorkersForStation(
        order.outletId,
        Station.IRONING,
        `Order ${order.id} is now in IRONING station`
      );
    } else if (nextStatus === OrderStatus.PACKING) {
      await this.notifyWorkersForStation(
        order.outletId,
        Station.PACKING,
        `Order ${order.id} is now in PACKING station`
      );
    }

    return {
      message: "Station processing completed",
      nextStatus,
    };
  };

 
  getHistory = async (
    userId: string,
    role: Role,
    page = 1,
    limit = 10
  ) => {
    await this.assertWorker(userId, role);

    const skip = (page - 1) * limit;

    const [history, total] = await this.prisma.$transaction([
      this.prisma.worker.findMany({
        where: {
          workerId: userId,
        },
        include: {
          outlet: true,
        },
        orderBy: {
          startTime: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.worker.count({
        where: {
          workerId: userId,
        },
      }),
    ]);

    return {
      history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  };
}
