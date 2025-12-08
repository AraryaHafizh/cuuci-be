import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { NotificationController } from "./notifiction.controller";

export class NotificationRouter {
  private router: Router;
  private notificationController: NotificationController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.notificationController = new NotificationController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {};

  getRouter = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole([
        "CUSTOMER",
        "WORKER",
        "DRIVER",
        "OUTLET_ADMIN",
      ]),
      this.notificationController.getNotifications
    );
    this.router.patch(
      "/read-all",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole([
        "CUSTOMER",
        "WORKER",
        "DRIVER",
        "OUTLET_ADMIN",
      ]),
      this.notificationController.readAll
    );

    return this.router;
  };
}
