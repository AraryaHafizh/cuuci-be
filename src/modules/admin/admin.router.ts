import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { AdminContorller } from "./admin.controller";
import { JWT_SECRET } from "../../config/env";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateDTO } from "./dto/create.dto";

export class AdminRouter {
  private router: Router;
  private adminContorller: AdminContorller;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.adminContorller = new AdminContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/self",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      this.adminContorller.getAdminDetail
    );
    this.router.get(
      "/orders",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.adminContorller.getOrders
    );
    this.router.get(
      "/orders/arrived",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      this.adminContorller.getArrivedOrders
    );
    this.router.get(
      "/orders/bypass",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      this.adminContorller.getBypassOrders
    );
    this.router.post(
      "/orders/bypass/resolve/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      this.adminContorller.resolveBypass
    );
    this.router.post(
      "/orders/:orderId/assign",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["OUTLET_ADMIN"]),
      validateBody(CreateDTO),
      this.adminContorller.assignOrderToWorkers
    );
    this.router.get(
      "/order/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.adminContorller.getOrder
    );
  };
  getRouter = () => {
    return this.router;
  };
}
