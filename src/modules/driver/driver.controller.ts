// src/modules/driver/driver.controller.ts
import { Request, Response } from "express";
import { DriverService } from "./driver.service";

export class DriverController {
  private driverService: DriverService;

  constructor() {
    this.driverService = new DriverService();
  }

  // GET /driver/requests
  getRequests = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;

    const result = await this.driverService.getRequestsForDriver(userId, role);
    res.status(200).send(result);
  };

  // GET /driver/pickup/:pickupOrderId
  getPickupDetail = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { pickupOrderId } = req.params;

    const result = await this.driverService.getPickupOrderDetail(
      userId,
      role,
      pickupOrderId
    );
    res.status(200).send(result);
  };

  // GET /driver/delivery/:deliveryOrderId
  getDeliveryDetail = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { deliveryOrderId } = req.params;

    const result = await this.driverService.getDeliveryOrderDetail(
      userId,
      role,
      deliveryOrderId
    );
    res.status(200).send(result);
  };

  // POST /driver/pickup/:pickupOrderId/accept
  acceptPickup = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { pickupOrderId } = req.params;

    const result = await this.driverService.acceptPickupRequest(
      userId,
      role,
      pickupOrderId
    );
    res.status(200).send(result);
  };

  // POST /driver/pickup/:pickupOrderId/complete
  completePickup = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { pickupOrderId } = req.params;

    const result = await this.driverService.completePickupRequest(
      userId,
      role,
      pickupOrderId
    );
    res.status(200).send(result);
  };

  // POST /driver/delivery/:deliveryOrderId/accept
  acceptDelivery = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { deliveryOrderId } = req.params;

    const result = await this.driverService.acceptDeliveryRequest(
      userId,
      role,
      deliveryOrderId
    );
    res.status(200).send(result);
  };

  // POST /driver/delivery/:deliveryOrderId/complete
  completeDelivery = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const userId = String(authUser.id);
    const role = authUser.role;
    const { deliveryOrderId } = req.params;

    const result = await this.driverService.completeDeliveryRequest(
      userId,
      role,
      deliveryOrderId
    );
    res.status(200).send(result);
  };
}
