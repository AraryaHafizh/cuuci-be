import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { drivers } from "./dto/drivers.dto";

export class DriverService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
  }

  getDrivers = async (query: drivers) => {
    const { id, outletId, name } = query;

    let where: any = { role: "DRIVER" };

    if (id) where.id = id;
    if (outletId) where.outletId = outletId;
    if (name) where.name = { contains: name, mode: "insensitive" };

    const drivers = await this.prisma.driver.findMany({ where });
    const filtered = await Promise.all(
      drivers.map(async (driver) => {
        let outletName = "";
        const outlet = await this.outletService.getOutlet(driver.outletId!);
        outletName = outlet.data.name;

        return {
          ...driver,
          outletName,
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

    const requests = await this.prisma.pickupOrder.findMany({
      where: { status: "WAITING_FOR_PICKUP", outletId: outlet?.outletId },
    });

    return {
      message: "Requests fetched successfully",
      data: requests,
    };
  };

  getRequestsHistory = async (driverId: string) => {
    // const histories
  };

  getRequest = async (orderId: string) => {
    const request = await this.prisma.pickupOrder.findFirst({
      where: { orderId },
      include: { order: true },
    });

    return {
      message: "Request fetched successfully",
      data: request,
    };
  };

  pickupRequest = async (driverId: string, orderId: string) => {
    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    const request = await this.prisma.pickupOrder.findFirst({
      where: { orderId },
    });

    if (!request) throw new ApiError("Request not found", 404);
    if (!driver) throw new ApiError("Driver not found", 404);
    if (driver.outletId !== request.outletId) {
      throw new ApiError("Not authorized", 403);
    }
    if (request.status !== "WAITING_FOR_PICKUP") {
      throw new ApiError("Request already picked up", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pickupOrder.update({
        where: { id: request.id },
        data: { status: "LAUNDRY_ON_THE_WAY" },
      });
      await tx.order.update({
        where: { id: request.orderId! },
        data: { status: "LAUNDRY_ON_THE_WAY" },
      });
    });

    return { message: "Request picked up successfully" };
  };

  finishRequest = async (driverId: string, orderId: string) => {
    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    const request = await this.prisma.pickupOrder.findFirst({
      where: { orderId },
    });

    if (!request) throw new ApiError("Request not found", 404);
    if (!driver) throw new ApiError("Driver not found", 404);
    if (driver.outletId !== request.outletId) {
      throw new ApiError("Not authorized", 403);
    }
    if (request.status !== "LAUNDRY_ON_THE_WAY") {
      throw new ApiError("Request already finished", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pickupOrder.update({
        where: { id: request.id },
        data: { status: "ARRIVED_AT_OUTLET" },
      });
      await tx.order.update({
        where: { id: request.orderId! },
        data: { status: "ARRIVED_AT_OUTLET" },
      });
    });

    return { message: "Order successfully delivered to outlet" };
  };

  pickupDelivery = async (orderId: string) => {
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
