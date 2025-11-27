// src/modules/driver/driver.service.ts
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { Role } from "../../generated/prisma/enums";

export class DriverService {
  private prisma: PrismaService;
  private allowedRolesForDriver: Role[] = [Role.DRIVER];

  constructor() {
    this.prisma = new PrismaService();
  }

  private getActiveDriverByUserId = async (userId: string) => {
    const driver = await this.prisma.driver.findFirst({
      where: {
        driverId: userId,
      },
      include: {
        outlet: true,
      },
    });

    if (!driver) {
      throw new ApiError("Driver profile not found", 404);
    }

    return driver;
  };

  private assertDriverRole = (role: Role) => {
    if (!this.allowedRolesForDriver.includes(role)) {
      throw new ApiError("Only drivers are allowed to access this resource", 403);
    }
  };

  // =========================
  // Pickup/Delivery Request List
  // =========================

  getRequestsForDriver = async (userId: string, role: Role) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const pickupRequests = await this.prisma.pickupOrder.findMany({
      where: {
        status: "WAITING_FOR_PICKUP",
        driverId: null,
        order: {
          outletId: driver.outletId,
        },
      },
      include: {
        order: {
          include: {
            customer: true,
            outlet: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const deliveryRequests = await this.prisma.deliveryOrder.findMany({
      where: {
        status: "READY_FOR_DELIVERY",
        driverId: null,
        order: {
          outletId: driver.outletId,
        },
      },
      include: {
        order: {
          include: {
            customer: true,
            outlet: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      driver: {
        id: driver.id,
        outletId: driver.outletId,
      },
      pickupRequests,
      deliveryRequests,
    };
  };

  // =========================
  // Pickup / Delivery DETAILS
  // =========================

  getPickupOrderDetail = async (userId: string, role: Role, pickupOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: {
        order: {
          include: {
            customer: true,
            outlet: true,
            address: true,
          },
        },
        driver: true,
      },
    });

    if (!pickupOrder) {
      throw new ApiError("Pickup request not found", 404);
    }

    if (pickupOrder.order && pickupOrder.order.outletId !== driver.outletId) {
      throw new ApiError("Pickup request is not in your outlet", 403);
    }

    return pickupOrder;
  };

  getDeliveryOrderDetail = async (userId: string, role: Role, deliveryOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: {
        order: {
          include: {
            customer: true,
            outlet: true,
            address: true,
          },
        },
        driver: true,
      },
    });

    if (!deliveryOrder) {
      throw new ApiError("Delivery request not found", 404);
    }

    if (deliveryOrder.order && deliveryOrder.order.outletId !== driver.outletId) {
      throw new ApiError("Delivery request is not in your outlet", 403);
    }

    return deliveryOrder;
  };

  // =========================
  // Process Pickup
  // =========================

  acceptPickupRequest = async (userId: string, role: Role, pickupOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const existingPickup = await this.prisma.pickupOrder.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ["WAITING_FOR_PICKUP", "LAUNDRY_ON_THE_WAY"] },
      },
    });

    if (existingPickup) {
      throw new ApiError("Driver already has an active pickup", 400);
    }

    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: { order: true },
    });

    if (!pickupOrder) throw new ApiError("Pickup request not found", 404);
    if (pickupOrder.driverId) throw new ApiError("Pickup request already assigned", 400);
    if (!pickupOrder.order) throw new ApiError("Pickup request has no associated order", 400);
    if (pickupOrder.order.outletId !== driver.outletId)
      throw new ApiError("Pickup request is not in your outlet", 403);
    if (pickupOrder.status !== "WAITING_FOR_PICKUP")
      throw new ApiError("Pickup request is not in WAITING_FOR_PICKUP status", 400);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPickup = await tx.pickupOrder.update({
        where: { id: pickupOrder.id },
        data: {
          driverId: driver.id,
          status: "LAUNDRY_ON_THE_WAY",
        },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: pickupOrder.order!.id },
        data: {
          driverId: driver.driverId,
          status: "LAUNDRY_ON_THE_WAY",
        },
      });

      return updatedPickup;
    });

    return updated;
  };

  // =========================
  // COMPLETE PICKUP — ADD WORKER NOTIFICATION
  // =========================

  completePickupRequest = async (userId: string, role: Role, pickupOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: { order: true },
    });

    if (!pickupOrder) throw new ApiError("Pickup request not found", 404);
    if (pickupOrder.driverId !== driver.id)
      throw new ApiError("You are not assigned to this pickup", 403);
    if (!pickupOrder.order) throw new ApiError("Pickup request has no associated order", 400);
    if (pickupOrder.status !== "LAUNDRY_ON_THE_WAY")
      throw new ApiError("Pickup request is not in LAUNDRY_ON_THE_WAY status", 400);

    const updated = await this.prisma.$transaction(async (tx) => {
      // UPDATE PICKUP → ARRIVED_AT_OUTLET
      const updatedPickup = await tx.pickupOrder.update({
        where: { id: pickupOrder.id },
        data: { status: "ARRIVED_AT_OUTLET" },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: pickupOrder.order!.id },
        data: {
          status: "ARRIVED_AT_OUTLET",
          pickupTime: new Date(),
        },
      });

      // 🔥 NEW: Notify all WASHING workers at this outlet
      const washingWorkers = await tx.workerShift.findMany({
        where: {
          outletId: driver.outletId,
          station: "WASHING",
          endTime: null, // active shift worker
        },
      });

      for (const shift of washingWorkers) {
        await tx.workerNotification.create({
          data: {
            workerid: shift.workerId,
            notification: {
              create: {
                title: "Laundry Arrived",
                description: `Order ${pickupOrder.order!.id} has arrived and requires washing.`,
              },
            },
          },
        });
      }
      // 🔥 END NEW

      return updatedPickup;
    });

    return updated;
  };

  // =========================
  // Process Delivery
  // =========================

  acceptDeliveryRequest = async (userId: string, role: Role, deliveryOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { order: true },
    });

    if (!deliveryOrder) throw new ApiError("Delivery request not found", 404);
    if (deliveryOrder.driverId) throw new ApiError("Delivery request already assigned", 400);
    if (!deliveryOrder.order) throw new ApiError("Delivery request has no associated order", 400);
    if (deliveryOrder.order.outletId !== driver.outletId)
      throw new ApiError("Delivery request is not in your outlet", 403);
    if (deliveryOrder.status !== "READY_FOR_DELIVERY")
      throw new ApiError("Delivery request is not in READY_FOR_DELIVERY status", 400);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.deliveryOrder.update({
        where: { id: deliveryOrder.id },
        data: {
          driverId: driver.id,
          status: "DELIVERY_ON_THE_WAY",
        },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: deliveryOrder.order!.id },
        data: {
          driverId: driver.driverId,
          status: "DELIVERY_ON_THE_WAY",
        },
      });

      return updatedDelivery;
    });

    return updated;
  };

  completeDeliveryRequest = async (userId: string, role: Role, deliveryOrderId: string) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { order: true },
    });

    if (!deliveryOrder) throw new ApiError("Delivery request not found", 404);
    if (deliveryOrder.driverId !== driver.id)
      throw new ApiError("You are not assigned to this delivery request", 403);
    if (!deliveryOrder.order) throw new ApiError("Delivery request has no associated order", 400);
    if (deliveryOrder.status !== "DELIVERY_ON_THE_WAY")
      throw new ApiError("Delivery request is not in DELIVERY_ON_THE_WAY status", 400);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.deliveryOrder.update({
        where: { id: deliveryOrder.id },
        data: {
          status: "COMPLETED",
        },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: deliveryOrder.order!.id },
        data: {
          status: "COMPLETED",
          deliveryTime: new Date(),
        },
      });

      return updatedDelivery;
    });

    return updated;
  };
}
