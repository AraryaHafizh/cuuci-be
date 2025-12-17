import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { customers } from "./dto/customer.dto";
import { History } from "./dto/history.dto";

export class CustomerService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getCustomers = async (query: customers) => {
    const { id, name } = query;

    let where: any = { role: "CUSTOMER" };

    if (id) where.id = id;
    if (name) where.name = { contains: name, mode: "insensitive" };

    const customers = await this.prisma.user.findMany({ where });
    const data = customers.map(({ password, ...rest }) => rest);

    return { messae: "Customers fetched suceessfully", data: data };
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
