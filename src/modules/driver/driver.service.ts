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
      throw new ApiError(
        "Only drivers are allowed to access this resource",
        403
      );
    }
  };

 
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


  private async assertNoActiveJob(driverId: string) {
    const activePickup = await this.prisma.pickupOrder.findFirst({
      where: {
        driverId,
        status: { in: ["WAITING_FOR_PICKUP", "LAUNDRY_ON_THE_WAY"] },
      },
    });

    const activeDelivery = await this.prisma.deliveryOrder.findFirst({
      where: {
        driverId,
        status: { in: ["READY_FOR_DELIVERY", "DELIVERY_ON_THE_WAY"] },
      },
    });

    if (activePickup || activeDelivery) {
      throw new ApiError("Driver already has an active job", 400);
    }
  }


  private async notifyDriverForRequests(
    driverId: string,
    pickupCount: number,
    deliveryCount: number
  ) {
    if (pickupCount === 0 && deliveryCount === 0) return;

    const notification = await this.prisma.notification.create({
      data: {
        title: "New pickup/delivery requests",
        description: `You have ${pickupCount} pickup and ${deliveryCount} delivery requests available.`,
      },
    });

    await this.prisma.driverNotification.create({
      data: {
        driverId,
        notificationId: notification.id,
      },
    });
  }

 
  autoCheckoutExpiredDriverSessions = async () => {
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeDrivers = await this.prisma.driver.findMany({
      where: {
        endTime: null,
        startTime: { gte: startOfToday },
      },
      select: {
        id: true,
        startTime: true,
      },
    });

    const updates = [];

    for (const driver of activeDrivers) {
      const scheduledEnd = new Date(driver.startTime);
      const hour = scheduledEnd.getHours();

      if (hour < 12) {
       
        scheduledEnd.setHours(12, 0, 0, 0);
      } else {
      
        scheduledEnd.setHours(23, 59, 59, 999);
      }

      if (now >= scheduledEnd) {
        updates.push(
          this.prisma.driver.update({
            where: { id: driver.id },
            data: { endTime: scheduledEnd },
          })
        );
      }
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    return {
      message: "Expired driver sessions auto-checked-out",
      count: updates.length,
    };
  };

  getRequestsForDriver = async (
    userId: string,
    role: Role,
    page = 1,
    limit = 10
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const skip = (page - 1) * limit;

    const pickupWhere = {
      status: "WAITING_FOR_PICKUP" as const,
      driverId: null,
      order: {
        outletId: driver.outletId,
      },
    };

    const deliveryWhere = {
      status: "READY_FOR_DELIVERY" as const,
      driverId: null,
      order: {
        outletId: driver.outletId,
      },
    };

    const pickupRequests = await this.prisma.pickupOrder.findMany({
      where: pickupWhere,
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
      skip,
      take: limit,
    });

    const deliveryRequests = await this.prisma.deliveryOrder.findMany({
      where: deliveryWhere,
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
      skip,
      take: limit,
    });

    const [pickupTotal, deliveryTotal] = await this.prisma.$transaction([
      this.prisma.pickupOrder.count({ where: pickupWhere }),
      this.prisma.deliveryOrder.count({ where: deliveryWhere }),
    ]);

   
    await this.notifyDriverForRequests(
      driver.id,
      pickupRequests.length,
      deliveryRequests.length
    );

    return {
      driver: {
        id: driver.id,
        outletId: driver.outletId,
      },
      pickupRequests,
      deliveryRequests,
      pickupPagination: {
        total: pickupTotal,
        page,
        limit,
        totalPages: Math.ceil(pickupTotal / limit),
        hasNext: page * limit < pickupTotal,
      },
      deliveryPagination: {
        total: deliveryTotal,
        page,
        limit,
        totalPages: Math.ceil(deliveryTotal / limit),
        hasNext: page * limit < deliveryTotal,
      },
    };
  };

  getPickupOrderDetail = async (
    userId: string,
    role: Role,
    pickupOrderId: string
  ) => {
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

  getDeliveryOrderDetail = async (
    userId: string,
    role: Role,
    deliveryOrderId: string
  ) => {
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

  acceptPickupRequest = async (
    userId: string,
    role: Role,
    pickupOrderId: string
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

   
    await this.ensureActiveAttendance(userId);

  
    await this.assertNoActiveJob(driver.id);

    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: { order: true },
    });

    if (!pickupOrder) throw new ApiError("Pickup request not found", 404);
    if (pickupOrder.driverId)
      throw new ApiError("Pickup request already assigned", 400);
    if (!pickupOrder.order)
      throw new ApiError("Pickup request has no associated order", 400);
    if (pickupOrder.order.outletId !== driver.outletId)
      throw new ApiError("Pickup request is not in your outlet", 403);
    if (pickupOrder.status !== "WAITING_FOR_PICKUP")
      throw new ApiError(
        "Pickup request is not in WAITING_FOR_PICKUP status",
        400
      );

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

  completePickupRequest = async (
    userId: string,
    role: Role,
    pickupOrderId: string
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

   
    await this.ensureActiveAttendance(userId);

    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { id: pickupOrderId },
      include: { order: true },
    });

    if (!pickupOrder) throw new ApiError("Pickup request not found", 404);
    if (pickupOrder.driverId !== driver.id)
      throw new ApiError("You are not assigned to this pickup", 403);
    if (!pickupOrder.order)
      throw new ApiError("Pickup request has no associated order", 400);
    if (pickupOrder.status !== "LAUNDRY_ON_THE_WAY")
      throw new ApiError(
        "Pickup request is not in LAUNDRY_ON_THE_WAY status",
        400
      );

    const updated = await this.prisma.$transaction(async (tx) => {
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

      const washingWorkers = await tx.worker.findMany({
        where: {
          outletId: driver.outletId,
          station: "WASHING",
          endTime: null,
        },
      });

      for (const shift of washingWorkers) {
        await tx.workerNotification.create({
          data: {
            workerId: shift.workerId,
            notification: {
              create: {
                title: "Laundry Arrived",
                description: `Order ${pickupOrder.order!.id} has arrived and requires washing.`,
              },
            },
          },
        });
      }

      return updatedPickup;
    });

    return updated;
  };

  acceptDeliveryRequest = async (
    userId: string,
    role: Role,
    deliveryOrderId: string
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    // NEW: must have active attendance
    await this.ensureActiveAttendance(userId);

    // NEW: must not have any active job
    await this.assertNoActiveJob(driver.id);

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { order: true },
    });

    if (!deliveryOrder) throw new ApiError("Delivery request not found", 404);
    if (deliveryOrder.driverId)
      throw new ApiError("Delivery request already assigned", 400);
    if (!deliveryOrder.order)
      throw new ApiError("Delivery request has no associated order", 400);
    if (deliveryOrder.order.outletId !== driver.outletId)
      throw new ApiError("Delivery request is not in your outlet", 403);
    if (deliveryOrder.status !== "READY_FOR_DELIVERY")
      throw new ApiError(
        "Delivery request is not in READY_FOR_DELIVERY status",
        400
      );

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

  completeDeliveryRequest = async (
    userId: string,
    role: Role,
    deliveryOrderId: string
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    // NEW: enforce attendance on completion too
    await this.ensureActiveAttendance(userId);

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { order: true },
    });

    if (!deliveryOrder) throw new ApiError("Delivery request not found", 404);
    if (deliveryOrder.driverId !== driver.id)
      throw new ApiError(
        "You are not assigned to this delivery request",
        403
      );
    if (!deliveryOrder.order)
      throw new ApiError("Delivery request has no associated order", 400);
    if (deliveryOrder.status !== "DELIVERY_ON_THE_WAY")
      throw new ApiError(
        "Delivery request is not in DELIVERY_ON_THE_WAY status",
        400
      );

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

  // NEW: driver pickup & delivery history
  getHistory = async (
    userId: string,
    role: Role,
    page = 1,
    limit = 10
  ) => {
    this.assertDriverRole(role);
    const driver = await this.getActiveDriverByUserId(userId);

    const skip = (page - 1) * limit;

    const pickupWhere = {
      driverId: driver.id,
      status: "ARRIVED_AT_OUTLET" as const,
    };

    const deliveryWhere = {
      driverId: driver.id,
      status: "COMPLETED" as const,
    };

    const [
      pickupHistory,
      pickupTotal,
      deliveryHistory,
      deliveryTotal,
    ] = await this.prisma.$transaction([
      this.prisma.pickupOrder.findMany({
        where: pickupWhere,
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
        skip,
        take: limit,
      }),
      this.prisma.pickupOrder.count({ where: pickupWhere }),
      this.prisma.deliveryOrder.findMany({
        where: deliveryWhere,
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
        skip,
        take: limit,
      }),
      this.prisma.deliveryOrder.count({ where: deliveryWhere }),
    ]);

    return {
      driver: {
        id: driver.id,
        outletId: driver.outletId,
      },
      pickupHistory,
      deliveryHistory,
      pickupPagination: {
        total: pickupTotal,
        page,
        limit,
        totalPages: Math.ceil(pickupTotal / limit),
        hasNext: page * limit < pickupTotal,
      },
      deliveryPagination: {
        total: deliveryTotal,
        page,
        limit,
        totalPages: Math.ceil(deliveryTotal / limit),
        hasNext: page * limit < deliveryTotal,
      },
    };
  };
}
