import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_SECRET } from "../../config/env";
import { SummaryController } from "./summary.controller";

export class SummaryRouter {
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private summaryController: SummaryController;

  constructor() {
    this.router = Router();
    this.jwtMiddleware = new JwtMiddleware();
    this.summaryController = new SummaryController();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/metrics",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN", "SUPER_ADMIN"]),
      this.summaryController.getMetrics
    );
    this.router.get(
      "/outlet-overview",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.summaryController.useOutletOverview
    );
    this.router.get(
      "/order-overview",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN", "SUPER_ADMIN"]),
      this.summaryController.getOrderOverview
    );
    this.router.get(
      "/worker-activity",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN", "SUPER_ADMIN"]),
      this.summaryController.getWorkerActivity
    );
  };

  getRouter = () => {
    return this.router;
  };
}
