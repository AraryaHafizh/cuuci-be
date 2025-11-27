// src/modules/worker/worker.router.ts
import { Router } from "express";
import { WorkerController } from "./worker.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { Role } from "../../generated/prisma/enums";
import {
  validateBody,
  validateQuery,
} from "../../middlewares/validation.middleware";
import {
  GetWorkerOrdersDTO,
  ProcessOrderDTO,
} from "./dto/worker.dto";

export class WorkerRouter {
  private router: Router;
  private workerController: WorkerController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.workerController = new WorkerController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    const JWT_SECRET = process.env.JWT_SECRET!;

    // GET /worker/orders?station=
    this.router.get(
      "/orders",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER]),
      validateQuery(GetWorkerOrdersDTO),
      this.workerController.getOrders
    );

    // POST /worker/orders/:orderId/process
    this.router.post(
      "/orders/:orderId/process",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER]),
      validateBody(ProcessOrderDTO),
      this.workerController.processOrder
    );

    // POST /worker/orders/:orderId/request-bypass
    this.router.post(
      "/orders/:orderId/request-bypass",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER]),
      this.workerController.requestBypass
    );

    // POST /worker/orders/:orderId/complete
    this.router.post(
      "/orders/:orderId/complete",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER]),
      this.workerController.completeOrderStation
    );

    // GET /worker/history
    this.router.get(
      "/history",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER]),
      this.workerController.getHistory
    );
  };

  getRouter = () => {
    return this.router;
  };
}
