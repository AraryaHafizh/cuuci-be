import { PrismaService } from "../prisma/prisma.service";
import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { ReportController } from "./report.controller";

export class ReportRouter {
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private reportController: ReportController;
  private prisma: PrismaService;

  constructor() {
    this.router = Router();
    this.jwtMiddleware = new JwtMiddleware();
    this.reportController = new ReportController();
    this.prisma = new PrismaService();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/sales",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.reportController.getSalesReport
    );

    this.router.get(
      "/employees",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.reportController.getEmployeePerformance
    );
  };

  getRouter = () => {
    return this.router;
  };
}
