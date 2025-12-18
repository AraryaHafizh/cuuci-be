import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { OrderController } from "./controllers/order.controller";
import { PickupController } from "./controllers/pickup.controller";
import { PickupOrderDTO } from "./dto/pickup-order.dto";

export class OrderRouter {
  private router: Router;
  private pickupController: PickupController;
  private orderController: OrderController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.pickupController = new PickupController();
    this.orderController = new OrderController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post(
      "/create",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(PickupOrderDTO),
      this.pickupController.createPickupOrder
    );
    this.router.get(
      "/order",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.orderController.getOrders
    );
  };
}
