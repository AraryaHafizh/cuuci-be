import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { GetOrderDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (
    authUserId: string,
    body: GetOrderDTO, // perlu dto kah?
    // orderId?
    // status?
    // outletId?
    // decode token kemudian di cek id nya sama apa engga
    // bisa juga sekalian memfilter order apa yang bisa diakses berdasarkan payload token
    page = 1,
    limit = 10,
    search?: string
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
      include: { outletAdmin: true },
    });

    if (!user) {
      throw new ApiError("User not found", 404)
    }
  };

  getOrderDetails = async () => {};

  updateOrderStatus = async () => {};

  createDeliveryRequest = async () => {};

  confirmOrder = async () => {};

  //====== CRON =====
  
  autoConfirmOrder = async () => {};
  autoDeleteUnverifiedUser = async () => {};
  autoCancelUnpaidOrders = async () => {};
  autoConfirmDeliveredOrders = async () => {};

}
