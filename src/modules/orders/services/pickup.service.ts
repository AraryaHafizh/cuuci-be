import { OrderStatus } from "../../../generated/prisma/enums";
import { randomCodeGenerator } from "../../../script/randomCodeGenerator";
import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { DriverPickupDTO } from "../dto/driver-pickup.dto";
import { PickupRequestDTO } from "../dto/pickup-request.dto";

export class PickupService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createPickupRequest = async (authUserId: string, body: PickupRequestDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
      include: { addresses: true },
    });

    if (!user) {
      return new ApiError("user not found", 404);
    }

    if (!user.addresses || user.addresses.length === 0) {
      throw new ApiError("User has no addresses", 400);
    }
    const selectedAddress = user.addresses.find((a) => a.id === body.address);
    if (!selectedAddress) throw new ApiError("Address not found", 404);

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); //2 jam
    const pickupNumber = randomCodeGenerator();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. create data pickupOrder
      const pickupOrder = await tx.pickupOrder.create({
        data: {
          id: authUserId,
          pickupNumber,
          status: "WAITING_FOR_PICKUP",
          //   expiresAt,
        },
      });

      // 2. create data order detail
      //   const orderDetails = payload.map((item) => {
      //     const ticket = tickets.find((ticket) => ticket.id === item.ticketId)!;

      //     return {
      //       pickupOrderId: pickupOrder.id,
      //       apalagi??
      //     };
      //   });

      //   await tx.transactionDetail.createMany({
      //     data: transactionDetails,
      //   });

      //   return transaction;
    });
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
