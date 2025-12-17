import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { DriverService } from "./driver.service";
import { drivers } from "./dto/drivers.dto";

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

  getRequestsHistory = async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await this.driverService.getRequestsHistory(id);
    res.status(200).send(result);
  };

  pickupRequest = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const orderId = req.params.id;
    const result = await this.driverService.pickupRequest(driverId, orderId);
    res.status(200).send(result);
  };

  finishRequest = async (req: Request, res: Response) => {
    const driverId = String(res.locals.user.id);
    const orderId = req.params.id;
    const result = await this.driverService.finishRequest(driverId, orderId);
    res.status(200).send(result);
  };

  pickupDelivery = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await this.driverService.pickupDelivery(orderId);
    res.status(200).send(result);
  };

  finishDelivery = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await this.driverService.finishDelivery(orderId);
    res.status(200).send(result);
  };
}
