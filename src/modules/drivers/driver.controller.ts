import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { DriverService } from "./driver.service";
import { drivers } from "./dto/drivers.dto";
import { ApiError } from "../../utils/api-error";

export class DriverContorller {
  private driverService: DriverService;

  constructor() {
    this.driverService = new DriverService();
  }

  getDrivers = async (req: Request, res: Response) => {
    const query = plainToInstance(drivers, req.query);
    const result = await this.driverService.getDrivers(query);
    res.status(200).send(result);
  };

  getDriver = async (req: Request, res: Response) => {
    const driverId = req.params.id;
    const result = await this.driverService.getDriver(driverId);
    res.status(200).send(result);
  };

  getRequests = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const result = await this.driverService.getRequests(driverId);
    res.status(200).send(result);
  };

  getRequest = async (req: Request, res: Response) => {
    const driverId = req.params.id;
    const result = await this.driverService.getRequest(driverId);
    res.status(200).send(result);
  };

  getOngoingRequest = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const result = await this.driverService.getOngoingRequest(driverId);
    res.status(200).send(result);
  };

  getRequestsHistory = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const result = await this.driverService.getRequestsHistory(driverId);
    res.status(200).send(result);
  };

  takeOrder = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const orderId = req.params.id;
    const result = await this.driverService.takeOrder(driverId, orderId);
    res.status(200).send(result);
  };

  confirmOrder = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const orderId = req.params.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const confirmationProof = files.confirmationProof?.[0];
    if (!confirmationProof) throw new ApiError("paymentProod is required", 400);
    const result = await this.driverService.confirmOrder(
      driverId,
      orderId,
      confirmationProof
    );
    res.status(200).send(result);
  };

  finishOrder = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const orderId = req.params.id;
    const result = await this.driverService.finishOrder(driverId, orderId);
    res.status(200).send(result);
  };

  takeDelivery = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await this.driverService.takeDelivery(orderId);
    res.status(200).send(result);
  };

  finishDelivery = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await this.driverService.finishDelivery(orderId);
    res.status(200).send(result);
  };
}
