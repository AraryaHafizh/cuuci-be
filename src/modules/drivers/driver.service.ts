import { Prisma } from "../../generated/prisma/client";
import { randomCodeGenerator } from "../../script/randomCodeGenerator";
import { ApiError } from "../../utils/api-error";
import { AttendanceService } from "../attendances/attendance.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { Drivers } from "./dto/drivers.dto";

export class DriverService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;
  private attendanceService: AttendanceService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
    this.attendanceService = new AttendanceService();
  }

  getDrivers = async (query: Drivers) => {
    const { id, outletId, page, startDate, endDate, limit } = query;
    const whereClause: Prisma.DriverWhereInput = {};

    if (id) whereClause.id = id;
    if (outletId) whereClause.outletId = outletId;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ApiError("Invalid date range", 400);
    }
    if (startDate || endDate) {
      whereClause.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const skip = (page - 1) * limit;
    const drivers = await this.prisma.driver.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });
    const total = await this.prisma.driver.count({
      where: whereClause,
    });
    const filtered = await Promise.all(
      drivers.map(async (driver) => {
        let outletName = "";
        const outlet = await this.outletService.getOutlet(driver.outletId!);
        outletName = outlet.data.name;

        return {
          ...driver,
          outletName,
          data: drivers,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      })
    );

    return { messae: "Drivers fetched suceessfully", data: filtered };
  };

  getDriver = async (driverId: string) => {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePictureUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!driver) throw new ApiError("Driver not found", 404);

    return {
      message: "Driver fetched successfully",
      data: driver,
    };
  };

  getRequests = async (driverId: string) => {
    const outlet = await this.prisma.driver.findFirst({
      where: { driverId },
    });

    const requests = await this.prisma.order.findMany({
      where: {
        status: { in: ["LOOKING_FOR_DRIVER", "READY_FOR_DELIVERY"] },
        outletId: outlet?.outletId,
      },
      include: { address: true, customer: true, outlet: true },
    });

    return {
      message: "Requests fetched successfully",
      data: requests,
    };
  };

  getRequestsHistory = async (driverId: string) => {
    const driver = await this.prisma.driver.findUnique({ where: { driverId } });
    const histories = await this.prisma.order.findMany({
      where: { driverId: driver!.id },
      include: {
        customer: { select: { name: true } },
        pickupOrders: true,
        deliveryOrders: true,
      },
    });

    return {
      message: "History fetched successfully",
      data: histories,
    };
  };

  getRequest = async (id: string) => {
    const request = await this.prisma.order.findUnique({
      where: { id },
      include: { address: true, customer: true, outlet: true },
    });

    return {
      message: "Request fetched successfully",
      data: request,
    };
  };

  getOngoingRequest = async (driverId: string) => {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });
    const request = await this.prisma.order.findFirst({
      where: {
        status: {
          in: [
            "WAITING_FOR_PICKUP",
            "LAUNDRY_ON_THE_WAY",
            "DELIVERY_ON_THE_WAY",
          ],
        },
        driverId: driver!.id,
      },
      include: { address: true, customer: true, outlet: true },
    });

    return {
      message: "driver ongoing request fetched successfully",
      data: request,
    };
  };

  takeOrder = async (driverId: string, orderId: string) => {
    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    if (!driver) throw new ApiError("Driver not found", 404);

    const isWorking = await this.attendanceService.getStatus(
      driver.driverId,
      "DRIVER"
    );

    if (!isWorking.isWorking) {
      throw new ApiError(
        "You are not checked in yet. Please check in to start working.",
        400
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findFirst({ where: { driverId } });
      if (!driver) throw new ApiError("Driver not found", 404);

      if (driver.currentPickupOrderId || driver.currentDeliveryOrderId) {
        throw new ApiError("You have an ongoing order", 409);
      }

      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          outletId: driver.outletId,
          status: { in: ["LOOKING_FOR_DRIVER", "READY_FOR_DELIVERY"] },
        },
      });

      if (!order) throw new ApiError("Order already taken or invalid", 409);

      if (order.status === "LOOKING_FOR_DRIVER") {
        const pickup = await tx.pickupOrder.findFirst({
          where: { orderId },
        });

        if (!pickup) {
          throw new ApiError("Pickup order not found", 404);
        }

        await tx.pickupOrder.update({
          where: { id: pickup.id },
          data: {
            status: "WAITING_FOR_PICKUP",
            driverId: driver.id,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "WAITING_FOR_PICKUP",
            driverId: driver.id,
          },
        });

        await tx.driver.update({
          where: { id: driver.id },
          data: { currentPickupOrderId: orderId },
        });

        return {
          message: "Pickup assigned. Head to customer location.",
        };
      }

      const delivery = await tx.deliveryOrder.create({
        data: {
          orderId,
          driverId: driver.id,
          deliveryNumber: randomCodeGenerator(),
          status: "DELIVERY_ON_THE_WAY",
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "DELIVERY_ON_THE_WAY",
          driverId: driver.id,
        },
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { currentDeliveryOrderId: delivery.id },
      });

      return {
        message: "Delivery assigned. Head to outlet location.",
      };
    });
  };

  confirmOrder = async (
    driverId: string,
    orderId: string,
    confirmationProof: Express.Multer.File
  ) => {
    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    const request = await this.prisma.pickupOrder.findFirst({
      where: { orderId },
    });

    if (!request) throw new ApiError("Request not found", 404);
    if (!driver) throw new ApiError("Driver not found", 404);
    if (request.driverId !== driver.id) {
      throw new ApiError("Not authorized", 403);
    }
    if (request.status !== "WAITING_FOR_PICKUP") {
      throw new ApiError("Invalid request", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(
      confirmationProof
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.pickupOrder.update({
        where: { id: request.id },
        data: {
          status: "LAUNDRY_ON_THE_WAY",
          pickupProofUrl: secure_url,
          pickupAt: new Date(),
        },
      });
      await tx.order.update({
        where: { id: request.orderId! },
        data: { status: "LAUNDRY_ON_THE_WAY", pickupTime: new Date() },
      });
    });

    return { message: "Package collected, Driver en route." };
  };

  finishOrder = async (driverId: string, orderId: string) => {
    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    if (!driver) throw new ApiError("Driver not found", 404);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (driver.outletId !== order.outletId) {
      throw new ApiError("Not authorized", 403);
    }

    if (order.status === "LAUNDRY_ON_THE_WAY") {
      const pickup = await this.prisma.pickupOrder.findFirst({
        where: { orderId },
        include: { order: true },
      });
      if (!pickup) throw new ApiError("Pickup order not found", 404);

      await this.prisma.$transaction(async (tx) => {
        await tx.pickupOrder.update({
          where: { id: pickup.id },
          data: { status: "ARRIVED_AT_OUTLET" },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: "ARRIVED_AT_OUTLET" },
        });

        await tx.driver.update({
          where: { id: driver.id },
          data: { currentPickupOrderId: null },
        });

        const notification = await tx.notification.create({
          data: {
            title: "Order arrived at outlet",
            description: `Order ${order.orderNumber} arrived at outlet`,
          },
        });

        await tx.adminNotification.create({
          data: {
            outletId: driver.outletId,
            notificationId: notification.id,
            isRead: false,
          },
        });
      });

      return { message: "Order successfully delivered to outlet." };
    }

    const delivery = await this.prisma.deliveryOrder.findFirst({
      where: { orderId },
      include: { order: true },
    });
    if (!delivery) throw new ApiError("Delivery order not found", 404);

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: { status: "COMPLETED" },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { currentDeliveryOrderId: null },
      });

      const notification = await tx.notification.create({
        data: {
          title: "Order arrived at customer",
          description: `Order ${order.orderNumber} has arrived and is completed.`,
        },
      });

      await tx.customerNotification.create({
        data: {
          userId: order.customerId,
          notificationId: notification.id,
          isRead: false,
        },
      });
    });

    return { message: "Order successfully delivered to customer." };
  };

  takeDelivery = async (orderId: string) => {
    const request = await this.prisma.deliveryOrder.findFirst({
      where: { orderId },
    });

    if (!request) throw new ApiError("Delivery request not found", 404);
    if (request.status !== "READY_FOR_DELIVERY") {
      throw new ApiError("Delivery already started", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id: request.id },
        data: { status: "DELIVERY_ON_THE_WAY" },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERY_ON_THE_WAY" },
      });
    });

    return { message: "Delivery started" };
  };

  finishDelivery = async (orderId: string) => {
    const request = await this.prisma.deliveryOrder.findFirst({
      where: { orderId },
    });

    if (!request) throw new ApiError("Delivery request not found", 404);
    if (request.status !== "DELIVERY_ON_THE_WAY") {
      throw new ApiError("Delivery already finished", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id: request.id },
        data: { status: "COMPLETED" },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          deliveryTime: new Date(),
        },
      });
    });

    return { message: "Order delivered to customer" };
  };
}
