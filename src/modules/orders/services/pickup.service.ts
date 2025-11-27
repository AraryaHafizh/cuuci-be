import { randomCodeGenerator } from "../../../script/randomCodeGenerator";
import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { DriverPickupDTO } from "../dto/driver-pickup.dto";
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
      return new ApiError("user not found", 404);
    }
    if (!user.addresses || user.addresses.length === 0) {
      return new ApiError("User has no addresses", 400);
    }
    const selectedAddress = user.addresses.find((a) => a.id === body.addressId);
    if (!selectedAddress) return new ApiError("Address not found", 404);
    if (selectedAddress.latitude === null || selectedAddress.longitude === null) {
      return new ApiError("Address does not have valid coordinates", 400);
    }
  };

  driverTakePickup = async (driverId: string, body: DriverPickupDTO) => {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
    });
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { id: body.pickupOrderId, status: "WAITING_FOR_PICKUP"},
    });

    if (!driver) throw new ApiError("driver not found", 404);

    if (driver.currentPickupOrderId) {
      throw new ApiError("Driver is already handling another pickup", 400);
    }

    await this.prisma.$transaction(async (tx) => {
      const driverUpdate = await tx.driver.update({
        where: { id: driverId },
        data: { currentPickupOrderId: body.pickupOrderId },
      });

      const statusChange = await tx.pickupOrder.update({
        where: { id: body.pickupOrderId },
        data: { status: "LAUNDRY_ON_THE_WAY" },
      });
    });

    return { message: "Pickup assigned to driver" };
  };

  driverCompletePickup = async () => {};

  adminChangeStatus = async () => {};
}
