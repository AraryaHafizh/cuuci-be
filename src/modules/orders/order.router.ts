import { Router } from "express";
import { PickupController } from "./controllers/pickup.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWT_SECRET } from "../../config/env";
import { PickupOrderDTO } from "./dto/pickup-order.dto";
import { validateBody } from "../../middlewares/validation.middleware";

export class OrderRouter {
  private router: Router;
  private pickupController: PickupController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.pickupController = new PickupController();
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
  };
}
