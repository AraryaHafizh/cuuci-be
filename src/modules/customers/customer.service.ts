import { Prisma } from "../../generated/prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { Customers } from "./dto/customer.dto";
import { History } from "./dto/history.dto";
import { buildOrderLog } from "./helper";

export class CustomerService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getCustomers = async (query: Customers) => {
    const { id, name, page, search, startDate, endDate, limit } = query;
    const whereClause: Prisma.UserWhereInput = {};

    let where: any = { role: "CUSTOMER" };

    if (id) where.id = id;
    if (name) where.name = { contains: name, mode: "insensitive" };
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
      whereClause.email = {
        contains: search,
        mode: "insensitive",
      };
    }

    const skip = (page - 1) * limit;

    const customers = await this.prisma.user.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });
    const total = await this.prisma.user.count({
      where: whereClause,
    });
    const data = customers.map(({ password, ...rest }) => rest);

    return {
      message: "Customers fetched suceessfully",
      data: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getCustomer = async (customerId: string) => {
    const driver = await this.prisma.user.findFirst({
      where: { id: customerId },
    });

    if (!driver) throw new ApiError("Driver not found", 404);
    const { password, ...rest } = driver;

    return {
      message: "Driver fetched successfully",
      data: rest,
    };
  };

  getOrders = async (customerId: string) => {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new ApiError("Customer not found", 404);
    const orders = await this.prisma.order.findMany({
      where: {
        customerId,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "User activity fetched successfully",
      data: orders,
    };
  };

  getOrder = async (customerId: string, orderId: string) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        payment: true,
        outlet: {
          include: { admin: { select: { name: true, phoneNumber: true } } },
        },
        customer: {
          select: { name: true, phoneNumber: true },
        },
        orderItems: {
          select: {
            laundryItem: { select: { name: true } },
            quantity: true,
          },
        },
        orderWorkProcesses: {
          include: {
            worker: {
              select: {
                worker: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
        deliveryOrders: {
          include: {
            driver: {
              select: {
                driver: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
        pickupOrders: {
          select: {
            pickupNumber: true,
            pickupAt: true,
            pickupProofUrl: true,
            updatedAt: true,
            driver: {
              select: {
                driver: { select: { name: true, phoneNumber: true } },
              },
            },
          },
        },
      },
    });

    if (order?.customerId !== customerId)
      throw new ApiError("Unauthorized", 401);

    const orderLog = buildOrderLog(order);

    return {
      message: "Order detail fetched successfully",
      data: {
        ...order,
        orderLog,
        pickupOrders: undefined,
        deliveryOrders: undefined,
        orderWorkProcesses: undefined,
      },
    };
  };

  getOrderHistory = async (customerId: string, query: History) => {
    const { id, startDate, endDate, status, active } = query;

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new ApiError("Customer not found", 404);

    const where: any = { customerId };

    if (id) where.id = id;
    if (status) where.status = status;
    if (active) {
      where.status = { notIn: ["CANCELLED", "COMPLETED"] };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      message: "Order history fetched successfully",
      data: orders,
    };
  };

  getActiveOrders = async (customerId: string) => {
    const orders = await this.getOrderHistory(customerId, { active: true });

    return {
      message: "User active orders fetched successfully",
      data: orders,
    };
  };

  getRecentOrders = async (customerId: string) => {
    const orders = await this.getOrderHistory(customerId, {
      endDate: new Date(),
    });

    return {
      message: "User recent orders fetched successfully",
      data: orders,
    };
  };

  requestPickup = async (customerId: string, data: any) => {};
}
