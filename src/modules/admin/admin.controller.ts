import { AdminService } from "./admin.service";
import { CreateDTO } from "./dto/create.dto";

export class AdminContorller {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }
  getOrders = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const query = req.query;
    const orders = await this.adminService.getOrders(adminId, query);
    res.status(200).json(orders);
  };
  getArrivedOrders = async (req: any, res: any) => {
    const adminId = String(res.locals.user.id);
    const orders = await this.adminService.getArrivedOrders(adminId);
    res.status(200).json(orders);
  };
  assignOrderToWorkers = async (req: any, res: any) => {
    const orderId = req.params.orderId;
    const body = req.body as CreateDTO;
    const orders = await this.adminService.assignOrderToWorkers(orderId, body);
    res.status(200).json(orders);
  };
}
