import { OrderStatus, Prisma, Role } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { GetOrdersDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (
    authUserId: string,
    role: Role,
    status: OrderStatus,
    query: GetOrdersDTO
  ) => {
    const { page, search, limit } = query;
    const whereClause: Prisma.OrderWhereInput = {};
    if (role !== "SUPER_ADMIN") {
      whereClause.customerId = authUserId;
    }
    // if CUSTOMER
    // if DRIVER
    // if WORKER 
    // if OUTLET_ADMIN 
    if (search) {
      whereClause.outlet = { name: { contains: search, mode: "insensitive" } };
    }
    if (status) {
      whereClause.status = status;
    }
    const skip = (page - 1) * limit;
    const orders = await this.prisma.order.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await this.prisma.order.count({
      where: whereClause,
    });

    return {
      message: "Order fetched successfully",
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
