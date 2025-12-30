import { OrderStatus, Prisma, Role } from "../../../generated/prisma/client";
import { ApiError } from "../../../utils/api-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUserDataDTO } from "../dto/auth-user-data.dto";
import { GetOrdersDTO } from "../dto/get-order.dto";

export class OrderService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOrders = async (userData: AuthUserDataDTO, query: GetOrdersDTO) => {
    const { page, search, startDate, endDate, limit, isHistory } = query;
    const { authUserId, role, outletId } = userData;
    const whereClause: Prisma.OrderWhereInput = {};
    const includeClause: Prisma.OrderInclude = {};

    switch (role) {
      case "CUSTOMER":
        whereClause.customerId = authUserId;
        includeClause.payment = true;
        includeClause.orderWorkProcesses = true;
        if (isHistory) {
          whereClause.status = { in: ["COMPLETED", "CANCELLED"] };
        } else {
          whereClause.status = { notIn: ["COMPLETED", "CANCELLED"] };
        }
        break;

      case "DRIVER":
        whereClause.outletId = outletId;
        if (!outletId) {
          throw new ApiError("Driver must be assigned to an outlet", 400);
        }
        whereClause.status = {
          in: [
            "WAITING_FOR_PICKUP",
            "LAUNDRY_ON_THE_WAY",
            "DELIVERY_ON_THE_WAY",
          ],
        };
        whereClause.OR = [
          { pickupOrders: { some: { driverId: authUserId } } },
          { deliveryOrders: { some: { driverId: authUserId } } },
        ];
        includeClause.pickupOrders = true;
        includeClause.deliveryOrders = true;
        break;

      case "WORKER":
        whereClause.outletId = outletId;
        if (!outletId) {
          throw new ApiError("Worker must be assigned to an outlet", 400);
        }
        includeClause.orderWorkProcesses = true;
        whereClause.orderWorkProcesses = { some: { workerId: authUserId } };
        break;

      case "OUTLET_ADMIN":
        whereClause.outletId = outletId;
        if (!outletId) {
          throw new ApiError("Worker must be assigned to an outlet", 400);
        }
        includeClause.payment = true;
        includeClause.orderWorkProcesses = true;
        includeClause.customer = true;
        break;

      case "SUPER_ADMIN":
        includeClause.customer = true;
        includeClause.address = true;
        includeClause.outlet = true;
        includeClause.payment = true;
        break;

      default:
        throw new ApiError("Unauthorized", 403);
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ApiError("Invalid date range", 400);
    }
    if (startDate || endDate) {
      whereClause.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    if (search) {
      whereClause.orderNumber = {
        contains: search,
        mode: "insensitive",
      };
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

  getOrderDetail = async (userData: AuthUserDataDTO, orderId: string) => {
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
        whereClause.OR = [
          { pickupOrders: { some: { driverId: authUserId } } },
          { deliveryOrders: { some: { driverId: authUserId } } },
        ];
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
        throw new ApiError("Unauthorized", 403);
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

  confirmOrder = async (role: Role, orderId: string, outletId: string) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: true, outlet: true, payment: true },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (role !== "OUTLET_ADMIN") {
      throw new ApiError("Only outlet admin can confirm order arrival", 403);
    }
    if (order.outletId !== outletId) {
      throw new ApiError("This order does not belong to your outlet", 403);
    }
    if (order.status !== "LAUNDRY_ON_THE_WAY") {
      throw new ApiError(
        `Cannot confirm order. Current status: ${order.status}`,
        400
      );
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ARRIVED_AT_OUTLET",
      },
    });

    return {
      message: "Order has arrive",
      data: result,
    };
  };

  submitOrder = async () => {
    // order item
    // cust info & driver info
    // masukin price & weight
  };

  updateOrderStatus = async (
    authUserId: string,
    orderId: string,
    body: { status: OrderStatus }
  ) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderWorkProcesses: true, outlet: true },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.outlet.adminId !== authUserId) {
      throw new ApiError("Forbidden: You are not the outlet admin", 403);
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: body.status,
        updatedAt: new Date(),
      },
    });

    return {
      message: `Order status updated to ${body.status}`,
      data: result,
    };
  };

  createDeliveryRequest = async (authUserId: string, orderId: string) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, status: "PACKING" },
      include: { driver: true, outlet: true, payment: true },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.outlet.adminId !== authUserId) {
      throw new ApiError("Forbidden: You are not the outlet admin", 403);
    }
    if (!order.payment || order.payment.status !== "SUCCESS") {
      throw new ApiError("Order must be paid before delivery", 400);
    }

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_DELIVERY",
      },
    });

    return {
      message: "Order is ready to be delivered",
      data: result,
    };
  };
}
