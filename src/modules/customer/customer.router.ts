import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { CustomerContorller } from "./customer.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { request } from "./dto/request.dto";

export class CustomerRouter {
  private router: Router;
  private customerController: CustomerContorller;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.customerController = new CustomerContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.customerController.getCustomers
    );
    this.router.get(
      "/orders",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.customerController.getOrders
    );
    this.router.get(
      "/orders",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.customerController.getOrders
    );
    this.router.get(
      "/history",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.customerController.getOrderHistory
    );
    this.router.get(
      "/active",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.customerController.getActiveOrders
    );
    this.router.get(
      "/recent",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.customerController.getRecentOrders
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.customerController.getCustomer
    );
    this.router.post(
      "/request",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(request),
      this.customerController.requestPickup
    );
  };
  getRouter = () => {
    return this.router;
  };
}
