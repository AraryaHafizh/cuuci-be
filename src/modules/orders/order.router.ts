import { Router } from "express";
import { PickupController } from "./controllers/pickup.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWT_SECRET } from "../../config/env";
import { PickupOrderDTO } from "./dto/pickup-order.dto";
import { validateBody } from "../../middlewares/validation.middleware";
<<<<<<< HEAD
import { GetOrdersDTO } from "./dto/get-order.dto";
import { OrderController } from "./controllers/order.controller";
=======
>>>>>>> 1f2f92d790838cd057329c957d4b9a9116a03bdf

export class OrderRouter {
  private router: Router;
  private pickupController: PickupController;
<<<<<<< HEAD
  private orderController: OrderController;
=======
>>>>>>> 1f2f92d790838cd057329c957d4b9a9116a03bdf
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.pickupController = new PickupController();
<<<<<<< HEAD
    this.orderController = new OrderController();
=======
>>>>>>> 1f2f92d790838cd057329c957d4b9a9116a03bdf
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post(
<<<<<<< HEAD
      "/create-order",
=======
      "/create",
>>>>>>> 1f2f92d790838cd057329c957d4b9a9116a03bdf
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(PickupOrderDTO),
      this.pickupController.createPickupOrder
    );
<<<<<<< HEAD
    this.router.get(
      "/order",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.orderController.getOrders
    );
=======
>>>>>>> 1f2f92d790838cd057329c957d4b9a9116a03bdf
  };
}
