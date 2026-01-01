import { randomCodeGenerator } from "../../../script/randomCodeGenerator";
import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { PickupOrderDTO } from "../dto/pickup-order.dto";

export class PickupService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createPickupOrder = async (authUserId: string, body: PickupOrderDTO) => {
    const { addressId, outletId, notes, pickupTime } = body;

    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });
    if (!user) throw new ApiError("user not found", 404);

    const pickupNumber = randomCodeGenerator(12);
    const orderNumber = randomCodeGenerator(12);

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: authUserId,
          addressId,
          outletId,
          pickupTime,
          orderNumber,
          status: "WAITING_FOR_PICKUP",
        },
      });
      await tx.pickupOrder.create({
        data: {
          customerId: authUserId,
          addressId,
          outletId,
          orderId: order.id,
          pickupNumber,
          status: "WAITING_FOR_PICKUP",
        },
      });
      const drivers = await tx.driver.findMany({ where: { outletId } });
      if (!drivers) throw new ApiError("No drivers available", 400);

      const notification = await tx.notification.create({
        data: {
          title: "New Pickup Order",
          description: `Order ${order.orderNumber} waiting for pickup`,
        },
      });

      await tx.driverNotification.createMany({
        data: drivers.map((driver) => ({
          userId: driver.driverId,
          notificationId: notification.id,
          isRead: false,
        })),
      });
    });

    return { message: "Create pickup order success!" };
  };
}
