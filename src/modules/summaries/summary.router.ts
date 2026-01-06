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
    this.jwtMiddleware = new JwtMiddleware()
    this.summaryController = new SummaryController()
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/outlet/summary",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      this.summaryController.getOutletSummary
    );
  };

  getRouter = () => {
    return this.router;
  }
}
