import { OrderStatus, Prisma } from "../../../generated/prisma/client";
import { AuthUserData } from "../../../types/auth-user-data";
import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { GetOrdersDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (
    userData: AuthUserData,
    status: OrderStatus,
    query: GetOrdersDTO,
    body: any
  ) => {
    const { page, search, limit } = query;
    const { authUserId, role } = userData;
    const { isHistory, outletId } = body;
    const whereClause: Prisma.OrderWhereInput = {};
    const includeClause: Prisma.OrderInclude = {};

    switch (role) {
      case "CUSTOMER":
        whereClause.customerId = authUserId;
        if (isHistory) {
          whereClause.status = "COMPLETED";
        }
        break;

      case "DRIVER":
        whereClause.driverId = authUserId;
        if (isHistory) {
          whereClause.status = "COMPLETED";
        }
        break;

      case "WORKER":
        includeClause.orderWorkProcesses = true;
        whereClause.outletId = outletId;
        if (isHistory) {
          whereClause.status = "COMPLETED";
        }
        break;

      case "OUTLET_ADMIN":
        whereClause.outletId = outletId;
        break;

      case "SUPER_ADMIN":
        includeClause.customer = true;
        includeClause.address = true;
        includeClause.outlet = true;
        includeClause.payment = true;
        break;
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
      message: "Orders fetched successfully",
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getOrderDetail = async (userData: AuthUserData, orderId: string) => {
    const { authUserId, outletId, role } = userData;
    const whereClause: Prisma.OrderWhereInput = {};
    const includeClause: Prisma.OrderInclude = {};

    whereClause.id = orderId;
    switch (role) {
      case "CUSTOMER":
        whereClause.customerId = authUserId;
        includeClause.orderWorkProcesses = true;
        includeClause.payment = true;
        break;

      case "DRIVER":
        whereClause.driverId = authUserId;
        includeClause.address = true;
        includeClause.pickupOrders = true;
        includeClause.deliveryOrders = true;
        break;

      case "OUTLET_ADMIN":
        whereClause.outletId = outletId;
        includeClause.address = true;
        includeClause.orderItems = true;
        includeClause.payment = true;
        break;

      case "WORKER":
        whereClause.outletId = outletId;
        includeClause.orderItems = true;
        includeClause.orderWorkProcesses = true;
        break;

      case "SUPER_ADMIN":
        includeClause.outlet = true;
        includeClause.customer = true;
        includeClause.orderItems = true;
        includeClause.payment = true;
        break;

      default:
        throw new ApiError("Unauthorized", 401);
    }

    const order = await this.prisma.order.findFirst({
      where: whereClause,
      include: includeClause,
    });
    if (!order) {
      throw new ApiError("Order not found", 404);
    }

    return {
      message: "Order fetched successfully",
      data: order,
    };
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
