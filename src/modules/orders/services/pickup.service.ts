import { Outlet } from "../../../generated/prisma/client";
import { getDistance } from "../../../script/getHaversineDistance";
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
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
      include: { addresses: true },
    });
    if (!user) {
      throw new ApiError("user not found", 404);
    }
    if (!user.addresses || user.addresses.length === 0) {
      throw new ApiError("User has no addresses", 400);
    }
    const selectedAddress = user.addresses.find((a) => a.id === body.addressId);
    if (!selectedAddress) throw new ApiError("Address not found", 404);
    if (
      selectedAddress.latitude === null ||
      selectedAddress.longitude === null
    ) {
      throw new ApiError("Address does not have valid coordinates", 400);
    }

    let outlets = await this.prisma.outlet.findMany();

    if (!outlets) {
      throw new ApiError("No outlets available", 400);
    }
    let shortestDistance: number = Infinity;
    let nearestOutlet: Outlet | null = null;

    for (const outlet of outlets) {
      if (!outlet.latitude || !outlet.longitude) continue;

      const distance: number = Number(
        getDistance(
          Number(selectedAddress.latitude),
          Number(selectedAddress.longitude),
          Number(outlet.latitude),
          Number(outlet.longitude)
        )
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestOutlet = outlet;
      }
    }
    if (!nearestOutlet) throw new ApiError("No valid outlet found", 400);

    const pickupNumber = randomCodeGenerator(12);

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: authUserId,
          addressId: selectedAddress.id,
          outletId: nearestOutlet.id,
          pickupTime: body.pickupTime,
          status: "WAITING_FOR_PICKUP",
        },
      });
      await tx.pickupOrder.create({
        data: {
          customerId: authUserId,
          addressId: selectedAddress.id,
          outletId: nearestOutlet.id,
          orderId: order.id,
          pickupNumber,
          status: "WAITING_FOR_PICKUP",
        },
      });
      const drivers = await tx.driver.findMany({
        where: { outletId: nearestOutlet.id },
      });
      if (!drivers) {
        throw new ApiError("No drivers available", 400);
      }
      await tx.driverNotification.createMany({
        data: drivers.map((driver) => ({
          driverId: driver.id,
          notificationId: order.id,
          isread: false,
        })),
      });
    });

    return { message: "Create pickup order success!" };
  };
}
