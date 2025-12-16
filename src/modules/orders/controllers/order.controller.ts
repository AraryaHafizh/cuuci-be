import { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { plainToInstance } from "class-transformer";
import { GetOrdersDTO } from "../dto/get-order.dto";
import { OrderService } from "../services/order.service";
import { OrderStatus, Role } from "../../../generated/prisma/enums";

export class OrderController {
  private prisma: PrismaService;
  private orderService: OrderService;

  constructor() {
    this.prisma = new PrismaService();
    this.orderService = new OrderService();
  }

  getOrders = async (req: Request, res: Response) => {
    const userData = res.locals.user;
    const body = String(res.locals.order)
    const orderStatus = req.query.status as OrderStatus;
    const query = plainToInstance(GetOrdersDTO, req.query);
    const result = await this.orderService.getOrders(
      userData,
      orderStatus,
      query,
      body
    );
    res.status(200).send(result);
  };
}
