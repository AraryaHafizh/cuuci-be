import { plainToInstance } from "class-transformer";
import { AdminService } from "./admin.service";
import { CreateDTO } from "./dto/create.dto";
import { Orders } from "./dto/order.dto";

export class AdminContorller {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }
  getOrders = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const query = plainToInstance(Orders, req.query);
    const orders = await this.adminService.getOrders(adminId, query);
    res.status(200).json(orders);
  };
  getOrder = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const id = req.params.id;
    const order = await this.adminService.getOrder(adminId, id);
    res.status(200).json(order);
  };
  getArrivedOrders = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const orders = await this.adminService.getArrivedOrders(adminId);
    res.status(200).json(orders);
  };
  getBypassOrders = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const orders = await this.adminService.getBypassOrders(adminId);
    res.status(200).json(orders);
  };
  assignOrderToWorkers = async (req: any, res: any) => {
    const orderId = req.params.orderId;
    const body = req.body as CreateDTO;
    const orders = await this.adminService.assignOrderToWorkers(orderId, body);
    res.status(200).json(orders);
  };
  resolveBypass = async (req: any, res: any) => {
    const id = req.params.id;
    const orders = await this.adminService.resolveBypass(id);
    res.status(200).json(orders);
  };
}
