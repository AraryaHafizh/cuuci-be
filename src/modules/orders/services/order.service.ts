import { OrderStatus, Prisma, Role } from "../../../generated/prisma/client";
import { ApiError } from "../../../utils/api-error";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { GetOrdersDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (
    userData: any,
    status: OrderStatus,
    query: GetOrdersDTO,
    body: any
  ) => {
    const { page, search, limit } = query;
    const { authUserId, role } = userData;
    const { isHistory, outletId } = body;
    const whereClause: Prisma.OrderWhereInput = {};
    const includeClause: Prisma.OrderInclude = {};
    if (role === "CUSTOMER") {
      whereClause.customerId = authUserId;
      if (isHistory) {
        whereClause.status = "COMPLETED";
      }
    }
    if (role === "DRIVER") {
      whereClause.driverId = authUserId;
      if (isHistory) {
        whereClause.status = "COMPLETED";
      }
    }
    if (role === "WORKER") {
      includeClause.orderWorkProcesses = true;
      if (isHistory) {
        whereClause.status = "COMPLETED";
      }
    }
    if (role === "OUTLET_ADMIN") {
      whereClause.outletId = outletId;
    }
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
      include: includeClause,
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

  getOrderDetails = async (
    userData: any,
    orderId: string,
    query: GetOrdersDTO
  ) => {
    const { page, search, limit } = query;
    const { authUserId, outletId, role } = userData;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        outlet: true,
        address: true,
        orderItems: true,
        pickupOrders: true,
        deliveryOrders: true,
        payment: true,
        orderWorkProcesses: true
      },
    });

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // unauthorized if?

    if (role === "COSTUMER") {
      
    }
  };

  updateOrderStatus = async () => {};

  createDeliveryRequest = async () => {};

  confirmOrder = async () => {};

  //====== CRON =====
  autoConfirmOrder = async () => {};
  autoDeleteUnverifiedUser = async () => {};
  autoCancelUnpaidOrders = async () => {};
  autoConfirmDeliveredOrders = async () => {};
}
