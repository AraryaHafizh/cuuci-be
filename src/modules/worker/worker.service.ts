// src/modules/worker/worker.service.ts
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import {
  Role,
  Station,
  OrderStatus,
  Shift,
  PaymentStatus,
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

  /**
   * A worker is considered BUSY if:
   * - they already picked up a job (items matched & processOrder succeeded),
   * - we have created a WorkerShift row for them,
   * - and that shift has no endTime yet (still active).
   *
   * We ONLY create such a WorkerShift when the order’s status is one of:
   * WASHING, IRONING, PACKING. So “active shift” == “active job in a station”.
   */
  private async isWorkerBusy(workerId: string) {
    const activeShift = await this.prisma.workerShift.findFirst({
      where: {
        workerId,
        endTime: null, // active job in some station
      },
    });

    return !!activeShift;
  }

  /**
   * Map order status → station.
   * This guarantees we only treat WASHING / IRONING / PACKING
   * as worker stations.
   */
  private getStationFromStatus(status: OrderStatus): Station {
    if (status === OrderStatus.WASHING) return Station.WASHING;
    if (status === OrderStatus.IRONING) return Station.IRONING;
    if (status === OrderStatus.PACKING) return Station.PACKING;
    throw new ApiError("Order is not in a worker station", 400);
  }

  /**
   * Decide the next order status after a station is completed.
   */
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

    // PACKING → depends on payment
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
    // Simple implementation: notify all workers in the outlet.
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

  // ======================================================
  // ORDER LIST (AVAILABLE JOBS PER STATION)
  // ======================================================
  // GET /worker/orders?station=WASHING|IRONING|PACKING
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

  // ======================================================
  // PROCESS ORDER (INPUT ITEM LIST) + MARK WORKER BUSY
  // ======================================================
  // POST /worker/orders/:orderId/process
  processOrder = async (
    userId: string,
    role: Role,
    orderId: string,
    items: ProcessOrderItemDTO[]
  ) => {
    const worker = await this.assertWorker(userId, role);

    // If worker already has an active job (in ANY station),
    // they cannot start another one.
    const isBusy = await this.isWorkerBusy(worker.id);
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

    // This will throw if order.status is NOT WASHING / IRONING / PACKING.
    const currentStation = this.getStationFromStatus(order.status);

    // Compare items from worker input with items in DB
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
      // ❌ Do NOT mark worker busy, do NOT change status
      // Worker is still free, and must request bypass if they want to continue.
      return {
        ok: false,
        needBypass: true,
        message:
          "Input items do not match original order items. Request admin bypass to continue.",
      };
    }

    // ✅ Items match:
    // This is the moment backend knows:
    // - worker has picked up a job,
    // - submitted the re-input correctly,
    // - order is in a worker station status.
    // We now mark them as BUSY using WorkerShift (endTime still null).
    const shift = await this.prisma.workerShift.create({
      data: {
        workerId: worker.id,
        outletId: order.outletId,
        station: currentStation,
        startTime: new Date(),
        shift: Shift.MORNING, // adjust if you want dynamic shift
      },
    });

    return {
      ok: true,
      needBypass: false,
      message: "Items verified. Worker is now processing this order.",
      station: currentStation,
      shiftId: shift.id,
    };
  };

  // ======================================================
  // REQUEST BYPASS
  // ======================================================
  // POST /worker/orders/:orderId/request-bypass
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

    // Notify outlet admins via AdminNotification
    await this.prisma.adminNotification.create({
      data: {
        outletId: order.outletId,
        notificationId: notification.id,
      },
    });

    return { message: "Bypass request sent to admin" };
  };

  // ======================================================
  // COMPLETE STATION (MOVE TO NEXT STATION OR PAYMENT FLOW)
  // ======================================================
  // POST /worker/orders/:orderId/complete
  completeOrderStation = async (
    userId: string,
    role: Role,
    orderId: string
  ) => {
    const worker = await this.assertWorker(userId, role);

    // Active shift = worker is currently busy on some station.
    const activeShift = await this.prisma.workerShift.findFirst({
      where: {
        workerId: worker.id,
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

    // Ensure order is still in a valid worker station status.
    const currentStation = this.getStationFromStatus(order.status);

    // Ensure the station of active job matches order’s current station
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
          // If packing → READY_FOR_DELIVERY, we can set deliveryTime
          ...(currentStation === Station.PACKING &&
          nextStatus === OrderStatus.READY_FOR_DELIVERY
            ? { deliveryTime: new Date() }
            : {}),
        },
      });

      // Mark worker FREE by closing the active shift.
      await tx.workerShift.update({
        where: { id: activeShift.id },
        data: {
          endTime: new Date(),
        },
      });
    });

    // Notify workers of the *next* station (IRONING or PACKING)
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

    const history = await this.prisma.workerShift.findMany({
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
