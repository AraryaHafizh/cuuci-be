import { PrismaService } from "../../prisma/prisma.service";
import { GetOrderDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (
    costumerId: string,
    authUserId: string,
    body: GetOrderDTO,
    page = 1,
    limit = 10,
    search?: string
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id: costumerId },
      include: { outletAdmin: true },
    });
  };

  getOrderDetails = async () => {};

  updateOrderStatus = async () => {};

  createDeliveryRequest = async () => {};

  confirmOrder = async () => {};

  autoConfirmOrder = async () => {};

  // maybe cron automation??
  // autoCancelUnpaidOrders
  // autoConfirmDeliveredOrders
}
