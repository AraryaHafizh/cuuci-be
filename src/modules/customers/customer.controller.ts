import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { CustomerService } from "./customer.service";
import { customers } from "./dto/customer.dto";
import { History } from "./dto/history.dto";

export class CustomerContorller {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  getCustomers = async (req: Request, res: Response) => {
    const query = plainToInstance(customers, req.query);
    const result = await this.customerService.getCustomers(query);
    res.status(200).send(result);
  };

  getCustomer = async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const result = await this.customerService.getCustomer(customerId);
    res.status(200).send(result);
  };

  getOrders = async (req: Request, res: Response) => {
    const customerId = String(res.locals.user.id);
    const result = await this.customerService.getOrders(customerId);
    res.status(200).send(result);
  };

  getOrder = async (req: Request, res: Response) => {
    const customerId = String(res.locals.user.id);
    const orderId = req.params.id;
    const result = await this.customerService.getOrder(customerId, orderId);
    res.status(200).send(result);
  };

  getOrderHistory = async (req: Request, res: Response) => {
    const query = plainToInstance(History, req.query);
    const customerId = String(res.locals.user.id);
    const result = await this.customerService.getOrderHistory(
      customerId,
      query
    );
    res.status(200).send(result);
  };

  getActiveOrders = async (req: Request, res: Response) => {
    const customerId = String(res.locals.user.id);
    const result = await this.customerService.getActiveOrders(customerId);
    res.status(200).send(result);
  };

  getRecentOrders = async (req: Request, res: Response) => {
    const customerId = String(res.locals.user.id);
    const result = await this.customerService.getRecentOrders(customerId);
    res.status(200).send(result);
  };

  requestPickup = async (req: Request, res: Response) => {
    const customerId = String(res.locals.user.id);
    const data = req.body;
    const result = await this.customerService.requestPickup(customerId, data);
    res.status(200).send(result);
  };
}
