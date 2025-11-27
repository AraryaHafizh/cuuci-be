// src/modules/worker/worker.controller.ts
import { Request, Response } from "express";
import { WorkerService } from "./worker.service";
import { Station } from "../../generated/prisma/enums";

export class WorkerController {
  private workerService: WorkerService;

  constructor() {
    this.workerService = new WorkerService();
  }

  // GET /worker/orders?station=
  getOrders = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const station = req.query.station as Station;

    const result = await this.workerService.getOrdersForStation(
      String(authUser.id),
      authUser.role,
      station
    );

    res.status(200).send(result);
  };

  // POST /worker/orders/:orderId/process
  processOrder = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const { orderId } = req.params;
    const { items } = req.body;

    const result = await this.workerService.processOrder(
      String(authUser.id),
      authUser.role,
      orderId,
      items
    );

    res.status(200).send(result);
  };

  // POST /worker/orders/:orderId/request-bypass
  requestBypass = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const { orderId } = req.params;
    const { reason } = req.body || {};

    const result = await this.workerService.requestBypass(
      String(authUser.id),
      authUser.role,
      orderId,
      reason
    );

    res.status(200).send(result);
  };

  // POST /worker/orders/:orderId/complete
  completeOrderStation = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const { orderId } = req.params;

    const result = await this.workerService.completeOrderStation(
      String(authUser.id),
      authUser.role,
      orderId
    );

    res.status(200).send(result);
  };

  // GET /worker/history
  getHistory = async (req: Request, res: Response) => {
    const authUser = res.locals.user;

    const result = await this.workerService.getHistory(
      String(authUser.id),
      authUser.role
    );

    res.status(200).send(result);
  };
}
