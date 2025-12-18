import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { DriverContorller } from "./driver.controller";
import { JWT_SECRET } from "../../config/env";

export class DriverRouter {
  private router: Router;
  private driverController: DriverContorller;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.driverController = new DriverContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.driverController.getDrivers
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.driverController.getDriver
    );
    this.router.get(
      "/requests",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequests
    );
    this.router.get(
      "/requests/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequest
    );
    this.router.get(
      "/requests/history/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequestsHistory
    );
    this.router.post(
      "/requests/pickup/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.pickupRequest
    );
    this.router.post(
      "/requests/finish/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.finishRequest
    );
    this.router.post(
      "/delivery/pickup/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.pickupDelivery
    );
    this.router.post(
      "/delivery/finish/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.finishDelivery
    );
  };
  getRouter = () => {
    return this.router;
  };
}
