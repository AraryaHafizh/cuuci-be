// src/modules/worker/worker.service.ts
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
    if (status === OrderStatus.PACKING) return Station.PACKING;
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

  private async notifyWorkersForStation(
    outletId: string,
    station: Station,
    description: string
  ) {

    const workers = await this.prisma.user.findMany({
      where: {
        role: Role.WORKER,
        outletId,
      },
      select: { id: true },
    });

    if (!workers.length) return;

    const notification = await this.prisma.notification.create({
      data: {
        title: `New job in ${station} station`,
        description,
      },
    });

    await this.prisma.userNotification.createMany({
      data: workers.map((w) => ({
        userId: w.id,
        notificationId: notification.id,
      })),
    });
  }


  getOrdersForStation = async (
    userId: string,
    role: Role,
    station: Station
  ) => {
    await this.assertWorker(userId, role);

    let statusFilter: OrderStatus;
    if (station === Station.WASHING) statusFilter = OrderStatus.WASHING;
    else if (station === Station.IRONING) statusFilter = OrderStatus.IRONING;
    else statusFilter = OrderStatus.PACKING;

    const orders = await this.prisma.order.findMany({
      where: {
        status: statusFilter,
      },
      include: {
        customer: true,
        address: true,
        orderItems: {
          include: { laundryItem: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return orders;
  };

  processOrder = async (
    userId: string,
    role: Role,
    orderId: string,
    items: ProcessOrderItemDTO[]
  ) => {
    const workerUser = await this.assertWorker(userId, role);

  
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
          shift: Shift.MORNING, 
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

    await this.prisma.adminNotification.create({
      data: {
        outletId: order.outletId,
        notificationId: notification.id,
      },
    });

    return { message: "Bypass request sent to admin" };
  };


  completeOrderStation = async (
    userId: string,
    role: Role,
    orderId: string
  ) => {
    const workerUser = await this.assertWorker(userId, role);

    // Active shift = worker busy at some station
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
      // 1) move order status
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

   
      await tx.worker.update({
        where: { id: activeShift.id },
        data: {
          endTime: new Date(),
        },
      });

      // 3) mark the work-process row as completed
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
    });

    // notify next station workers if needed
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

  // ======================================================
  // JOB HISTORY
  // ======================================================
  // GET /worker/history
  getHistory = async (userId: string, role: Role) => {
    await this.assertWorker(userId, role);

    const history = await this.prisma.worker.findMany({
      where: {
        workerId: userId,
      },
      include: {
        outlet: true,
      },
      orderBy: {
        startTime: "desc",
      },
    });

    return history;
  };
}
