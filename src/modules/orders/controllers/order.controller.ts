import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUserDataDTO } from "../dto/auth-user-data.dto";
import { GetOrdersDTO } from "../dto/get-order.dto";
import { OrderService } from "../services/order.service";

export class OrderController {
  private prisma: PrismaService;
  private orderService: OrderService;

  constructor() {
    this.prisma = new PrismaService();
    this.orderService = new OrderService();
  }

  getOrders = async (req: Request, res: Response) => {
    const userData = plainToInstance(AuthUserDataDTO, res.locals.user);
    const query = plainToInstance(GetOrdersDTO, req.query);
    const result = await this.orderService.getOrders(userData, query);
    res.status(200).send(result);
  };

  getOrderDetail = async (req: Request, res: Response) => {
    const userData = plainToInstance(AuthUserDataDTO, res.locals.user);
  };

  confirmOrder = async () => {}
  updateOrderStatus = async () => {}
  createDeliveryRequest = async () => {}
}
