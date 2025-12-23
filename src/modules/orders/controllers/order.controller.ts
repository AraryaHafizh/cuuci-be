import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUserDataDTO } from "../dto/auth-user-data.dto";
import { GetOrdersDTO } from "../dto/get-order.dto";
import { OrderService } from "../services/order.service";
import { Role } from "../../../generated/prisma/enums";

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
    const orderId = req.params.orderId;
    const result = await this.orderService.getOrderDetail(userData, orderId);
    res.status(200).send(result);
  };

  confirmOrder = async (req: Request, res: Response) => {
    const role = res.locals.user.role as Role;
    const outletId = res.locals.user.outletId;
    const orderId = req.params.orderId;
    const result = await this.orderService.confirmOrder(role , orderId, outletId);
    res.status(200).send(result);
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    const authUserId = String(res.locals.user.id);
    const orderId = req.params.orderId;
    const body = req.body;
    const result = await this.orderService.updateOrderStatus(
      authUserId,
      orderId,
      body
    );
    res.status(200).send(result);
  };

  createDeliveryRequest = async (req: Request, res: Response) => {
    const authUserId = String(res.locals.user.id);
    const orderId = req.params.orderId;
    const result = await this.orderService.createDeliveryRequest(authUserId, orderId);
    res.status(200).send(result);
  };
}
